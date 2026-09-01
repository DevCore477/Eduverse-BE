import prisma from "../config/prisma";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { AdminLoginDto, AdminForgotPasswordDto, AdminResetPasswordDto, AdminCreateDto } from "../dto/admin-auth.dto";
import { sendAdminPasswordResetEmail } from "./email.service";

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: string;
}

class AdminAuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: SignOptions["expiresIn"];
  private readonly resetTokenExpiryMs = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "";
    this.jwtExpiresIn = (process.env.JWT_EXPIRES_IN || "24h") as SignOptions["expiresIn"];

    if (!this.jwtSecret) {
      console.warn("⚠️ ADMIN_JWT_SECRET is not configured. Using fallback.");
    }
  }

  /**
   * Admin Login
   */
  async login({ email, password }: AdminLoginDto) {
    const admin = await prisma.admins.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin) {
      throw new Error("Invalid email or password");
    }

    if (!admin.is_active) {
      throw new Error("Account is deactivated. Please contact support.");
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // Update last login
    await prisma.admins.update({
      where: { id: admin.id },
      data: { last_login: new Date() },
    });

    const token = this.generateToken(admin.id, admin.email, admin.role);

    console.log(`[ADMIN AUTH] Admin logged in: ${admin.email}`);

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: admin.role,
        last_login: new Date(),
      },
    };
  }

  /**
   * Forgot Password - Generate reset token and send email
   */
  async forgotPassword({ email }: AdminForgotPasswordDto) {
    const admin = await prisma.admins.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin) {
      console.log(`[ADMIN AUTH] Password reset requested for non-existent email: ${email}`);
      throw new Error("Email not registered");
    }

    if (!admin.is_active) {
      console.log(`[ADMIN AUTH] Password reset requested for deactivated account: ${email}`);
      throw new Error("Account is deactivated. Please contact support.");
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetTokenExpires = new Date(Date.now() + this.resetTokenExpiryMs);

    await prisma.admins.update({
      where: { id: admin.id },
      data: {
        reset_token: resetTokenHash,
        reset_token_expires: resetTokenExpires,
      },
    });

    // Send password reset email
    try {
      await sendAdminPasswordResetEmail(admin.email, resetToken);
      console.log(`[ADMIN AUTH] Password reset email sent to: ${admin.email}`);
    } catch (err) {
      console.error(`[ADMIN AUTH] Failed to send password reset email to: ${admin.email}`, err);
      throw new Error("Unable to send password reset email. Please try again.");
    }

    return {
      message: "If this email is registered, you will receive a password reset link.",
    };
  }

  /**
   * Reset Password - Validate token and update password
   */
  async resetPassword({ token, password, confirm_password }: AdminResetPasswordDto) {
    if (password !== confirm_password) {
      throw new Error("Passwords do not match");
    }

    // Hash the provided token to compare with stored hash
    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const admin = await prisma.admins.findFirst({
      where: {
        reset_token: resetTokenHash,
        reset_token_expires: { gte: new Date() },
      },
    });

    if (!admin) {
      throw new Error("Invalid or expired reset token");
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await prisma.admins.update({
      where: { id: admin.id },
      data: {
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null,
      },
    });

    console.log(`[ADMIN AUTH] Password reset successful for: ${admin.email}`);

    return {
      message: "Password has been reset successfully. You can now log in with your new password.",
    };
  }

  /**
   * Verify JWT Token
   */
  async verifyToken(token: string) {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;

      if (payload.type !== "admin_access") {
        throw new Error("Invalid token type");
      }

      const admin = await prisma.admins.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
          is_active: true,
        },
      });

      if (!admin || !admin.is_active) {
        throw new Error("Admin not found or inactive");
      }

      return admin;
    } catch (err) {
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Get Admin Profile with refreshed token
   */
  async getAdminProfile(adminId: string) {
    const admin = await prisma.admins.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true,
        last_login: true,
        created_at: true,
      },
    });

    if (!admin || !admin.is_active) {
      throw new Error("Admin not found or inactive");
    }

    // Generate new token (refresh)
    const token = this.generateToken(admin.id, admin.email, admin.role);

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: admin.role,
        last_login: admin.last_login,
        created_at: admin.created_at,
      },
      token,
    };
  }

  /**
   * Logout - Invalidate session (for future session management)
   */
  async logout(adminId: string) {
    // For JWT-based auth, logout is typically handled client-side
    // This method can be extended to support token blacklisting if needed
    console.log(`[ADMIN AUTH] Admin logged out: ${adminId}`);
    return { message: "Logged out successfully" };
  }

  /**
   * Create Admin (for initial setup or super admin use)
   */
  async createAdmin({ email, password, first_name, last_name }: AdminCreateDto) {
    const existingAdmin = await prisma.admins.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingAdmin) {
      throw new Error("An admin with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.admins.create({
      data: {
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name,
        last_name,
        role: "admin",
      },
    });

    console.log(`[ADMIN AUTH] New admin created: ${admin.email}`);

    return {
      id: admin.id,
      email: admin.email,
      first_name: admin.first_name,
      last_name: admin.last_name,
      role: admin.role,
      created_at: admin.created_at,
    };
  }

  /**
   * Generate JWT Token
   */
  private generateToken(adminId: string, email: string, role: string): string {
    return jwt.sign(
      {
        sub: adminId,
        email,
        role,
        type: "admin_access",
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );
  }

  /**
   * Update admin profile
   */
  async updateProfile({
    adminId,
    firstName,
    lastName,
    email,
    currentPassword,
    newPassword,
  }: {
    adminId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }) {
    const admin = await prisma.admins.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new Error("Admin not found");
    }

    const updateData: any = {};

    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;

    if (email && email !== admin.email) {
      const existingEmail = await prisma.admins.findUnique({
        where: { email },
      });
      if (existingEmail) {
        throw new Error("Email already in use");
      }
      updateData.email = email;
    }

    if (newPassword) {
      if (!currentPassword) {
        throw new Error("Current password is required to set a new password");
      }
      const isValidPassword = await bcrypt.compare(currentPassword, admin.password_hash);
      if (!isValidPassword) {
        throw new Error("Current password is incorrect");
      }
      updateData.password_hash = await bcrypt.hash(newPassword, 12);
    }

    const updatedAdmin = await prisma.admins.update({
      where: { id: adminId },
      data: updateData,
    });

    return {
      id: updatedAdmin.id,
      email: updatedAdmin.email,
      first_name: updatedAdmin.first_name,
      last_name: updatedAdmin.last_name,
      role: updatedAdmin.role,
    };
  }
}

export default new AdminAuthService();
