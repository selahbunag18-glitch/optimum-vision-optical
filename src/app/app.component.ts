
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import {
  Router,
  NavigationEnd,
  RouterLink
} from '@angular/router';

import {
  IonApp,
  IonRouterOutlet,
  IonMenu,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonMenuToggle,
  IonButton,
  IonMenuButton,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  MenuController
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  eyeOutline,
  gridOutline,
  peopleOutline,
  calendarOutline,
  cubeOutline,
  cartOutline,
  barChartOutline,
  timeOutline,
  layersOutline,
  logOutOutline,
  menuOutline,
  personCircleOutline,
  closeOutline
} from 'ionicons/icons';

import { filter } from 'rxjs/operators';

import { AuthService } from './core/services/auth.service';
import { AuthUser } from './core/models/api.models';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  ownerOnly?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    IonApp,
    IonRouterOutlet,
    IonMenu,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonMenuToggle,
    IonButton,
    IonMenuButton,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    RouterLink
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  /* =====================================
     SERVICES
  ===================================== */

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly menu = inject(MenuController);

  /* =====================================
     SIGNALS
  ===================================== */

  readonly user = signal<AuthUser | null>(null);
  readonly showNavigation = signal(false);
  readonly currentUrl = signal('');

  /* =====================================
     NAVIGATION ITEMS
  ===================================== */

  readonly navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      icon: 'grid-outline',
      route: '/home'
    },
    {
      label: 'Patients',
      icon: 'people-outline',
      route: '/patients'
    },
    {
      label: 'Appointments',
      icon: 'calendar-outline',
      route: '/appointments'
    },
    {
      label: 'Appointment Slots',
      icon: 'time-outline',
      route: '/appointments/slots'
    },
    {
      label: 'Inventory',
      icon: 'cube-outline',
      route: '/inventory'
    },
    {
      label: 'Inventory Batches',
      icon: 'layers-outline',
      route: '/inventory/batches'
    },
    {
      label: 'Sales',
      icon: 'cart-outline',
      route: '/sales'
    },
    {
      label: 'Sales Reports',
      icon: 'bar-chart-outline',
      route: '/sales/reports',
      ownerOnly: true
    }
  ];

  /* =====================================
     ICON REGISTRATION
  ===================================== */

  constructor() {
    addIcons({
      personCircleOutline,
      closeOutline,
      logOutOutline,
      eyeOutline,
      gridOutline,
      peopleOutline,
      calendarOutline,
      cubeOutline,
      cartOutline,
      barChartOutline,
      timeOutline,
      layersOutline,
      menuOutline
    });
  }

  /* =====================================
     INITIALIZATION
  ===================================== */

  async ngOnInit(): Promise<void> {
    await this.updateNavigation();

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd
        )
      )
      .subscribe(async (event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        await this.updateNavigation();
      });
  }

  /* =====================================
     UPDATE NAVIGATION
  ===================================== */

  async updateNavigation(): Promise<void> {
    const url = this.router.url;

    this.currentUrl.set(url);

    if (
      url.startsWith('/login') ||
      url.startsWith('/register') ||
      (
        url.startsWith('/patient') &&
        !url.startsWith('/patients')
      )
    ) {
      this.user.set(null);
      this.showNavigation.set(false);

      await this.menu.close('clinic-menu');
      return;
    }

    try {
      const currentUser = await this.auth.getCurrentUser();

      this.user.set(currentUser);

      const canAccessNavigation =
        currentUser?.role === 'owner' ||
        currentUser?.role === 'staff';

      this.showNavigation.set(canAccessNavigation);

      if (!canAccessNavigation) {
        await this.menu.close('clinic-menu');
      }

    } catch {
      this.user.set(null);
      this.showNavigation.set(false);

      await this.menu.close('clinic-menu');
    }
  }

  /* =====================================
     VISIBLE NAVIGATION ITEMS
  ===================================== */

  get visibleNavigationItems(): NavigationItem[] {
    const isOwner = this.user()?.role === 'owner';

    return this.navigationItems.filter(
      item => !item.ownerOnly || isOwner
    );
  }

  /* =====================================
     DASHBOARD ROUTE
  ===================================== */

  get dashboardRoute(): string {
    return this.user()?.role === 'owner'
      ? '/owner'
      : '/staff';
  }

  /* =====================================
     ACTIVE NAVIGATION
  ===================================== */

  isActive(route: string): boolean {
    const current = this.currentUrl();

    if (route === '/home') {
      return (
        current === '/home' ||
        current === '/owner' ||
        current === '/staff'
      );
    }

    return (
      current === route ||
      current.startsWith(route + '/')
    );
  }

  /* =====================================
     OPEN SIDEBAR
  ===================================== */

  async openClinicMenu(): Promise<void> {
    if (!this.showNavigation()) {
      return;
    }

    await this.menu.open('clinic-menu');
  }

  /* =====================================
     CLOSE SIDEBAR
  ===================================== */

  async closeClinicMenu(): Promise<void> {
    await this.menu.close('clinic-menu');
  }

  /* =====================================
     LOGOUT
  ===================================== */

  async logout(): Promise<void> {
    await this.menu.close('clinic-menu');

    try {
      await this.auth.logout();
    } catch {
      // Local session may already be cleared.
    }

    this.user.set(null);
    this.showNavigation.set(false);

    await this.router.navigateByUrl('/login', {
      replaceUrl: true
    });
  }
}
