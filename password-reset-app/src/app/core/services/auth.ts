import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private readonly api = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  requestPasswordReset(email: string) {
    return this.http.post(`${this.api}/request-password-reset`, { email });
  }

  resetPassword(token: string, password: string) {
    return this.http.post(`${this.api}/reset-password`, {
      token,
      password
    });
  }

  login(email: string, password: string) {
    return this.http.post(`${this.api}/login`, {
      email,
      password,
    });
  }

  requestEmailChangeOtp(currentEmail: string, newEmail: string) {
    return this.http.post(`${this.api}/request-email-change-otp`, {
      currentEmail,
      newEmail,
    });
  }

  confirmEmailChange(currentEmail: string, newEmail: string, otp: string) {
    return this.http.post(`${this.api}/confirm-email-change`, {
      currentEmail,
      newEmail,
      otp,
    });
  }

  register(email: string, password: string) {
    return this.http.post(`${this.api}/register`, {
      email,
      password,
    });
  }
}
