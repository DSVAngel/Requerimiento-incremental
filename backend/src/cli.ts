import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';

type CliOptions = Record<string, string | boolean>;

type ParsedArgs = {
  command: string | undefined;
  options: CliOptions;
};

function parseArgs(args: string[]): ParsedArgs {
  let command: string | undefined;
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];

    if (!command && !current.startsWith('-')) {
      command = current;
      continue;
    }

    if (current.startsWith('--')) {
      const trimmed = current.slice(2);
      const eqIndex = trimmed.indexOf('=');

      if (eqIndex >= 0) {
        const key = trimmed.slice(0, eqIndex);
        const value = trimmed.slice(eqIndex + 1);
        options[key] = value;
        continue;
      }

      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        options[trimmed] = next;
        i += 1;
      } else {
        options[trimmed] = true;
      }
      continue;
    }

    if (current.startsWith('-')) {
      const short = current.slice(1);
      options[short] = true;
    }
  }

  return { command, options };
}

function getOption(options: CliOptions, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = options[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

function printHelp() {
  console.log('Usage: npm run cli');
  console.log('       npm run cli -- <command> [options]');
  console.log('');
  console.log('This CLI connects to an existing backend API. It does not start the backend.');
  console.log('');
  console.log('Commands:');
  console.log('  menu                        Open interactive menu');
  console.log('  register                    Register user (same as frontend)');
  console.log('  login                       Login with email and password');
  console.log('  request-email-change-otp    Send OTP to new email');
  console.log('  confirm-email-change        Confirm email change with OTP');
  console.log('  request-password-reset      Request password reset (same as frontend)');
  console.log('  reset-password              Set new password with token (same as frontend)');
  console.log('  ping                        Check backend connectivity');
  console.log('  help                        Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --api http://localhost:3000 (optional backend URL override)');
  console.log('  register --email user@estudiantes.uv.mx --password Secret123456!');
  console.log('  login --email user@estudiantes.uv.mx --password Secret123456!');
  console.log('  request-email-change-otp --current-email user@estudiantes.uv.mx --new-email nuevo@estudiantes.uv.mx');
  console.log('  confirm-email-change --current-email user@estudiantes.uv.mx --new-email nuevo@estudiantes.uv.mx --otp 123456');
  console.log('  request-password-reset --email user@estudiantes.uv.mx');
  console.log('  reset-password --token <token> --password NewSecret123456! --confirm-password NewSecret123456!');
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function createCliReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    } catch (error) {
      reject(error);
    }
  });
}

function loadDotEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
}

function getApiBaseUrl(options: CliOptions): string {
  const value =
    getOption(options, 'api') ??
    process.env.CLI_API_BASE_URL ??
    process.env.BACKEND_URL ??
    'http://localhost:3000';

  return normalizeBaseUrl(value);
}

async function postJson(apiBaseUrl: string, route: string, payload: Record<string, string>) {
  const endpoint = `${apiBaseUrl}${route}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(`No se pudo conectar con el backend en ${apiBaseUrl}. Inicia el backend primero.`);
  }

  const raw = await response.text();
  let parsed: unknown = raw;

  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }

  if (!response.ok) {
    if (typeof parsed === 'object' && parsed && 'message' in parsed) {
      const message = (parsed as { message?: string | string[] }).message;
      if (Array.isArray(message)) {
        throw new Error(`HTTP ${response.status}: ${message.join(', ')}`);
      }

      if (typeof message === 'string') {
        throw new Error(`HTTP ${response.status}: ${message}`);
      }
    }

    if (typeof parsed === 'string' && parsed.trim()) {
      throw new Error(`HTTP ${response.status}: ${parsed}`);
    }

    throw new Error(`HTTP ${response.status}: Error en solicitud a ${route}`);
  }

  return parsed;
}

async function pingBackend(options: CliOptions) {
  const apiBaseUrl = getApiBaseUrl(options);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/`);
  } catch {
    throw new Error(`No se pudo conectar con el backend en ${apiBaseUrl}.`);
  }

  const body = await response.text();
  console.log(`Backend: ${apiBaseUrl}`);
  console.log(`Status: ${response.status}`);
  if (body) {
    console.log(`Body: ${body}`);
  }
}

async function runRegister(options: CliOptions) {
  const email = getOption(options, 'email', 'e') ?? process.env.CLI_REGISTER_EMAIL;
  const password = getOption(options, 'password', 'p') ?? process.env.CLI_REGISTER_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing required options: --email and --password');
  }

  const apiBaseUrl = getApiBaseUrl(options);
  const result = (await postJson(apiBaseUrl, '/auth/register', {
    email,
    password,
  })) as {
    message?: string;
    user?: { id?: string; email?: string };
  };

  if (result.message) {
    console.log(result.message);
  }

  if (result.user?.email) {
    console.log(`Email: ${result.user.email}`);
  }

  if (result.user?.id) {
    console.log(`Id: ${result.user.id}`);
  }
}

async function runLogin(options: CliOptions) {
  const email = getOption(options, 'email', 'e') ?? process.env.CLI_LOGIN_EMAIL;
  const password = getOption(options, 'password', 'p') ?? process.env.CLI_LOGIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing required options: --email and --password');
  }

  const apiBaseUrl = getApiBaseUrl(options);
  const result = (await postJson(apiBaseUrl, '/auth/login', {
    email,
    password,
  })) as {
    message?: string;
    user?: { id?: string; email?: string };
  };

  if (result.message) {
    console.log(result.message);
  }

  if (result.user?.email) {
    console.log(`Email: ${result.user.email}`);
  }

  if (result.user?.id) {
    console.log(`Id: ${result.user.id}`);
  }
}

async function runRequestEmailChangeOtp(options: CliOptions) {
  const currentEmail = getOption(options, 'current-email', 'current') ?? process.env.CLI_CURRENT_EMAIL;
  const newEmail = getOption(options, 'new-email', 'new') ?? process.env.CLI_NEW_EMAIL;

  if (!currentEmail || !newEmail) {
    throw new Error('Missing required options: --current-email and --new-email');
  }

  const apiBaseUrl = getApiBaseUrl(options);
  const result = (await postJson(apiBaseUrl, '/auth/request-email-change-otp', {
    currentEmail,
    newEmail,
  })) as {
    message?: string;
    otpExpiresInSeconds?: number;
  };

  if (result.message) {
    console.log(result.message);
  }

  if (typeof result.otpExpiresInSeconds === 'number') {
    console.log(`OTP expira en ${result.otpExpiresInSeconds} segundos.`);
  }
}

async function runConfirmEmailChange(options: CliOptions) {
  const currentEmail = getOption(options, 'current-email', 'current') ?? process.env.CLI_CURRENT_EMAIL;
  const newEmail = getOption(options, 'new-email', 'new') ?? process.env.CLI_NEW_EMAIL;
  const otp = getOption(options, 'otp') ?? process.env.CLI_EMAIL_CHANGE_OTP;

  if (!currentEmail || !newEmail || !otp) {
    throw new Error('Missing required options: --current-email, --new-email and --otp');
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new Error('Invalid OTP format: --otp must contain exactly 6 digits');
  }

  const apiBaseUrl = getApiBaseUrl(options);
  const result = (await postJson(apiBaseUrl, '/auth/confirm-email-change', {
    currentEmail,
    newEmail,
    otp,
  })) as {
    message?: string;
    user?: { id?: string; email?: string };
  };

  if (result.message) {
    console.log(result.message);
  }

  if (result.user?.email) {
    console.log(`Email: ${result.user.email}`);
  }

  if (result.user?.id) {
    console.log(`Id: ${result.user.id}`);
  }
}

async function runRequestPasswordReset(options: CliOptions) {
  const email = getOption(options, 'email', 'e') ?? process.env.CLI_RESET_EMAIL;

  if (!email) {
    throw new Error('Missing required option: --email');
  }

  const apiBaseUrl = getApiBaseUrl(options);
  const result = (await postJson(apiBaseUrl, '/auth/request-password-reset', {
    email,
  })) as { message?: string };

  if (result.message) {
    console.log(result.message);
  }
}

async function runResetPassword(options: CliOptions) {
  const token = getOption(options, 'token', 't') ?? process.env.CLI_RESET_TOKEN;
  const password = getOption(options, 'password', 'p') ?? process.env.CLI_NEW_PASSWORD;
  const confirmPassword =
    getOption(options, 'confirm-password', 'confirm', 'c') ?? process.env.CLI_NEW_PASSWORD_CONFIRM;

  if (!token || !password || !confirmPassword) {
    throw new Error('Missing required options: --token, --password and --confirm-password');
  }

  if (password !== confirmPassword) {
    throw new Error('Las contraseñas no coinciden.');
  }

  const apiBaseUrl = getApiBaseUrl(options);
  const result = (await postJson(apiBaseUrl, '/auth/reset-password', {
    token,
    password,
  })) as { message?: string };

  if (result.message) {
    console.log(result.message);
  }
}

async function runMenu(): Promise<void> {
  const rl = createCliReadline();

  try {
    // Menu-driven mode for users that prefer selectable options over commands.
    while (true) {
      console.log('');
      console.log('=== Backend CLI Menu ===');
      console.log('Backend objetivo:', getApiBaseUrl({}));
      console.log('1) Register');
      console.log('2) Login');
      console.log('3) Solicitar OTP para cambio de correo');
      console.log('4) Confirmar cambio de correo con OTP');
      console.log('5) Recuperar contraseña (enviar enlace)');
      console.log('6) Nueva contraseña con token');
      console.log('7) Probar conexion (ping)');
      console.log('8) Ver ayuda');
      console.log('0) Salir');

      let selected = '';
      try {
        selected = await askQuestion(rl, 'Selecciona una opcion: ');
      } catch {
        console.log('Saliendo del menu...');
        return;
      }

      if (selected === '0' || selected.toLowerCase() === 'exit') {
        console.log('Saliendo del menu...');
        return;
      }

      if (selected === '1') {
        const email = await askQuestion(rl, 'Email: ');
        const password = await askQuestion(rl, 'Password: ');

        if (!email || !password) {
          console.log('Email y password son obligatorios.');
          continue;
        }

        try {
          await runRegister({ email, password });
        } catch (error: unknown) {
          console.error(`Error: ${getErrorMessage(error)}`);
        }

        continue;
      }

      if (selected === '2') {
        const email = await askQuestion(rl, 'Email: ');
        const password = await askQuestion(rl, 'Password: ');

        if (!email || !password) {
          console.log('Email y password son obligatorios.');
          continue;
        }

        try {
          await runLogin({ email, password });
        } catch (error: unknown) {
          console.error(`Error: ${getErrorMessage(error)}`);
        }

        continue;
      }

      if (selected === '3') {
        const currentEmail = await askQuestion(rl, 'Correo actual: ');
        const newEmail = await askQuestion(rl, 'Nuevo correo: ');

        if (!currentEmail || !newEmail) {
          console.log('Correo actual y nuevo correo son obligatorios.');
          continue;
        }

        try {
          await runRequestEmailChangeOtp({ 'current-email': currentEmail, 'new-email': newEmail });
        } catch (error: unknown) {
          console.error(`Error: ${getErrorMessage(error)}`);
        }

        continue;
      }

      if (selected === '4') {
        const currentEmail = await askQuestion(rl, 'Correo actual: ');
        const newEmail = await askQuestion(rl, 'Nuevo correo: ');
        const otp = await askQuestion(rl, 'OTP: ');

        if (!currentEmail || !newEmail || !otp) {
          console.log('Correo actual, nuevo correo y OTP son obligatorios.');
          continue;
        }

        try {
          await runConfirmEmailChange({ 'current-email': currentEmail, 'new-email': newEmail, otp });
        } catch (error: unknown) {
          console.error(`Error: ${getErrorMessage(error)}`);
        }

        continue;
      }

      if (selected === '5') {
        const email = await askQuestion(rl, 'Email: ');

        if (!email) {
          console.log('El email es obligatorio.');
          continue;
        }

        try {
          await runRequestPasswordReset({ email });
        } catch (error: unknown) {
          console.error(`Error: ${getErrorMessage(error)}`);
        }

        continue;
      }

      if (selected === '6') {
        const token = await askQuestion(rl, 'Token: ');
        const password = await askQuestion(rl, 'Nueva password: ');
        const confirmPassword = await askQuestion(rl, 'Repite la nueva password: ');

        if (!token || !password || !confirmPassword) {
          console.log('Token, password y confirmacion son obligatorios.');
          continue;
        }

        try {
          await runResetPassword({ token, password, 'confirm-password': confirmPassword });
        } catch (error: unknown) {
          console.error(`Error: ${getErrorMessage(error)}`);
        }

        continue;
      }

      if (selected === '7') {
        try {
          await pingBackend({});
        } catch (error: unknown) {
          console.error(`Error: ${getErrorMessage(error)}`);
        }

        continue;
      }

      if (selected === '8') {
        printHelp();
        continue;
      }

      console.log('Opcion invalida. Intenta de nuevo.');
    }
  } finally {
    try {
      rl.close();
    } catch {
      // Ignore close errors when interface is already closed.
    }
  }
}

export async function runCli(args: string[] = process.argv.slice(2)) {
  loadDotEnvFile();

  if (args.length === 0) {
    await runMenu();
    return;
  }

  const { command, options } = parseArgs(args);

  if (!command || command === 'help' || command === '--help' || command === '-h' || options.h || options.help) {
    printHelp();
    return;
  }

  if (command === 'menu') {
    await runMenu();
    return;
  }

  if (command === 'register') {
    await runRegister(options);
    return;
  }

  if (command === 'login') {
    await runLogin(options);
    return;
  }

  if (command === 'request-email-change-otp' || command === 'request-change-otp') {
    await runRequestEmailChangeOtp(options);
    return;
  }

  if (command === 'confirm-email-change' || command === 'confirm-change-email') {
    await runConfirmEmailChange(options);
    return;
  }

  if (command === 'request-password-reset' || command === 'request-reset') {
    await runRequestPasswordReset(options);
    return;
  }

  if (command === 'reset-password') {
    await runResetPassword(options);
    return;
  }

  if (command === 'ping') {
    await pingBackend(options);
    return;
  }

  if (['serve', 'start', 'create-user', 'test-email'].includes(command)) {
    throw new Error('Ese comando fue removido: este CLI solo consume la API. Inicia el backend por separado.');
  }

  throw new Error(`Unknown command: ${command}. Use "help" to see available commands.`);
}

runCli().catch((error: unknown) => {
  const message = getErrorMessage(error);
  console.error(`CLI error: ${message}`);
  process.exit(1);
});
