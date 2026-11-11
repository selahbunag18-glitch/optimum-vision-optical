
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import {
  Router,
  RouterLink
} from '@angular/router';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonMenuButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  peopleOutline,
  calendarOutline,
  eyeOutline,
  cubeOutline,
  cartOutline,
  receiptOutline,
  barChartOutline,
  logOutOutline,
  refreshOutline,
  addCircleOutline,
  personCircleOutline,
  alertCircleOutline,
  timeOutline,
  menuOutline,
  calendarClearOutline,
  glassesOutline,
  chevronForwardOutline,
  shieldCheckmarkOutline,
  mailOutline,
  informationCircleOutline
} from 'ionicons/icons';

import { AuthUser } from '../core/models/api.models';
import { AuthService } from '../core/services/auth.service';

interface DashboardModule {
  title: string;
  description: string;
  icon: string;
  route?: string;
  ownerOnly?: boolean;
  comingSoon?: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonMenuButton,
    IonIcon,
    IonSpinner
  ]
})
export class HomePage implements OnInit {

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = signal<AuthUser | null>(null);
  readonly loading = signal(true);
  readonly loggingOut = signal(false);

  readonly modules: DashboardModule[] = [
    {
      title: 'Patient Management',
      description: 'Manage patient records and information.',
      icon: 'people-outline',
      route: '/patients'
    },
    {
      title: 'Appointments',
      description: 'Manage bookings and appointment schedules.',
      icon: 'calendar-outline',
      route: '/appointments'
    },
    {
      title: 'Eye Examination',
      description: 'Access patient examinations and prescriptions.',
      icon: 'eye-outline',
      route: '/patients'
    },
    {
      title: 'Inventory Management',
      description: 'Manage optical products and stock.',
      icon: 'cube-outline',
      route: '/inventory'
    },
    {
      title: 'Sales Management',
      description: 'Manage sales transactions and payments.',
      icon: 'cart-outline',
      route: '/sales'
    },
    {
      title: 'Sales Reports',
      description: 'View clinic sales reports and analytics.',
      icon: 'bar-chart-outline',
      route: '/sales/reports',
      ownerOnly: true
    }
  ];

  readonly patientModules: DashboardModule[] = [
    {
      title: 'Book Appointment',
      description:
        'Schedule your next eye consultation using available clinic time slots.',
      icon: 'calendar-outline',
      route: '/appointments/book'
    },
    {
      title: 'My Appointments',
      description:
        'View your upcoming and previous appointment bookings.',
      icon: 'calendar-clear-outline',
      comingSoon: true
    },
    {
      title: 'Optical Products',
      description:
        'Browse available eyeglass frames, contact lenses and optical products.',
      icon: 'glasses-outline',
      comingSoon: true
    },
    {
      title: 'My Profile',
      description:
        'View your registered patient account information.',
      icon: 'person-circle-outline',
      route: '/patient'
    }
  ];

  constructor() {
    addIcons({
      peopleOutline,
      calendarOutline,
      eyeOutline,
      cubeOutline,
      cartOutline,
      receiptOutline,
      barChartOutline,
      logOutOutline,
      refreshOutline,
      addCircleOutline,
      personCircleOutline,
      alertCircleOutline,
      timeOutline,
      menuOutline,
      calendarClearOutline,
      glassesOutline,
      chevronForwardOutline,
      shieldCheckmarkOutline,
      mailOutline,
      informationCircleOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadUser();
  }

  async loadUser(): Promise<void> {
    this.loading.set(true);

    try {
      const currentUser = await this.auth.getCurrentUser();

      if (!currentUser) {
        this.user.set(null);

        await this.router.navigateByUrl('/login', {
          replaceUrl: true
        });
        return;
      }

      if (
        currentUser.role !== 'owner' &&
        currentUser.role !== 'staff' &&
        currentUser.role !== 'patient'
      ) {
        this.user.set(null);

        await this.router.navigateByUrl('/login', {
          replaceUrl: true
        });
        return;
      }

      this.user.set(currentUser);

      const currentPath = this.router.url.split('?')[0];

      const expectedPath =
        currentUser.role === 'owner'
          ? '/owner'
          : currentUser.role === 'staff'
            ? '/staff'
            : '/patient';

      if (
        ['/owner', '/staff', '/patient'].includes(currentPath) &&
        currentPath !== expectedPath
      ) {
        await this.router.navigateByUrl(expectedPath, {
          replaceUrl: true
        });
      }

    } catch {
      this.user.set(null);

      await this.router.navigateByUrl('/login', {
        replaceUrl: true
      });

    } finally {
      this.loading.set(false);
    }
  }

  get isPatient(): boolean {
    return this.user()?.role === 'patient';
  }

  get dashboardTitle(): string {
    const role = this.user()?.role;

    if (role === 'owner') {
      return 'Clinic Owner Dashboard';
    }

    if (role === 'staff') {
      return 'Clinic Staff Dashboard';
    }

    return 'Patient Dashboard';
  }

  get visibleModules(): DashboardModule[] {
    const isOwner = this.user()?.role === 'owner';

    return this.modules.filter(
      (module) => !module.ownerOnly || isOwner
    );
  }

  get today(): string {
    return new Date().toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Manila'
    });
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);

    try {
      await this.auth.logout();
    } catch {
      // Preserve existing logout behavior.
    } finally {
      this.loggingOut.set(false);
    }

    this.user.set(null);

    await this.router.navigateByUrl('/login', {
      replaceUrl: true
    });
  }
}
