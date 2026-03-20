import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordResetToken } from './password-reset-token.entity';
import { Users } from '../users/user.entity';
import { MailModule } from '../mail/mail.module';
import { EmailChangeOtpToken } from './email-change-otp-token.entity';
import { UserMovement } from './user-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Users, PasswordResetToken, EmailChangeOtpToken, UserMovement]),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}