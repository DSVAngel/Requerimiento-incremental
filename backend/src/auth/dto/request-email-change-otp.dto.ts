import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class RequestEmailChangeOtpDto {
  @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido' })
  @IsNotEmpty({ message: 'El correo actual es obligatorio' })
  currentEmail!: string;

  @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido' })
  @IsNotEmpty({ message: 'El nuevo correo es obligatorio' })
  @Matches(/^[A-Z0-9._%+-]+@estudiantes\.uv\.mx$/i, {
    message: 'El nuevo correo debe terminar con @estudiantes.uv.mx',
  })
  newEmail!: string;
}
