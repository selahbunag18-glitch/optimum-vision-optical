
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  eyeOffOutline,
  eyeOutline,
  lockClosedOutline,
  mailOutline,
  timeOutline,
} from 'ionicons/icons';

import { ApiError } from '../core/models/api.models';
import { roleHome } from '../core/role-routes';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class LoginPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly attemptsHint = signal<string | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly lockSeconds = signal(0);

  private lockTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    addIcons({
      alertCircleOutline,
      eyeOffOutline,
      eyeOutline,
      lockClosedOutline,
      mailOutline,
      timeOutline,
    });
    this.destroyRef.onDestroy(() => this.stopLockTimer());
  }

  async ngOnInit(): Promise<void> {
    const user = await this.auth.getCurrentUser();
    if (user) {
      await this.router.navigateByUrl(roleHome(user.role), {
        replaceUrl: true,
      });
    }
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  async submit(): Promise<void> {
    if (this.loading() || this.lockSeconds() > 0) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.clearErrors();
    this.loading.set(true);

    try {
      const { email, password } = this.form.getRawValue();
      const user = await this.auth.login(email.trim(), password);
      await this.router.navigateByUrl(roleHome(user.role), {
        replaceUrl: true,
      });
    } catch (err) {
      this.handleError(ApiService.toApiError(err));
    } finally {
      this.loading.set(false);
    }
  }

  private handleError(error: ApiError): void {
    switch (error.status) {
      case 0:
        this.errorMessage.set(error.message);
        break;

      case 429: {
        const seconds = error.retryAfterSeconds ?? 30;
        this.errorMessage.set(
          'Too many failed attempts. Please wait before trying again.'
        );
        this.startLockout(seconds);
        break;
      }

      case 401:
        this.errorMessage.set(error.message);
        if (error.attemptsRemaining !== undefined) {
          const n = error.attemptsRemaining;
          this.attemptsHint.set(
            `${n} attempt${n === 1 ? '' : 's'} remaining before a temporary lockout.`
          );
        }
        break;

      case 422:
        this.fieldErrors.set(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) {
          this.errorMessage.set(error.message);
        }
        break;

      default:
        this.errorMessage.set(error.message);
    }
  }

  private startLockout(seconds: number): void {
    this.stopLockTimer();
    this.lockSeconds.set(seconds);
    this.lockTimer = setInterval(() => {
      const next = this.lockSeconds() - 1;
      if (next <= 0) {
        this.lockSeconds.set(0);
        this.stopLockTimer();
        this.errorMessage.set(null);
      } else {
        this.lockSeconds.set(next);
      }
    }, 1000);
  }

  private stopLockTimer(): void {
    if (this.lockTimer !== null) {
      clearInterval(this.lockTimer);
      this.lockTimer = null;
    }
  }

  private clearErrors(): void {
    this.errorMessage.set(null);
    this.attemptsHint.set(null);
    this.fieldErrors.set({});
  }
}
