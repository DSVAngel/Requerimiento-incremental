import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThanOrEqual } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { Users } from '../users/user.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { EmailChangeOtpToken } from './email-change-otp-token.entity';
import { UserMovement } from './user-movement.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,

    @InjectRepository(PasswordResetToken)
    private readonly tokenRepository: Repository<PasswordResetToken>,

    @InjectRepository(EmailChangeOtpToken)
    private readonly emailChangeOtpRepository: Repository<EmailChangeOtpToken>,

    @InjectRepository(UserMovement)
    private readonly movementRepository: Repository<UserMovement>,

    private readonly mailService: MailService,
  ) {}

  private async logMovement(userId: string | null, movement: string, detail?: string) {
    await this.movementRepository.save(
      this.movementRepository.create({
        userId,
        movement,
        detail: detail ?? null,
      }),
    );
  }

  // ===============================
  // 1️⃣ Solicitar reset
  // ===============================
  async requestPasswordReset(email: string) {

    const user = await this.usersRepository.findOne({ where: { email } });

    // No revelar si el correo existe o no
    if (!user) {
      return { message: 'Si el correo existe, se enviará un enlace.' };
    }

    await this.logMovement(user.id, 'REQUEST_PASSWORD_RESET', `email=${email}`);

    // Limpiar tokens expirados antes de contar (evita acumulación en DB)
    await this.tokenRepository.delete({
      userId: user.id,
      expiresAt: LessThanOrEqual(new Date()),
    });

    // Limitar a 5 solicitudes activas por hora
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.tokenRepository.count({
      where: {
        userId: user.id,
        createdAt: MoreThan(oneHourAgo),
        used: false,
      },
    });

    if (count >= 5) {
      throw new BadRequestException('Máximo 5 solicitudes por hora.');
    }

    // Generar token seguro y hashear antes de guardar
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    const resetToken = this.tokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await this.tokenRepository.save(resetToken);

    // Enviar correo con el enlace de reset
    await this.mailService.sendPasswordResetEmail(email, rawToken);

    return { message: 'Si el correo existe, se enviará un enlace.' };
  }

  // ===============================
  // 2️⃣ Reset real de contraseña
  // ===============================
  async resetPassword(token: string, newPassword: string) {

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;

    if (!passwordRegex.test(newPassword)) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 12 caracteres, una mayúscula, una minúscula, un número y un símbolo.'
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await this.tokenRepository.findOne({
      where: { tokenHash, used: false },
    });

    // Respuesta genérica para no revelar si el token existió o expiró
    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Token inválido o expirado.');
    }

    const user = await this.usersRepository.findOne({
      where: { id: resetToken.userId },
    });

    if (!user) {
      throw new BadRequestException('Token inválido o expirado.');
    }

    // Hashear nueva contraseña
    user.password = await bcrypt.hash(newPassword, 12);
    await this.usersRepository.save(user);

    // Invalidar TODOS los tokens pendientes del usuario (no solo este)
    await this.tokenRepository.update(
      { userId: user.id, used: false },
      { used: true }
    );

    await this.logMovement(user.id, 'RESET_PASSWORD', `email=${user.email}`);

    return { message: 'Contraseña actualizada correctamente.' };
  }

  async login(email: string, password: string) {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      throw new BadRequestException('Credenciales inválidas.');
    }

    const passwordOk = await bcrypt.compare(password, user.password);

    if (!passwordOk) {
      throw new BadRequestException('Credenciales inválidas.');
    }

    await this.logMovement(user.id, 'LOGIN', `email=${email}`);

    return {
      message: 'Inicio de sesión exitoso.',
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async requestEmailChangeOtp(currentEmail: string, newEmail: string) {
    const user = await this.usersRepository.findOne({ where: { email: currentEmail } });

    if (!user) {
      throw new BadRequestException('No se pudo validar la sesión para cambiar el correo.');
    }

    if (currentEmail === newEmail) {
      throw new BadRequestException('El nuevo correo debe ser diferente al actual.');
    }

    const alreadyUsed = await this.usersRepository.findOne({ where: { email: newEmail } });
    if (alreadyUsed) {
      throw new ConflictException('El nuevo correo ya está registrado.');
    }

    await this.emailChangeOtpRepository.delete({
      userId: user.id,
      expiresAt: LessThanOrEqual(new Date()),
    });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.emailChangeOtpRepository.count({
      where: {
        userId: user.id,
        createdAt: MoreThan(oneHourAgo),
        used: false,
      },
    });

    if (count >= 5) {
      throw new BadRequestException('Máximo 5 solicitudes por hora para cambiar correo.');
    }

    const rawOtp = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.emailChangeOtpRepository.update(
      { userId: user.id, used: false },
      { used: true },
    );

    await this.emailChangeOtpRepository.save(
      this.emailChangeOtpRepository.create({
        userId: user.id,
        newEmail,
        otpHash,
        expiresAt,
      }),
    );

    await this.mailService.sendEmailChangeOtpEmail(newEmail, rawOtp);
    await this.logMovement(user.id, 'REQUEST_EMAIL_CHANGE_OTP', `from=${currentEmail};to=${newEmail}`);

    return {
      message: 'Se envió un OTP al nuevo correo. Expira en 5 minutos.',
      otpExpiresInSeconds: 300,
    };
  }

  async confirmEmailChange(currentEmail: string, newEmail: string, otp: string) {
    const user = await this.usersRepository.findOne({ where: { email: currentEmail } });

    if (!user) {
      throw new BadRequestException('No se pudo validar la sesión para cambiar el correo.');
    }

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    const token = await this.emailChangeOtpRepository.findOne({
      where: {
        userId: user.id,
        newEmail,
        otpHash,
        used: false,
      },
    });

    if (!token || token.expiresAt < new Date()) {
      throw new BadRequestException('OTP inválido o expirado.');
    }

    const emailTaken = await this.usersRepository.findOne({ where: { email: newEmail } });
    if (emailTaken && emailTaken.id !== user.id) {
      throw new ConflictException('El nuevo correo ya está registrado.');
    }

    const previousEmail = user.email;
    user.email = newEmail;
    await this.usersRepository.save(user);

    await this.emailChangeOtpRepository.update(
      { userId: user.id, used: false },
      { used: true },
    );

    await this.logMovement(user.id, 'CHANGE_EMAIL', `from=${previousEmail};to=${newEmail}`);

    return {
      message: 'Correo actualizado correctamente.',
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async register(email: string, password: string) {
    const existingUser = await this.usersRepository.findOne({ where: { email } });

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
    });

    await this.usersRepository.save(user);

    return {
      message: 'Usuario creado exitosamente',
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}