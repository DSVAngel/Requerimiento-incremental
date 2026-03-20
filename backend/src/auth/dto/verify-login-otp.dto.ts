import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyLoginOtpDto {
  @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email!: string;

  @IsNotEmpty({ message: 'El OTP es obligatorio' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El OTP debe tener 6 dígitos' })
  otp!: string;
}