import 'server-only';
import nodemailer from 'nodemailer';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendWelcomeEmail(toEmail: string, name: string, temporaryPassword: string): Promise<void> {
    const fromAddress = process.env.SMTP_FROM || '"BMS System" <noreply@bms.com>';
    
    // In local development, if SMTP_USER isn't set, just log it instead of crashing.
    if (!process.env.SMTP_USER) {
      console.log('\n' + '✉️ '.repeat(20));
      console.log(`[MOCK EMAIL] Welcome Email to ${name} (${toEmail})`);
      console.log(`Password: ${temporaryPassword}`);
      console.log('✉️ '.repeat(20) + '\n');
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: 'Welcome to BMS - Your Account Details',
        text: `Hello ${name},\n\nYour account has been created successfully.\n\nHere are your login details:\nEmail: ${toEmail}\nPassword: ${temporaryPassword}\n\nPlease log in and change your password as soon as possible.\n\nBest Regards,\nThe BMS Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to BMS!</h2>
            <p>Hello ${name},</p>
            <p>Your account has been created successfully. Here are your login details:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Email:</strong> ${toEmail}</p>
              <p style="margin: 10px 0 0 0;"><strong>Password:</strong> <span style="font-family: monospace; font-size: 16px;">${temporaryPassword}</span></p>
            </div>
            <p>Please log in and change your password as soon as possible.</p>
            <br/>
            <p>Best Regards,<br/>The BMS Team</p>
          </div>
        `,
      });
      console.log('Welcome email sent: %s', info.messageId);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // We don't want to throw this error and roll back user creation just because email failed
    }
  }
}
