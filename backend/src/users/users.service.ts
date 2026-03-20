import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Users } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<{ message: string; user: Partial<Users> }> {
    const existingUser = await this.usersRepository.findOne({ 
      where: { email: createUserDto.email } 
    });

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
    
    const user = this.usersRepository.create({
      email: createUserDto.email,
      password: hashedPassword,
    });

    await this.usersRepository.save(user);

    return {
      message: 'Usuario creado exitosamente',
      user: { id: user.id, email: user.email },
    };
  }
}
