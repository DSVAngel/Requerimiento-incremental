import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  @Matches(/^[A-Z0-9._%+-]+@estudiantes\.uv\.mx$/i, {
    message: 'El correo debe terminar con @estudiantes.uv.mx',
  })
  email!: string;
}
