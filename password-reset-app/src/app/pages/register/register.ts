import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
})
export class RegisterComponent {
  message = '';
  isError = false;
  loading = false;
  showPassword = false;
  showConfirm = false;

  private readonly studentEmailRegex = /^[A-Z0-9._%+-]+@estudiantes\.uv\.mx$/i;
  private readonly passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;

  form = new FormBuilder().group({
    email: ['', [Validators.required, Validators.email, Validators.pattern(this.studentEmailRegex)]],
    password: ['', [Validators.required, Validators.pattern(this.passwordRegex)]],
    confirmPassword: ['', [Validators.required]],
  });

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern(this.studentEmailRegex)]],
      password: ['', [Validators.required, Validators.pattern(this.passwordRegex)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  submit() {
    if (this.form.invalid) return;

    const { email, password, confirmPassword } = this.form.value;

    if (password !== confirmPassword) {
      this.message = 'Las contraseñas no coinciden.';
      this.isError = true;
      return;
    }

    this.loading = true;
    this.message = '';
    this.isError = false;

    this.auth.register(email!, password!).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/login'], { queryParams: { register: 'ok' } });
      },
      error: (error) => {
        const backendMessage = error?.error?.message;
        this.message = Array.isArray(backendMessage)
          ? backendMessage[0]
          : backendMessage || 'No se pudo crear la cuenta. Intenta de nuevo.';
        this.isError = true;
        this.loading = false;
      },
    });
  }
}
