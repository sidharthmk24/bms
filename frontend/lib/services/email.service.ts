import 'server-only';
import nodemailer from 'nodemailer';

export class EmailService {
  private getTransporter(): nodemailer.Transporter {
    const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const port = Number((process.env.SMTP_PORT || '587').trim()) || 587;
    const secure = (process.env.SMTP_SECURE || 'false').trim() === 'true';
    const user = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : undefined;
    const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.trim() : undefined;

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  private getFromAddress(): string {
    return (process.env.SMTP_FROM || '"BMS System" <sidharthmk24@gmail.com>').trim();
  }

  async sendWelcomeEmail(toEmail: string, name: string, setupUrl?: string): Promise<void> {
    const baseUrl = (process.env.APP_URL || 'http://localhost:3000').trim();
    const loginLink = setupUrl || `${baseUrl}/login`;
    const fromAddress = this.getFromAddress();
    const smtpUser = process.env.SMTP_USER?.trim();

    console.log('\n' + '✉️ '.repeat(20));
    console.log(`[EMAIL DISPATCH] Welcome / Account Setup Email to ${name} (${toEmail})`);
    console.log(`Link: ${loginLink}`);
    console.log('✉️ '.repeat(20) + '\n');

    if (!smtpUser) {
      return;
    }

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: 'Welcome to BMS - Activate Your Account',
        text: `Hello ${name},\n\nYour account has been created on Bookstore Management System (BMS).\n\nPlease activate your account and create your password by visiting the link below:\n${loginLink}\n\nBest Regards,\nThe BMS Team`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 8px; font-weight: bold; font-size: 18px; letter-spacing: 1px;">
                BMS
              </div>
              <h2 style="color: #111827; margin-top: 16px; font-size: 22px; font-weight: 700;">Welcome to BMS!</h2>
            </div>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              An administrator has provisioned your account for the <strong>Bookstore Management System</strong>.
            </p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              To get started, please click the button below to sign in and set up your personal password:
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${loginLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                Set Up Password & Sign In
              </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
              If the button above does not work, copy and paste this link into your browser:<br/>
              <a href="${loginLink}" style="color: #2563eb; word-break: break-all;">${loginLink}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              &copy; ${new Date().getFullYear()} Bookstore Management System. All rights reserved.
            </p>
          </div>
        `,
      });
      console.log('[EmailService] Welcome email sent successfully: %s', info.messageId);
    } catch (error) {
      console.error('[EmailService] Error sending welcome email:', error);
    }
  }

  async sendPasswordResetEmail(toEmail: string, name: string, resetLink: string): Promise<boolean> {
    const fromAddress = this.getFromAddress();
    const smtpUser = process.env.SMTP_USER?.trim();

    console.log('\n' + '✉️ '.repeat(20));
    console.log(`[EMAIL DISPATCH] Password Reset Email to ${name} (${toEmail})`);
    console.log(`Link: ${resetLink}`);
    console.log('✉️ '.repeat(20) + '\n');

    if (!smtpUser) {
      console.warn('[EmailService] SMTP_USER is not configured. Logged reset link above.');
      return true;
    }

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: 'Reset Your BMS Password',
        text: `Hello ${name},\n\nWe received a request to reset your password for your BMS account.\n\nClick the link below to set a new password:\n${resetLink}\n\nThis link is valid for 1 hour.\nIf you did not request a password reset, please ignore this email.\n\nBest Regards,\nThe BMS Team`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 8px; font-weight: bold; font-size: 18px; letter-spacing: 1px;">
                BMS
              </div>
              <h2 style="color: #111827; margin-top: 16px; font-size: 22px; font-weight: 700;">Password Reset Request</h2>
            </div>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              We received a request to reset the password for your <strong>Bookstore Management System</strong> account.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
              This link is valid for <strong>1 hour</strong>. If the button above does not work, copy and paste this link into your browser:<br/>
              <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
            </p>
            <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin-top: 20px;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              &copy; ${new Date().getFullYear()} Bookstore Management System. All rights reserved.
            </p>
          </div>
        `,
      });
      console.log('[EmailService] Password reset email sent successfully: %s', info.messageId);
      return true;
    } catch (error) {
      console.error('[EmailService] Error sending password reset email:', error);
      return false;
    }
  }
}

