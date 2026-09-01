import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.MJ_SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.MJ_APIKEY_PUBLIC,
    pass: process.env.MJ_APIKEY_PRIVATE,
  },
});

export async function sendForgotPasswordEmail(to: string, otp: string, identifier: string) {
  if (!process.env.EMAIL_FROM) {
    throw new Error("SES_FROM is not configured");
  }
  if (!process.env.APP_URL) {
    console.error('App link is not set.')
  }
  const create_pass_link= process.env.APP_URL+'/ create-password'+`?code=${encodeURIComponent(otp)}&identifier=${encodeURIComponent(identifier)}`;
  console.log('password reset link: ', create_pass_link, `<a href="${create_pass_link}">Reset Your Password</a>`);
  const res = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Password Reset Request – Action Required",
    text: `Hi there,

We received a request to reset the password for your account. If you did not make this request, please disregard this email.

To reset your password, click the link below:
${create_pass_link}

This link will expire in 10 minutes.

If you need assistance or did not request this reset, feel free to contact our support team at support@nedjmati.com.

Best regards,
The Nedjmati Team`,
    html: `
    <p>Hi there,</p>
    <p>We received a request to reset the password for your account. If you did not request this, please disregard this email.</p>

    <p>To reset your password, click the link below:</p>
    <p><a href="${create_pass_link}">Reset Your Password</a></p>

    <p>This link will expire in 10 minutes.</p>

    <p>If you need assistance or did not request this reset, please <a href="mailto:support@nedjamti.com">contact our support team</a>.</p>

    <p>Best regards,</p>
    <p>The Nedjmati Team</p>
  `,
  });

}

/**
 * Send password reset email to admin
 */
export async function sendAdminPasswordResetEmail(to: string, resetToken: string) {
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is not configured");
  }

  const adminPortalUrl = process.env.ADMIN_PORTAL_URL || process.env.APP_URL || "http://localhost:3000";
  const resetLink = `${adminPortalUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Admin Portal - Password Reset Request",
    text: `Hello Admin,

We received a request to reset the password for your admin account. If you did not make this request, please ignore this email and ensure your account is secure.

To reset your password, click the link below:
${resetLink}

This link will expire in 1 hour.

If you need assistance, please contact the system administrator.

Best regards,
The Nedjmati Team`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Admin Portal - Password Reset</h2>
      
      <p>Hello Admin,</p>
      
      <p>We received a request to reset the password for your admin account. If you did not make this request, please ignore this email and ensure your account is secure.</p>
      
      <p>To reset your password, click the button below:</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="background-color: #00AC56; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          Reset Your Password
        </a>
      </p>
      
      <p style="color: #666; font-size: 14px;">
        Or copy and paste this link into your browser:<br>
        <a href="${resetLink}" style="color: #00AC56; word-break: break-all;">${resetLink}</a>
      </p>
      
      <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        This link will expire in 1 hour. If you need assistance, please contact the system administrator.
      </p>
      
      <p>Best regards,<br>The Nedjmati Team</p>
    </div>
  `,
  });
}

/**
 * Send subscription upgrade confirmation email to user
 */
export async function sendSubscriptionUpgradeEmail(
  to: string,
  userName: string,
  planName: string,
  previousPlanName?: string,
  isDowngrade: boolean = false
) {
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is not configured");
  }

  if (!to) {
    throw new Error("Recipient email address is required");
  }

  const subject = isDowngrade 
    ? "Your Subscription Plan Has Been Changed" 
    : "Your Subscription Has Been Upgraded";

  const actionText = isDowngrade ? "changed" : "upgraded";
  const actionTextPast = isDowngrade ? "changed" : "upgraded";
  const greetingText = isDowngrade 
    ? "We're writing to inform you that your subscription plan has been changed."
    : "We're excited to inform you that your subscription has been successfully upgraded.";

  const planChangeText = previousPlanName
    ? `Your subscription has been ${actionTextPast} from <strong>${previousPlanName}</strong> to <strong>${planName}</strong>.`
    : `Your subscription has been ${actionTextPast} to <strong>${planName}</strong>.`;

  const benefitsText = isDowngrade
    ? "Your new subscription plan is now active. Please note that some features may have changed based on your new plan."
    : "Your new subscription is now active and you can enjoy all the benefits of your upgraded plan.";

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text: `Hello ${userName},

${greetingText}

${previousPlanName ? `Your subscription has been ${actionTextPast} from ${previousPlanName} to ${planName}.` : `Your subscription has been ${actionTextPast} to ${planName}.`}

${benefitsText}

If you have any questions or need assistance, please don't hesitate to contact our support team at support@nedjmati.com.

Best regards,
The Nedjmati Team`,
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${isDowngrade ? "Subscription Plan Changed" : "Subscription Upgraded Successfully"}</h2>
      
      <p>Hello ${userName},</p>
      
      <p>${greetingText}</p>
      
      <p>${planChangeText}</p>
      
      <p>${benefitsText}</p>
      
      <p>If you have any questions or need assistance, please don't hesitate to <a href="mailto:support@nedjmati.com">contact our support team</a>.</p>
      
      <p>Best regards,<br>The Nedjmati Team</p>
    </div>
  `,
    });

    console.log(`[EMAIL SERVICE] ${isDowngrade ? "Downgrade" : "Upgrade"} email sent successfully. Message ID: ${info.messageId}`);
    console.log(`[EMAIL SERVICE] Email details - To: ${to}, From: ${process.env.EMAIL_FROM}, Response: ${JSON.stringify(info.response)}`);
    
    // Log additional info if available
    if (info.accepted && info.accepted.length > 0) {
      console.log(`[EMAIL SERVICE] Email accepted by server for: ${info.accepted.join(", ")}`);
    }
    if (info.rejected && info.rejected.length > 0) {
      console.error(`[EMAIL SERVICE] Email rejected by server for: ${info.rejected.join(", ")}`);
    }
    
    return info;
  } catch (error: any) {
    console.error(`[EMAIL SERVICE] Failed to send ${isDowngrade ? "downgrade" : "upgrade"} email to ${to}:`, error.message);
    console.error(`[EMAIL SERVICE] Error details:`, error);
    throw error;
  }
}

/**
 * Send subscription renewal confirmation email to user
 */
export async function sendSubscriptionRenewalEmail(
  to: string,
  userName: string,
  planName: string,
  endDate: Date
) {
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is not configured");
  }

  if (!to) {
    throw new Error("Recipient email address is required");
  }

  const formattedDate = endDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: "Your Subscription Has Been Renewed",
      text: `Hello ${userName},

Your subscription for ${planName} has been successfully renewed.

Your subscription is now valid until ${formattedDate}.

Thank you for continuing to be part of the Nedjmati community!

If you have any questions, please contact our support team at support@nedjmati.com.

Best regards,
The Nedjmati Team`,
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Subscription Renewed Successfully</h2>
      
      <p>Hello ${userName},</p>
      
      <p>Your subscription for <strong>${planName}</strong> has been successfully renewed.</p>
      
      <p>Your subscription is now valid until <strong>${formattedDate}</strong>.</p>
      
      <p>Thank you for continuing to be part of the Nedjmati community!</p>
      
      <p>If you have any questions, please <a href="mailto:support@nedjmati.com">contact our support team</a>.</p>
      
      <p>Best regards,<br>The Nedjmati Team</p>
    </div>
  `,
    });

    console.log(`[EMAIL SERVICE] Renewal email sent successfully. Message ID: ${info.messageId}`);
    return info;
  } catch (error: any) {
    console.error(`[EMAIL SERVICE] Failed to send renewal email to ${to}:`, error.message);
    console.error(`[EMAIL SERVICE] Error details:`, error);
    throw error;
  }
}

/**
 * Send subscription cancellation confirmation email to user
 */
export async function sendSubscriptionCancellationEmail(
  to: string,
  userName: string,
  planName: string
) {
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is not configured");
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Your Subscription Has Been Cancelled",
    text: `Hello ${userName},

We're writing to confirm that your subscription for ${planName} has been cancelled.

Your subscription access will remain active until the end of your current billing period.

If you have any questions or would like to reactivate your subscription, please contact our support team at support@nedjmati.com.

We're sorry to see you go and hope to serve you again in the future.

Best regards,
The Nedjmati Team`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Subscription Cancelled</h2>
      
      <p>Hello ${userName},</p>
      
      <p>We're writing to confirm that your subscription for <strong>${planName}</strong> has been cancelled.</p>
      
      <p>Your subscription access will remain active until the end of your current billing period.</p>
      
      <p>If you have any questions or would like to reactivate your subscription, please <a href="mailto:support@nedjmati.com">contact our support team</a>.</p>
      
      <p>We're sorry to see you go and hope to serve you again in the future.</p>
      
      <p>Best regards,<br>The Nedjmati Team</p>
    </div>
  `,
  });
}