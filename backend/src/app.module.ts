import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('NODE_ENV', 'development');
        const dbPort = Number(config.get<string>('DB_PORT', '5432'));
        const dbSslEnv = config.get<string>('DB_SSL');
        const useDbSsl = dbSslEnv
          ? ['true', '1', 'yes', 'on'].includes(dbSslEnv.toLowerCase())
          : nodeEnv === 'production';

        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: Number.isNaN(dbPort) ? 5432 : dbPort,
          username: config.get<string>('DB_USER', 'app_user'),
          password: config.get<string>('DB_PASS', 'cambiar_en_produccion'),
          database: config.get<string>('DB_NAME', 'password_reset_db'),
          autoLoadEntities: true,
          synchronize: nodeEnv !== 'production',
          // Render Postgres commonly requires TLS in production.
          ssl: useDbSsl ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}