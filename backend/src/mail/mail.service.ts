import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

type MailOptions = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

@Injectable()
export class MailService {
  private readonly provider: string;
  private transporter?: Transporter;

  constructor(private configService: ConfigService) {
    // Keep SMTP as default to preserve the original local/dev behavior.
    this.provider = this.configService.get<string>('MAIL_PROVIDER', 'smtp').toLowerCase();

    if (this.provider === 'smtp') {
      const mailPort = Number(this.configService.get<string>('MAIL_PORT', '587'));
      const mailSecureEnv = this.configService.get<string>('MAIL_SECURE', 'false');
      const isSecure = ['true', '1', 'yes', 'on'].includes(mailSecureEnv.toLowerCase()) || mailPort === 465;

      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('MAIL_HOST'),
        port: Number.isNaN(mailPort) ? 587 : mailPort,
        secure: isSecure,
        auth: {
          user: this.configService.get<string>('MAIL_USER'),
          pass: this.configService.get<string>('MAIL_PASSWORD'),
        },
        tls: {
          // No fallar en certificados inválidos
          rejectUnauthorized: false,
        },
      });
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: this.configService.get<string>('MAIL_FROM', 'noreply@example.com'),
      to: email,
      subject: 'Restablece tu contraseña',
      html: this.getPasswordResetTemplate(resetUrl, email),
    };

    try {
      await this.send(mailOptions);
      console.log(`✉️ Correo de reset enviado a: ${email}`);
    } catch (error) {
      console.error(`❌ Error enviando correo a ${email}:`, error);
      throw error;
    }
  }

  async sendLoginOtpEmail(email: string, otpCode: string): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('MAIL_FROM', 'noreply@example.com'),
      to: email,
      subject: 'Tu OTP de inicio de sesión',
      html: this.getLoginOtpTemplate(otpCode, email),
    };

    try {
      await this.send(mailOptions);
      console.log(`✉️ OTP de login enviado a: ${email}`);
    } catch (error) {
      console.error(`❌ Error enviando OTP a ${email}:`, error);
      throw error;
    }
  }

  async sendEmailChangeOtpEmail(newEmail: string, otpCode: string): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('MAIL_FROM', 'noreply@example.com'),
      to: newEmail,
      subject: 'OTP para cambio de correo',
      html: this.getEmailChangeOtpTemplate(otpCode, newEmail),
    };

    try {
      await this.send(mailOptions);
      console.log(`OTP para cambio de correo enviado a: ${newEmail}`);
    } catch (error) {
      console.error(`Error enviando OTP de cambio de correo a ${newEmail}:`, error);
      throw error;
    }
  }

  private async send(mailOptions: MailOptions): Promise<void> {
    if (this.provider === 'smtp') {
      if (!this.transporter) {
        throw new Error('Proveedor SMTP no inicializado. Verifica MAIL_HOST, MAIL_PORT, MAIL_USER y MAIL_PASSWORD.');
      }

      await this.transporter.sendMail(mailOptions);
      return;
    }

    await this.sendWithResend(mailOptions);
  }

  private async sendWithResend(mailOptions: MailOptions): Promise<void> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY no está configurada');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: mailOptions.from,
        to: [mailOptions.to],
        subject: mailOptions.subject,
        html: mailOptions.html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend API error (${response.status}): ${errorBody}`);
    }
  }

  private getPasswordResetTemplate(resetUrl: string, email: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { 
              display: inline-block; 
              background-color: #007bff; 
              color: white; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Restablece tu contraseña</h1>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
              <p>Haz clic en el botón de abajo para restablecer tu contraseña. Este enlace expirará en 10 minutos.</p>
              <center>
                <a href="${resetUrl}" class="button">Restablecer contraseña</a>
              </center>
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; background-color: #eee; padding: 10px; border-radius: 5px;">
                ${resetUrl}
              </p>
              <p>Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña permanecerá segura.</p>
              <hr />
              <p><strong>Recomendaciones de seguridad:</strong></p>
              <ul>
                <li>Nunca compartas tu enlace de reset con alguien más</li>
                <li>Este enlace es único y solo funciona una vez</li>
                <li>Si tienes problemas, contacta con nuestro soporte</li>
              </ul>
            </div>
            <div class="footer">
              <p>&copy; 2026 Todos los derechos reservados. Este es un mensaje automático, por favor no respondas.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getLoginOtpTemplate(otpCode: string, email: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .otp-box {
              text-align: center;
              font-size: 28px;
              letter-spacing: 8px;
              font-weight: bold;
              padding: 18px;
              background: #e9f2ff;
              border-radius: 8px;
              margin: 20px 0;
              color: #0b3d91;
            }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Código de verificación</h1>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p>Recibimos una solicitud de inicio de sesión para la cuenta:</p>
              <p><strong>${email}</strong></p>
              <p>Usa este código OTP para completar el acceso. El código expira en 5 minutos.</p>
              <div class="otp-box">${otpCode}</div>
              <p>Si no intentaste iniciar sesión, ignora este correo y considera cambiar tu contraseña.</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Todos los derechos reservados. Este es un mensaje automático, por favor no respondas.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getEmailChangeOtpTemplate(otpCode: string, newEmail: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0c7a4a; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .otp-box {
              text-align: center;
              font-size: 28px;
              letter-spacing: 8px;
              font-weight: bold;
              padding: 18px;
              background: #e8f7ef;
              border-radius: 8px;
              margin: 20px 0;
              color: #0b5f3a;
            }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Confirmación de cambio de correo</h1>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p>Se solicitó cambiar la cuenta al correo:</p>
              <p><strong>${newEmail}</strong></p>
              <p>Para confirmar el cambio usa este OTP. El código expira en 5 minutos.</p>
              <div class="otp-box">${otpCode}</div>
              <p>Si no hiciste esta solicitud, ignora este correo.</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Todos los derechos reservados. Este es un mensaje automático, por favor no respondas.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
