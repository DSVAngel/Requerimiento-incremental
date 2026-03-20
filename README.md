# Sistema de recuperación de contraseña

## 1) Objetivo
Este workspace contiene dos aplicaciones que trabajan juntas para recuperación de contraseña:
- `backend/`: API REST con NestJS + TypeORM + PostgreSQL.
- `password-reset-app/`: Frontend Angular para solicitar enlace y restablecer contraseña.

## 2) Componentes y responsabilidades

### Backend (`backend/src`)

#### Núcleo
- `app.module.ts`
  - Configura `ConfigModule` global.
  - Configura `TypeOrmModule` para PostgreSQL.
  - Registra `UsersModule` y `AuthModule`.
- `main.ts`
  - Activa validaciones globales (`ValidationPipe`).
  - Configura CORS para `FRONTEND_URL` (fallback local en `http://localhost:4200`).

#### Módulo de usuarios
- `users/user.entity.ts`
  - Entidad `User` con `id`, `email` único y `password` hash.
- `users/users.service.ts`
  - Crea usuario con validación de duplicado.
  - Aplica hash `bcrypt` al password.
- `users/users.controller.ts`
  - Expone endpoints de usuarios.

#### Módulo de autenticación y reset
- `auth/auth.controller.ts`
  - `POST /auth/request-password-reset`
  - `POST /auth/reset-password`
- `auth/auth.service.ts`
  - `requestPasswordReset(email)`:
    - Busca usuario por correo.
    - Respuesta genérica para no filtrar existencia.
    - Rate limit: máximo 5 solicitudes/hora.
    - Genera token seguro, guarda hash y expiración (10 min).
    - Llama a `MailService` para enviar enlace.
  - `resetPassword(token, newPassword)`:
    - Valida complejidad del password.
    - Busca token hash no usado y no expirado.
    - Actualiza password del usuario (hash bcrypt).
    - Invalida tokens pendientes del usuario.
- `auth/password-reset-token.entity.ts`
  - Entidad de token (`tokenHash`, `expiresAt`, `used`, `createdAt`, `userId`).
- `auth/dto/request-password-reset.dto.ts`
  - Valida email y restringe dominio `@estudiantes.uv.mx`.
- `auth/dto/reset-password.dto.ts`
  - Valida token y password mínimo/estructura.

#### Módulo de correo
- `mail/mail.service.ts`
  - Construye URL: `${FRONTEND_URL}/reset-password?token=...`.
  - Envía correo de restablecimiento por SMTP.
- `mail/mail.module.ts`
  - Exporta `MailService` para `AuthModule`.

---

### Frontend (`password-reset-app/src/app`)

#### Configuración
- `app.config.ts`
  - Proveedores globales: router + `HttpClient`.
- `app.routes.ts`
  - Rutas:
    - `/request-reset` (solicitud de enlace)
    - `/reset-password` (cambio de contraseña)

#### Servicio de API
- `core/services/auth.ts`
  - `requestPasswordReset(email)` → `POST /auth/request-password-reset`
  - `resetPassword(token, password)` → `POST /auth/reset-password`
  - Base URL actual: `http://localhost:3000/auth`.

#### Páginas
- `pages/request-reset/request-reset.ts`
  - Formulario de email.
  - Validación local de dominio institucional (`@estudiantes.uv.mx`).
  - Mensaje genérico de éxito/fracaso.
- `pages/reset-password/reset-password.ts`
  - Lee `token` desde query param.
  - Valida contraseña fuerte + confirmación.
  - Envía token + password nueva al backend.

## 3) Relaciones entre componentes

### Flujo A: Solicitar enlace
1. Usuario abre `/request-reset` (Angular).
2. `RequestResetComponent` llama `AuthService.requestPasswordReset(email)`.
3. Frontend envía `POST /auth/request-password-reset`.
4. `AuthController` delega en `AuthService` (Nest).
5. `AuthService` consulta `User` y `PasswordResetToken`.
6. `AuthService` llama `MailService.sendPasswordResetEmail(...)`.
7. Usuario recibe correo con URL del frontend (`/reset-password?token=...`).

### Flujo B: Restablecer contraseña
1. Usuario abre enlace recibido (`/reset-password?token=...`).
2. `ResetPasswordComponent` toma `token` de query params.
3. Componente valida nueva contraseña y confirmación.
4. Frontend envía `POST /auth/reset-password`.
5. `AuthController` delega en `AuthService`.
6. `AuthService` valida token/expiración/uso, actualiza hash en `User`, invalida tokens.
7. Frontend muestra resultado.

### Dependencias clave
- `RequestResetComponent` → `AuthService (Angular)` → `AuthController` → `AuthService (Nest)` → `UserRepository` + `PasswordResetTokenRepository` + `MailService`.
- `ResetPasswordComponent` → `AuthService (Angular)` → `AuthController` → `AuthService (Nest)` → `UserRepository` + `PasswordResetTokenRepository`.

## 4) Contrato API (actual)

### `POST /auth/register`
Body:
```json
{ "email": "usuario@estudiantes.uv.mx", "password": "PasswordSegura@123" }
```
Respuesta esperada:
```json
{
  "message": "Usuario creado exitosamente",
  "user": { "id": "uuid", "email": "usuario@estudiantes.uv.mx" }
}
```

### `POST /auth/request-password-reset`
Body:
```json
{ "email": "usuario@estudiantes.uv.mx" }
```
Respuesta esperada (genérica):
```json
{ "message": "Si el correo existe, se enviará un enlace." }
```

### `POST /auth/reset-password`
Body:
```json
{ "token": "token-en-claro", "password": "PasswordSegura@123" }
```
Respuesta esperada:
```json
{ "message": "Contraseña actualizada correctamente." }
```

## 5) Plan de pruebas unitarias

### Objetivo
Asegurar que la lógica de recuperación funcione aislando reglas de negocio, validaciones y contratos entre capas.

### Estado actual (resumen)
- Backend: existen specs para `app`, `auth`, `users`.
- Frontend: existen specs para `app`, `auth service`, `request-reset`, `reset-password`.

### Fase 1 (prioridad alta) — flujo de recuperación

#### Backend (`auth.service.spec.ts`)
Casos obligatorios:
1. Usuario inexistente devuelve mensaje genérico.
2. Rate limit (>= 5/hora) lanza `BadRequestException`.
3. Token válido genera registro y llama `MailService`.
4. Password débil en reset lanza error.
5. Token inexistente/expirado/usado lanza error.
6. Reset exitoso:
   - guarda password hash,
   - invalida tokens pendientes,
   - responde mensaje correcto.

#### Backend (`auth.controller.spec.ts`)
Casos obligatorios:
1. Delega correctamente `email` a `AuthService`.
2. Delega `token/password` a `AuthService`.
3. Propaga respuesta del servicio.

#### Frontend (`request-reset.spec.ts`)
Casos obligatorios:
1. Form inválido no dispara request.
2. Email válido dispara `requestPasswordReset`.
3. `loading` cambia durante submit.
4. Mensaje de éxito y error se refleja en estado.

#### Frontend (`reset-password.spec.ts`)
Casos obligatorios:
1. Lee token desde query params.
2. Password y confirmación distinta muestra error.
3. Password débil impide submit.
4. Submit exitoso invoca `resetPassword(token, password)`.
5. Manejo de error muestra mensaje de token inválido/expirado.

### Fase 2 (prioridad media) — usuarios y validaciones

#### Backend
- `users.service.spec.ts`
  - Duplicado de email lanza `ConflictException`.
  - Alta exitosa hashea password.
  - No retorna password en respuesta.
- DTO tests (o validación indirecta con `ValidationPipe` en tests de controlador):
  - Email fuera de `@estudiantes.uv.mx` rechazado.
  - Password sin complejidad mínima rechazada.

### Fase 3 (prioridad media-baja) — robustez
- `mail.service.spec.ts` con mock de `nodemailer`:
  - Genera URL correcta con `FRONTEND_URL`.
  - Llama `sendMail` con destinatario y template esperados.
- Pruebas de errores de red en Angular service (HttpTestingController).

## 6) Ejecución recomendada de pruebas

### Backend
```bash
cd backend
npm test
```

### Frontend
```bash
cd password-reset-app
npm test -- --watch=false
```

### Secuencia sugerida en CI
1. `npm run build` backend y frontend.
2. Unit tests backend.
3. Unit tests frontend.
4. (Opcional) e2e backend (`npm run test:e2e`).

## 7) Variables de entorno mínimas (backend)
- `PORT`
- `FRONTEND_URL`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`

---
Este README describe la arquitectura vigente y sirve como guía para estabilizar y ampliar pruebas unitarias del flujo de recuperación de contraseña.

## 8) Despliegue en Render (backend + frontend)

### Backend (Web Service)
- Root Directory: `backend`
- Build Command: `npm ci && npm run build`
- Start Command: `npm run start:prod`
- Health Check Path: `/`

Variables de entorno requeridas en Render:
- `NODE_ENV=production`
- `PORT=3000` (Render puede inyectar este valor automáticamente)
- `FRONTEND_URL=https://TU-FRONTEND.onrender.com`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`
- `DB_SSL=true` (recomendado para Render Postgres)
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`

Notas:
- Usa `backend/.env.example` como plantilla de variables.
- No subas credenciales reales a git.

### Frontend (Static Site)
- Root Directory: `password-reset-app`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist/password-reset-app/browser`

Configura el backend en:
- `password-reset-app/src/environments/environment.prod.ts`
- Reemplaza `https://YOUR-BACKEND-SERVICE.onrender.com/auth` por la URL real de tu backend en Render.

### Checklist antes de desplegar
1. Backend compila con `npm run build`.
2. Frontend compila con `npm run build`.
3. Tests backend pasan con `npm test`.
4. `FRONTEND_URL` del backend coincide con el dominio final del frontend.
5. `apiBaseUrl` de `environment.prod.ts` apunta al backend en Render.

## 9) Docker y Docker Hub

Se agregaron estos archivos:
- `backend/Dockerfile`
- `backend/.dockerignore`
- `password-reset-app/Dockerfile`
- `password-reset-app/.dockerignore`
- `password-reset-app/nginx.conf`

### Construir imágenes

Backend:
```bash
docker build -t TU_USUARIO_DOCKERHUB/password-reset-backend:latest ./backend
```

Frontend:
```bash
docker build -t TU_USUARIO_DOCKERHUB/password-reset-frontend:latest ./password-reset-app
```

### Probar localmente

Backend (ejemplo):
```bash
docker run --rm -p 3000:3000 \
  --env-file ./backend/.env \
  TU_USUARIO_DOCKERHUB/password-reset-backend:latest
```

Frontend:
```bash
docker run --rm -p 8080:80 TU_USUARIO_DOCKERHUB/password-reset-frontend:latest
```

### Subir a Docker Hub

```bash
docker login
docker push TU_USUARIO_DOCKERHUB/password-reset-backend:latest
docker push TU_USUARIO_DOCKERHUB/password-reset-frontend:latest
```
