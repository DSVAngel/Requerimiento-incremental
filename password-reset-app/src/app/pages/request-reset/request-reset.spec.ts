import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { RequestResetComponent } from './request-reset';
import { AuthService } from '../../core/services/auth';

describe('RequestResetComponent', () => {
  let component: RequestResetComponent;
  let fixture: ComponentFixture<RequestResetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestResetComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            requestPasswordReset: vi.fn(() => of({ message: 'ok' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RequestResetComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
