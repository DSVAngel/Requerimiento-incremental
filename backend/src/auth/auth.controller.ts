import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RequestEmailChangeOtpDto } from './dto/request-email-change-otp.dto';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';

@Controller('auth')
export class AuthController {

  constructor(private readonly authService: AuthService) {}

  @Post('request-password-reset')
  requestReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  reset(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('request-email-change-otp')
  requestEmailChangeOtp(@Body() dto: RequestEmailChangeOtpDto) {
    return this.authService.requestEmailChangeOtp(dto.currentEmail, dto.newEmail);
  }

  @Post('confirm-email-change')
  confirmEmailChange(@Body() dto: ConfirmEmailChangeDto) {
    return this.authService.confirmEmailChange(dto.currentEmail, dto.newEmail, dto.otp);
  }

  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto.email, dto.password);
  }
}

