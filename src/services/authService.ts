import prisma from "../config/prisma";
import { EMAIL_REGEX, PHONE_REGEX } from "../constants/regex";
import {
  ForgotPasswordDto,
  ResendOtpDto,
  ResetPasswordDto,
  SignUpDto,
  VerifyOtpDto,
} from "../dto/auth.dto";
import { sendForgotPasswordEmail } from "./email.service";
import { firebaseAuth, isFirebaseAvailable } from "../config/firebase";
import { firebaseService } from "./firebase.service";

class AuthService {
  private otpStore: Map<
    string,
    { otp: string; expiresAt: number; userId: string }
  > = new Map();

  // private readonly jwtSecret: jwt.Secret;
  // private readonly jwtRefreshSecret: jwt.Secret;
  // private readonly accessTtl: jwt.SignOptions["expiresIn"];
  // private readonly refreshTtl: jwt.SignOptions["expiresIn"];
  private readonly otpExpiryMs = 10 * 60 * 1000; // 10 minutes

  constructor() {
    // this.jwtSecret = process.env.JWT_SECRET || "";
    // this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || this.jwtSecret;
    // this.accessTtl = (process.env.JWT_EXPIRES_IN ||
    //   "30d") as jwt.SignOptions["expiresIn"];
    // this.refreshTtl = (process.env.JWT_REFRESH_EXPIRES_IN ||
    //   "30d") as jwt.SignOptions["expiresIn"];
    //
    // if (!this.jwtSecret) {
    //   throw new Error("JWT_SECRET is not configured");
    // }
  }

  async signUp({ identifier, password, first_name, last_name }: SignUpDto) {
    if (!identifier) {
      throw new Error("Identifier (email or phone) is required");
    }

    const isEmail = EMAIL_REGEX.test(identifier);
    const isPhone = PHONE_REGEX.test(identifier);

    if (!isEmail && !isPhone) {
      throw new Error("Invalid email or phone number");
    }

    const existingParent = await prisma.parents.findFirst({
      where: {
        OR: [
          isEmail ? { email: identifier } : undefined,
          isPhone ? { phone_number: identifier } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (existingParent) {
      throw new Error("Email already exist");
    }

    // const hashedPassword = await bcrypt.hash(password, 10);
    // const parentId = uuidv4();

    if (!firebaseAuth) {
      throw new Error("Firebase authentication is not available.");
    }

    const firebaseUser = await firebaseAuth.createUser({
      email: isEmail ? identifier : undefined,
      phoneNumber: isPhone ? identifier : undefined, // MUST be E.164
      password,
      displayName: `${first_name} ${last_name}`,
    });

    const parent = await prisma.parents.create({
      data: {
        id: firebaseUser.uid,
        email: isEmail ? identifier : null,
        phone_number: isPhone ? identifier : null,
        first_name,
        last_name
      },
    });

    // const token = this.generateAccessToken(parent.id);
    // const refreshToken = this.generateRefreshToken(parent.id);
    const customToken = await firebaseAuth.createCustomToken(firebaseUser.uid);
    return {
      token: customToken,
      user: {
        id: parent.id,
        identifier,
        trailStartDate: parent.trial_start_date,
        trailEndDate: parent.trial_end_date,
        pin_code: parent.pin_code,
        trailStatue: parent.trial_status,
        maxPupilsAllowed: parent.max_pupils_allowed,
        email: isEmail ? identifier : null,
        phone_number: isPhone ? identifier : null,
        first_name: parent.first_name,
        last_name: parent.last_name,
        created_at: parent.created_at,
      },
    };
  }

  async signIn(firebaseIdToken: string) {
    // Check if Firebase is available
    if (!isFirebaseAvailable || !firebaseAuth) {
      throw new Error("Firebase authentication is not available. Please check your configuration.");
    }

    const decoded = await firebaseAuth.verifyIdToken(firebaseIdToken);

    console.log(decoded, 'here');
    const parent = await prisma.parents.findUnique({
      where: { id: decoded.uid },
      include: {
        parent_subscriptions: {
          where: {
            OR: [
              // Active subscriptions
              {
                status: "active",
                OR: [{ end_date: null }, { end_date: { gte: new Date() } }],
              },
              // Pending manual payment requests
              {
                status: "pending",
                is_manual_payment_under_review: true
              }
            ]
          },
          include: {
            subscription_plans: true
          },
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!parent) {
      throw new Error("User not found");
    }

    const activeSubscription =
      parent.parent_subscriptions.length > 0
        ? parent.parent_subscriptions[0]
        : null;

    console.log("parent is ", JSON.stringify(parent, null, 2))
    return {
      user: {
        id: parent.id,
        email: parent.email,
        phone_number: parent.phone_number,
        trailStartDate: parent.trial_start_date,
        trailEndDate: parent.trial_end_date,
        pin_code: parent.pin_code,
        trailStatue: parent.trial_status,
        maxPupilsAllowed: parent.max_pupils_allowed,
        first_name: parent.first_name,
        last_name: parent.last_name,
        created_at: parent.created_at,
        subscription: activeSubscription
          ? {
            id: activeSubscription.id,
            status: activeSubscription.status,
            start_date: activeSubscription.start_date,
            end_date: activeSubscription.end_date,
            is_under_manual_review: activeSubscription.is_manual_payment_under_review,
            plan: {
              id: activeSubscription.subscription_plans.id,
              name: activeSubscription.subscription_plans.name,
              plan_code: activeSubscription.subscription_plans.plan_code,
              price: activeSubscription.subscription_plans.price,
              max_devices: activeSubscription.subscription_plans.max_devices,
              max_profiles:
                activeSubscription.subscription_plans.max_profiles,
            },
          }
          : null,
      }
    };
  }

  async sendResetPasswordEmail({ identifier }: ForgotPasswordDto) {
    const type = this.detectIdentifierType(identifier);

    const parent = await prisma.parents.findFirst({
      where:
        type === "email" ? { email: identifier } : { phone_number: identifier },
      select: { id: true },
    });



    if (!parent) {
      return {
        message:
          "If this account is registered, we’ve sent a verification code",
      };
    }

    const otp = this.generateOtp();
    this.otpStore.set(identifier, {
      otp,
      expiresAt: Date.now() + this.otpExpiryMs,
      userId: parent.id,
    });

    await prisma.parents.update({
      where: { id: parent.id },
      data: {
        password_hash: otp
      }
    })

    if (type === "email") {
      try {
        await sendForgotPasswordEmail(identifier, otp, identifier);
      } catch (err) {
        console.error("Failed to send OTP email via SES:", err);
        throw new Error("Unable to send verification code. Please try again.");
      }
    }

    return {
      message: type === "email" ? `Reset password Link sent to your ${type}` : "Not a valid email"
    };
  }


  //   async sendOtp({ identifier }: ForgotPasswordDto) {
  //   const type = this.detectIdentifierType(identifier);
  //
  //   const parent = await prisma.parents.findFirst({
  //     where:
  //       type === "email" ? { email: identifier } : { phone_number: identifier },
  //     select: { id: true },
  //   });
  //
  //   if (!parent) {
  //     return {
  //       message:
  //         "If this account is registered, we’ve sent a verification code",
  //     };
  //   }
  //
  //   const otp = this.generateOtp();
  //   this.otpStore.set(identifier, {
  //     otp,
  //     expiresAt: Date.now() + this.otpExpiryMs,
  //     userId: parent.id,
  //   });
  //
  //   if (type === "email") {
  //     try {
  //       await sendForgotPasswordEmail(identifier, otp, identifier);
  //     } catch (err) {
  //       console.error("Failed to send OTP email via SES:", err);
  //       throw new Error("Unable to send verification code. Please try again.");
  //     }
  //   } else {
  //     console.log("identifier", identifier);
  //     try {
  //       await sendOtpSms(identifier, otp);
  //     } catch (err) {
  //       console.error("Failed to send OTP email via SES:", err);
  //       throw new Error("Unable to send verification code. Please try again.");
  //     }
  //   }
  //
  //   return {
  //     message: `OTP sent to your ${type}`,
  //     otp: process.env.NODE_ENV === "production" ? undefined : otp,
  //   };
  // }

  async verifyOtp({ identifier, otp }: VerifyOtpDto) {
    const type = this.detectIdentifierType(identifier);

    const record = this.otpStore.get(identifier);

    const parentRecordInDB = await prisma.parents.findFirst({
      where:
        type === "email" ? { email: identifier } : { phone_number: identifier },
      select: { id: true, password_hash: true },
    })

    if ((!record || record.expiresAt < Date.now() || record.otp !== otp) && otp !== parentRecordInDB.password_hash) {
      throw new Error("Invalid or expired OTP");
    }

    this.otpStore.delete(identifier);

    await prisma.parents.update({
      where:
        type === "email" ? { email: identifier } : { phone_number: identifier },
      data: {
        password_hash: null
      }
    });

    return { message: "OTP verified", userId: record?.userId, type };
  }

  async resendOtp(dto: ResendOtpDto) {
    return this.sendResetPasswordEmail(dto);
  }

  async resetPassword({ identifier, password, confirm_password }: ResetPasswordDto) {
    if (password !== confirm_password)
      throw new Error("Passwords do not match");

    const parent = await prisma.parents.findUnique({ where: { email: identifier }, select: { email: true } });
    if (!parent) throw new Error("User not found");

    await firebaseService.updatePasswordByEmail({ email: parent.email, password })

    return { message: "Password reset successfully" };
  }

  async verifyToken(token: string) {
    // try {
    // const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;
    // const userId = (payload.sub as string) || payload.id;

    //   if (!userId) {
    //     throw new Error("Invalid token payload");
    //   }
    //
    //   const parent = await prisma.parents.findUnique({
    //     where: { id: userId },
    //     select: {
    //       id: true,
    //       email: true,
    //       phone_number: true,
    //       first_name: true,
    //       last_name: true,
    //       created_at: true,
    //     },
    //   });
    //
    //   if (!parent) throw new Error("Invalid or expired token");
    //
    //   return parent;
    // } catch (err) {
    //   throw new Error("Invalid or expired token");
    // }
  }

  async revokeTokens(parentId: string): Promise<void> {
    if (!isFirebaseAvailable || !firebaseAuth) {
      throw new Error("Firebase authentication is not available. Please check your configuration.");
    }
    await firebaseAuth.revokeRefreshTokens(parentId);
  }

  async deleteAccount(parentId: string): Promise<void> {
    if (!isFirebaseAvailable || !firebaseAuth) {
      throw new Error("Firebase authentication is not available.");
    }

    await firebaseAuth.deleteUser(parentId);

    await prisma.parents.delete({
      where: { id: parentId },
    });
  }

  detectIdentifierType(identifier: string): "email" | "phone" {
    if (EMAIL_REGEX.test(identifier)) return "email";
    if (PHONE_REGEX.test(identifier)) return "phone";
    throw new Error("Invalid email or phone number");
  }

  // private generateAccessToken(userId: string) {
  //   return jwt.sign({ sub: userId }, this.jwtSecret, {
  //     expiresIn: this.accessTtl,
  //   });
  // }

  // private generateRefreshToken(userId: string) {
  //   return jwt.sign({ sub: userId, type: "refresh" }, this.jwtRefreshSecret, {
  //     expiresIn: this.refreshTtl,
  //   });
  // }

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

export default new AuthService();
