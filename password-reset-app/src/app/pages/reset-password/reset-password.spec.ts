import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ResetPasswordComponent } from './reset-password';
import { AuthService } from '../../core/services/auth';

describe('ResetPassword', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({ token: 'test-token' }) },
        },
        {
          provide: AuthService,
          useValue: {
            resetPassword: vi.fn(() => of({ message: 'ok' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
