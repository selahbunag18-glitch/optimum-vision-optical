
import {
  Component,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ViewWillEnter
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  arrowBackOutline,
  calendarOutline,
  timeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  refreshOutline,
  saveOutline
} from 'ionicons/icons';

import {
  SlotService,
  AvailableDate,
  AppointmentSlot
} from '../../core/services/slot.service';

import {
  AppointmentService,
  Appointment
} from '../../core/services/appointment.service';

import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-appointment-booking',
  standalone: true,
  templateUrl: './appointment-booking.page.html',
  styleUrls: ['./appointment-booking.page.scss'],
  imports: [
    CommonModule,
    RouterLink,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonSpinner,
    IonTextarea,
    IonTitle,
    IonToolbar
  ]
})
export class AppointmentBookingPage implements ViewWillEnter {

  private readonly slotService = inject(SlotService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly router = inject(Router);

  readonly loadingDates = signal(true);
  readonly loadingSlots = signal(false);
  readonly booking = signal(false);

  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  readonly availableDates = signal<AvailableDate[]>([]);
  readonly availableSlots = signal<AppointmentSlot[]>([]);

  readonly selectedDate = signal('');
  readonly selectedSlotId = signal<number | null>(null);
  readonly reason = signal('');

  readonly bookedAppointment = signal<Appointment | null>(null);

  constructor() {
    addIcons({
      arrowBackOutline,
      calendarOutline,
      timeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      refreshOutline,
      saveOutline
    });
  }

  ionViewWillEnter(): void {
    if (!this.success()) {
      void this.loadAvailableDates();
    }
  }

  async loadAvailableDates(): Promise<void> {
    this.loadingDates.set(true);
    this.error.set(null);

    try {
      const result = await this.slotService.getAvailableDates();

      this.availableDates.set(result.dates);

      // Clear selected date if no longer available
      const dateStillAvailable = result.dates.some(
        item => item.date === this.selectedDate()
      );

      if (!dateStillAvailable) {
        this.selectedDate.set('');
        this.selectedSlotId.set(null);
        this.availableSlots.set([]);
      }

    } catch (err: unknown) {
      const apiError = ApiService.toApiError(err);
      this.error.set(apiError.message);
      this.availableDates.set([]);
      this.availableSlots.set([]);
      this.selectedDate.set('');
      this.selectedSlotId.set(null);

    } finally {
      this.loadingDates.set(false);
    }
  }

  async selectDate(date: string): Promise<void> {
    if (
      this.booking() ||
      this.loadingSlots() ||
      !this.availableDates().some(item => item.date === date)
    ) {
      return;
    }

    this.selectedDate.set(date);
    this.selectedSlotId.set(null);
    this.availableSlots.set([]);
    this.error.set(null);
    this.loadingSlots.set(true);

    try {
      const result = await this.slotService.getAvailableSlots(date);

      // Prevent outdated requests from replacing the current date
      if (this.selectedDate() === date) {
        this.availableSlots.set(result.slots);
      }

    } catch (err: unknown) {
      if (this.selectedDate() === date) {
        const apiError = ApiService.toApiError(err);
        this.error.set(apiError.message);
      }

    } finally {
      this.loadingSlots.set(false);
    }
  }

  selectSlot(slotId: number): void {
    if (this.booking()) {
      return;
    }

    const slot = this.availableSlots().find(
      item => item.id === slotId && item.is_available
    );

    if (!slot) {
      return;
    }

    this.selectedSlotId.set(slotId);
    this.error.set(null);
  }

  onReasonChange(value: string | null | undefined): void {
    this.reason.set(String(value ?? ''));
  }

  get canBook(): boolean {
    return (
      !this.booking() &&
      !this.loadingDates() &&
      !this.loadingSlots() &&
      !this.success() &&
      this.selectedDate() !== '' &&
      this.selectedSlotId() !== null &&
      this.reason().trim().length > 0
    );
  }

  async bookAppointment(): Promise<void> {
    if (!this.canBook) {
      return;
    }

    const slotId = this.selectedSlotId();

    if (slotId === null) {
      return;
    }

    this.booking.set(true);
    this.error.set(null);

    try {
      const appointment = await this.appointmentService.book(
        slotId,
        this.reason().trim()
      );

      this.bookedAppointment.set(appointment);
      this.success.set(true);

    } catch (err: unknown) {
      const apiError = ApiService.toApiError(err);

      this.error.set(apiError.message);

      // Refresh availability if the selected slot was already booked
      if (apiError.status === 409 || apiError.status === 422) {
        const date = this.selectedDate();

        this.selectedSlotId.set(null);

        if (date) {
          await this.refreshSlots(date);
        }
      }

    } finally {
      this.booking.set(false);
    }
  }

  async refreshSlots(date: string): Promise<void> {
    this.loadingSlots.set(true);

    try {
      const result = await this.slotService.getAvailableSlots(date);

      if (this.selectedDate() === date) {
        this.availableSlots.set(result.slots);
      }

    } catch (err: unknown) {
      const apiError = ApiService.toApiError(err);
      this.error.set(apiError.message);

    } finally {
      this.loadingSlots.set(false);
    }
  }

  async bookAnother(): Promise<void> {
    this.success.set(false);
    this.bookedAppointment.set(null);
    this.selectedDate.set('');
    this.selectedSlotId.set(null);
    this.availableSlots.set([]);
    this.reason.set('');
    this.error.set(null);

    await this.loadAvailableDates();
  }

  async goToDashboard(): Promise<void> {
    await this.router.navigate(['/patient']);
  }

  formatDate(value: string): string {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
