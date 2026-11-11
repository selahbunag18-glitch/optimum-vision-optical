
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ViewWillEnter
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  calendarOutline,
  cartOutline,
  cashOutline,
  refreshOutline,
  alertCircleOutline,
  timeOutline,
  receiptOutline
} from 'ionicons/icons';

import {
  PatientService,
  PatientHistoryData
} from '../../core/services/patient.service';

import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-patient-history',
  standalone: true,
  templateUrl: './patient-history.page.html',
  styleUrls: ['./patient-history.page.scss'],
  imports: [
    CommonModule,
    RouterLink,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonTitle,
    IonToolbar
  ]
})
export class PatientHistoryPage implements ViewWillEnter {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly patientService = inject(PatientService);

  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal<string | null>(null);

  readonly history = signal<PatientHistoryData | null>(null);
  readonly patientId = signal<number | null>(null);

  constructor() {
    addIcons({
      arrowBackOutline,
      calendarOutline,
      cartOutline,
      cashOutline,
      refreshOutline,
      alertCircleOutline,
      timeOutline,
      receiptOutline
    });
  }

  ionViewWillEnter(): void {
    void this.loadHistory();
  }

  async loadHistory(): Promise<void> {

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('Invalid patient ID.');
      this.loading.set(false);
      return;
    }

    this.patientId.set(id);
    this.loading.set(true);
    this.error.set(null);

    try {
      const result = await this.patientService.getHistory(id);
      this.history.set(result);
    } catch (err: unknown) {
      const apiError = ApiService.toApiError(err);
      this.error.set(apiError.message);
      this.history.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async refreshHistory(event: CustomEvent): Promise<void> {
    this.refreshing.set(true);

    try {
      await this.loadHistory();
    } finally {
      this.refreshing.set(false);

      const target = event.target as HTMLIonRefresherElement;
      await target.complete();
    }
  }

  async goBack(): Promise<void> {
    const id = this.patientId();

    if (id) {
      await this.router.navigate(['/patients', id]);
    } else {
      await this.router.navigate(['/patients']);
    }
  }

  formatMoney(value: string | number): string {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return '₱0.00';
    }

    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  formatDate(value: string): string {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value + 'T00:00:00');

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  statusClass(status: string): string {
    const value = status.toLowerCase();

    if (
      value === 'completed' ||
      value === 'confirmed' ||
      value === 'paid'
    ) {
      return 'status-success';
    }

    if (
      value === 'cancelled' ||
      value === 'canceled' ||
      value === 'failed'
    ) {
      return 'status-danger';
    }

    return 'status-pending';
  }
}
