import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

async function createInitialUser() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    // Usuario solicitado
    const email = 'sangel.contact@gmail.com';
    const password = 'Admin123456!'; // Contraseña temporal segura

    await usersService.create({
      email,
      password,
    });

    console.log('✅ Usuario creado exitosamente:');
    console.log(`   Email: ${email}`);
    console.log(`   Contraseña temporal: ${password}`);
    console.log('   ⚠️  Cambia esta contraseña después del primer inicio de sesión');
  } catch (error: any) {
    if (error.message?.includes('ya está registrado')) {
      console.log('ℹ️  El usuario ya existe en la base de datos');
    } else {
      console.error('❌ Error creando usuario:', error.message);
    }
  } finally {
    await app.close();
  }
}

createInitialUser();
