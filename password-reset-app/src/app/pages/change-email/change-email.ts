import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-change-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './change-email.html',
  styleUrl: './change-email.css',
})
export class ChangeEmailComponent {
  message = '';
  isError = false;
  loadingRequestOtp = false;
  loadingConfirm = false;
  otpRequested = false;

  private readonly studentEmailRegex = /^[A-Z0-9._%+-]+@estudiantes\.uv\.mx$/i;

  form = new FormBuilder().group({
    currentEmail: ['', [Validators.required, Validators.email]],
    newEmail: ['', [Validators.required, Validators.email, Validators.pattern(this.studentEmailRegex)]],
    otp: ['', [Validators.pattern(/^\d{6}$/)]],
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
  ) {
    this.form = this.fb.group({
      currentEmail: ['', [Validators.required, Validators.email]],
      newEmail: ['', [Validators.required, Validators.email, Validators.pattern(this.studentEmailRegex)]],
      otp: ['', [Validators.pattern(/^\d{6}$/)]],
    });

    this.route.queryParams.subscribe((params) => {
      if (params['currentEmail']) {
        this.form.patchValue({ currentEmail: params['currentEmail'] });
      }
    });
  }

  requestOtp() {
    const currentEmail = this.form.get('currentEmail')?.value?.trim();
    const newEmail = this.form.get('newEmail')?.value?.trim();

    if (!currentEmail || !newEmail) {
      this.message = 'Debes indicar correo actual y nuevo correo.';
      this.isError = true;
      return;
    }

    if (currentEmail === newEmail) {
      this.message = 'El nuevo correo debe ser diferente al actual.';
      this.isError = true;
      return;
    }

    this.loadingRequestOtp = true;
    this.message = '';
    this.isError = false;

    this.auth.requestEmailChangeOtp(currentEmail, newEmail).subscribe({
      next: (response: any) => {
        const expires = Number(response?.otpExpiresInSeconds) || 300;
        this.message = `OTP enviado al nuevo correo. Expira en ${expires} segundos.`;
        this.isError = false;
        this.otpRequested = true;
        this.loadingRequestOtp = false;
      },
      error: (error) => {
        const backendMessage = error?.error?.message;
        this.message = Array.isArray(backendMessage)
          ? backendMessage[0]
          : backendMessage || 'No se pudo enviar OTP para el cambio de correo.';
        this.isError = true;
        this.loadingRequestOtp = false;
      },
    });
  }

  confirmChange() {
    const currentEmail = this.form.get('currentEmail')?.value?.trim();
    const newEmail = this.form.get('newEmail')?.value?.trim();
    const otp = this.form.get('otp')?.value?.trim();

    if (!currentEmail || !newEmail || !otp) {
      this.message = 'Debes completar correo actual, nuevo correo y OTP.';
      this.isError = true;
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      this.message = 'El OTP debe tener 6 dígitos.';
      this.isError = true;
      return;
    }

    this.loadingConfirm = true;
    this.message = '';
    this.isError = false;

    this.auth.confirmEmailChange(currentEmail, newEmail, otp).subscribe({
      next: () => {
        this.loadingConfirm = false;
        this.router.navigate(['/login'], {
          queryParams: { emailChanged: 'ok' },
        });
      },
      error: (error) => {
        const backendMessage = error?.error?.message;
        this.message = Array.isArray(backendMessage)
          ? backendMessage[0]
          : backendMessage || 'No se pudo confirmar el cambio de correo.';
        this.isError = true;
        this.loadingConfirm = false;
      },
    });
  }
}
