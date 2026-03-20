import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RequestResetComponent } from './pages/request-reset/request-reset';
import { ResetPasswordComponent } from './pages/reset-password/reset-password';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { ChangeEmailComponent } from './pages/change-email/change-email';

export const routes: Routes = [
  { path: '', redirectTo: 'request-reset', pathMatch: 'full' },
  { path: 'request-reset', component: RequestResetComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'change-email', component: ChangeEmailComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
