import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ChangeEmailComponent } from './change-email';
import { AuthService } from '../../core/services/auth';

describe('ChangeEmailComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeEmailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({ currentEmail: 'usuario@estudiantes.uv.mx' }) },
        },
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
        },
        {
          provide: AuthService,
          useValue: {
            requestEmailChangeOtp: vi.fn(() => of({ message: 'ok' })),
            confirmEmailChange: vi.fn(() => of({ message: 'ok' })),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ChangeEmailComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
