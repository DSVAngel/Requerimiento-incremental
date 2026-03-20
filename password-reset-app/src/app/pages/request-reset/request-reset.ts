import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-request-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './request-reset.html',
  styleUrls: ['./request-reset.css'],
})
export class RequestResetComponent {

  message = '';
  isError = false;
  loading = false;

  private readonly studentEmailRegex = /^[A-Z0-9._%+-]+@estudiantes\.uv\.mx$/i;

  form = new FormBuilder().group({
    email: ['', [Validators.required, Validators.email, Validators.pattern(this.studentEmailRegex)]]
  });

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern(this.studentEmailRegex)]]
    });
  }

  submit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.message = '';
    this.isError = false;

    this.auth.requestPasswordReset(this.form.value.email!)
      .subscribe({
        next: () => {
          this.message = 'Si el correo existe, recibirás un enlace en breve.';
          this.isError = false;
          this.loading = false;
        },
        error: () => {
          this.message = 'Ocurrió un error. Por favor intenta de nuevo.';
          this.isError = true;
          this.loading = false;
        }
      });
  }
}
