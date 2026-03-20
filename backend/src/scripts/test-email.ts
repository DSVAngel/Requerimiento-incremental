import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MailService } from '../mail/mail.service';

async function testEmail() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const mailService = app.get(MailService);

  try {
    console.log('🔍 Probando envío de correo...');
    
    const testToken = 'test-token-123456';
    const testEmail = 'sangel.contact@gmail.com';
    
    await mailService.sendPasswordResetEmail(testEmail, testToken);
    
    console.log('✅ Correo enviado exitosamente!');
    console.log(`   Destinatario: ${testEmail}`);
  } catch (error: any) {
    console.error('❌ Error enviando correo:', error.message);
    console.error('   Verifica:');
    console.error('   1. MAIL_PROVIDER en .env (resend o smtp)');
    console.error('   2. Si usas resend: RESEND_API_KEY y MAIL_FROM válidos');
    console.error('   3. Si usas smtp: MAIL_HOST, MAIL_PORT, MAIL_USER y MAIL_PASSWORD');
  } finally {
    await app.close();
  }
}

testEmail();
