import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class ConfirmEmailChangeDto {
  @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido' })
  @IsNotEmpty({ message: 'El correo actual es obligatorio' })
  currentEmail!: string;

  @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido' })
  @IsNotEmpty({ message: 'El nuevo correo es obligatorio' })
  @Matches(/^[A-Z0-9._%+-]+@estudiantes\.uv\.mx$/i, {
    message: 'El nuevo correo debe terminar con @estudiantes.uv.mx',
  })
  newEmail!: string;

  @IsNotEmpty({ message: 'El OTP es obligatorio' })
  @Matches(/^\d{6}$/, { message: 'El OTP debe tener 6 dígitos' })
  otp!: string;
}
