import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  message = '';
  isError = false;
  loading = false;
  showPassword = false;
  resetInfo = '';
  registerInfo = '';
  emailChangedInfo = '';

  form = new FormBuilder().group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });

    this.route.queryParams.subscribe((params) => {
      if (params['reset'] === 'ok') {
        this.resetInfo = 'Contraseña restablecida. Inicia sesión con tu nueva contraseña.';
      }

      if (params['register'] === 'ok') {
        this.registerInfo = 'Cuenta creada correctamente. Ahora puedes iniciar sesión.';
      }

      if (params['emailChanged'] === 'ok') {
        this.emailChangedInfo = 'Correo actualizado correctamente. Inicia sesión con tu nuevo correo.';
      }
    });
  }

  submit() {
    const emailControl = this.form.get('email');
    const passwordControl = this.form.get('password');

    if (!emailControl || !passwordControl || emailControl.invalid || passwordControl.invalid) {
      return;
    }

    const { email, password } = this.form.value;

    this.loading = true;
    this.message = '';
    this.isError = false;

    this.auth.login(email!, password!).subscribe({
      next: (response: any) => {
        const loggedEmail = response?.user?.email ?? email;
        this.loading = false;
        this.router.navigate(['/change-email'], {
          queryParams: { currentEmail: loggedEmail },
        });
      },
      error: () => {
        this.message = 'Credenciales inválidas. Verifica tus datos.';
        this.isError = true;
        this.loading = false;
      },
    });
  }
}
