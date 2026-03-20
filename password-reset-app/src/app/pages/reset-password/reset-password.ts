import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css'],
})
export class ResetPasswordComponent {

  token!: string;
  message = '';
  isError = false;
  loading = false;

  showPassword = false;
  showConfirm  = false;

  passwordStrength: 'weak' | 'fair' | 'good' | 'strong' | '' = '';
  strengthLabel = '';

  passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;

  form!: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {
    this.form = this.fb.group({
      password:        ['', [Validators.required, Validators.pattern(this.passwordRegex)]],
      confirmPassword: ['', Validators.required]
    });

    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
    });

    this.form.get('password')!.valueChanges.subscribe(value => {
      this.evaluateStrength(value ?? '');
    });
  }

  private evaluateStrength(password: string): void {
    if (!password) {
      this.passwordStrength = '';
      this.strengthLabel = '';
      return;
    }

    let score = 0;
    if (password.length >= 8)  score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password))   score++;
    if (/[\W_]/.test(password)) score++;

    if (score <= 1) {
      this.passwordStrength = 'weak';
      this.strengthLabel = 'Muy débil';
    } else if (score === 2) {
      this.passwordStrength = 'fair';
      this.strengthLabel = 'Regular';
    } else if (score === 3) {
      this.passwordStrength = 'good';
      this.strengthLabel = 'Buena';
    } else {
      this.passwordStrength = 'strong';
      this.strengthLabel = 'Muy segura';
    }
  }

  submit() {
    if (this.form.invalid) return;

    const { password, confirmPassword } = this.form.value;

    if (password !== confirmPassword) {
      this.message = 'Las contraseñas no coinciden.';
      this.isError = true;
      return;
    }

    this.loading = true;
    this.message = '';
    this.isError = false;

    this.auth.resetPassword(this.token, password!)
      .subscribe({
        next: () => {
          this.message = 'Contraseña actualizada correctamente.';
          this.isError = false;
          this.loading = false;
          this.router.navigate(['/login'], { queryParams: { reset: 'ok' } });
        },
        error: () => {
          this.message = 'Token inválido o expirado. Solicita un nuevo enlace.';
          this.isError = true;
          this.loading = false;
        }
      });
  }
}
