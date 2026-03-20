import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { Users } from '../users/user.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { EmailChangeOtpToken } from './email-change-otp-token.entity';
import { UserMovement } from './user-movement.entity';
import { MailService } from '../mail/mail.service';

const mockUserRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockTokenRepo = {
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
};

const mockEmailChangeOtpRepo = {
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
};

const mockMovementRepo = {
  create: jest.fn((v) => v),
  save: jest.fn(),
};

const mockMailService = {
  sendPasswordResetEmail: jest.fn(),
  sendEmailChangeOtpEmail: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Users), useValue: mockUserRepo },
        { provide: getRepositoryToken(PasswordResetToken), useValue: mockTokenRepo },
        { provide: getRepositoryToken(EmailChangeOtpToken), useValue: mockEmailChangeOtpRepo },
        { provide: getRepositoryToken(UserMovement), useValue: mockMovementRepo },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestPasswordReset', () => {
    it('returns generic message when user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.requestPasswordReset('noexiste@test.com');

      expect(result.message).toBe('Si el correo existe, se enviará un enlace.');
    });

    it('throws when rate limit exceeded', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'user-1', email: 'a@test.com' });
      mockTokenRepo.delete.mockResolvedValue({});
      mockTokenRepo.count.mockResolvedValue(5);

      await expect(service.requestPasswordReset('a@test.com')).rejects.toThrow(BadRequestException);
    });

    it('creates token on success', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'user-1', email: 'a@test.com' });
      mockTokenRepo.delete.mockResolvedValue({});
      mockTokenRepo.count.mockResolvedValue(0);
      mockTokenRepo.create.mockReturnValue({ userId: 'user-1' });
      mockTokenRepo.save.mockResolvedValue({});

      await service.requestPasswordReset('a@test.com');

      expect(mockTokenRepo.create).toHaveBeenCalled();
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalled();
      expect(mockMovementRepo.save).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const validPassword = 'Segura@1234XYZ';

    it('throws on weak password', async () => {
      await expect(service.resetPassword('any-token', '123')).rejects.toThrow(BadRequestException);
    });

    it('throws when token is invalid', async () => {
      mockTokenRepo.findOne.mockResolvedValue(null);
      await expect(service.resetPassword('bad-token', validPassword)).rejects.toThrow(BadRequestException);
    });

    it('updates password and invalidates tokens on success', async () => {
      mockTokenRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        used: false,
        expiresAt: new Date(Date.now() + 60_000),
      });
      mockUserRepo.findOne.mockResolvedValue({ id: 'user-1', email: 'a@test.com', password: 'old' });
      mockUserRepo.save.mockResolvedValue({});
      mockTokenRepo.update.mockResolvedValue({});

      const result = await service.resetPassword('valid-token', validPassword);

      expect(result.message).toBe('Contraseña actualizada correctamente.');
      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(mockMovementRepo.save).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('throws when user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.login('noexiste@estudiantes.uv.mx', 'PasswordSegura@123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when password is incorrect', async () => {
      const hash = await bcrypt.hash('OtraPassword@123', 12);
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'usuario@estudiantes.uv.mx',
        password: hash,
      });

      await expect(service.login('usuario@estudiantes.uv.mx', 'PasswordSegura@123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns user data on success', async () => {
      const hash = await bcrypt.hash('PasswordSegura@123', 12);
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'usuario@estudiantes.uv.mx',
        password: hash,
      });

      const result = await service.login('usuario@estudiantes.uv.mx', 'PasswordSegura@123');

      expect(result.message).toBe('Inicio de sesión exitoso.');
      expect(result.user).toEqual({ id: 'user-1', email: 'usuario@estudiantes.uv.mx' });
      expect(mockMovementRepo.save).toHaveBeenCalled();
    });
  });

  describe('requestEmailChangeOtp', () => {
    it('throws when current user is not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.requestEmailChangeOtp('actual@estudiantes.uv.mx', 'nuevo@estudiantes.uv.mx'),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates OTP and sends email on success', async () => {
      mockUserRepo.findOne
        .mockResolvedValueOnce({ id: 'user-1', email: 'actual@estudiantes.uv.mx' })
        .mockResolvedValueOnce(null);
      mockEmailChangeOtpRepo.delete.mockResolvedValue({});
      mockEmailChangeOtpRepo.count.mockResolvedValue(0);
      mockEmailChangeOtpRepo.update.mockResolvedValue({});
      mockEmailChangeOtpRepo.create.mockReturnValue({ userId: 'user-1' });
      mockEmailChangeOtpRepo.save.mockResolvedValue({});

      const result = await service.requestEmailChangeOtp(
        'actual@estudiantes.uv.mx',
        'nuevo@estudiantes.uv.mx',
      );

      expect(result.message).toContain('Se envió un OTP');
      expect(result.otpExpiresInSeconds).toBe(300);
      expect(mockMailService.sendEmailChangeOtpEmail).toHaveBeenCalled();
      expect(mockMovementRepo.save).toHaveBeenCalled();
    });
  });

  describe('confirmEmailChange', () => {
    it('throws when token is invalid', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'user-1', email: 'actual@estudiantes.uv.mx' });
      mockEmailChangeOtpRepo.findOne.mockResolvedValue(null);

      await expect(
        service.confirmEmailChange('actual@estudiantes.uv.mx', 'nuevo@estudiantes.uv.mx', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates email on success', async () => {
      mockUserRepo.findOne
        .mockResolvedValueOnce({ id: 'user-1', email: 'actual@estudiantes.uv.mx' })
        .mockResolvedValueOnce(null);
      mockEmailChangeOtpRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        newEmail: 'nuevo@estudiantes.uv.mx',
        used: false,
        expiresAt: new Date(Date.now() + 60_000),
      });
      mockUserRepo.save.mockResolvedValue({});
      mockEmailChangeOtpRepo.update.mockResolvedValue({});

      const result = await service.confirmEmailChange(
        'actual@estudiantes.uv.mx',
        'nuevo@estudiantes.uv.mx',
        '123456',
      );

      expect(result.message).toBe('Correo actualizado correctamente.');
      expect(result.user.email).toBe('nuevo@estudiantes.uv.mx');
      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(mockMovementRepo.save).toHaveBeenCalled();
    });
  });
});
