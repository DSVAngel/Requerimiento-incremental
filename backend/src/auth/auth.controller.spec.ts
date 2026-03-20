import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    login: jest.fn(),
    requestEmailChangeOtp: jest.fn(),
    confirmEmailChange: jest.fn(),
    register: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call requestPasswordReset with dto email', async () => {
    mockAuthService.requestPasswordReset.mockResolvedValue({ message: 'ok' });

    const dto = { email: 'usuario@estudiantes.uv.mx' };
    await controller.requestReset(dto);

    expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(dto.email);
  });

  it('should call resetPassword with dto token and password', async () => {
    mockAuthService.resetPassword.mockResolvedValue({ message: 'ok' });

    const dto = { token: 'token', password: 'PasswordSegura@123' };
    await controller.reset(dto);

    expect(mockAuthService.resetPassword).toHaveBeenCalledWith(dto.token, dto.password);
  });

  it('should call login with dto email and password', async () => {
    mockAuthService.login.mockResolvedValue({ message: 'ok' });

    const dto = { email: 'usuario@estudiantes.uv.mx', password: 'PasswordSegura@123' };
    await controller.login(dto);

    expect(mockAuthService.login).toHaveBeenCalledWith(dto.email, dto.password);
  });

  it('should call requestEmailChangeOtp with dto data', async () => {
    mockAuthService.requestEmailChangeOtp.mockResolvedValue({ message: 'ok' });

    const dto = {
      currentEmail: 'usuario@estudiantes.uv.mx',
      newEmail: 'nuevo@estudiantes.uv.mx',
    };
    await controller.requestEmailChangeOtp(dto);

    expect(mockAuthService.requestEmailChangeOtp).toHaveBeenCalledWith(dto.currentEmail, dto.newEmail);
  });

  it('should call confirmEmailChange with dto data', async () => {
    mockAuthService.confirmEmailChange.mockResolvedValue({ message: 'ok' });

    const dto = {
      currentEmail: 'usuario@estudiantes.uv.mx',
      newEmail: 'nuevo@estudiantes.uv.mx',
      otp: '123456',
    };
    await controller.confirmEmailChange(dto);

    expect(mockAuthService.confirmEmailChange).toHaveBeenCalledWith(dto.currentEmail, dto.newEmail, dto.otp);
  });

  it('should call register with dto email and password', async () => {
    mockAuthService.register.mockResolvedValue({ message: 'ok' });

    const dto = { email: 'nuevo@estudiantes.uv.mx', password: 'PasswordSegura@123' };
    await controller.register(dto);

    expect(mockAuthService.register).toHaveBeenCalledWith(dto.email, dto.password);
  });
});
