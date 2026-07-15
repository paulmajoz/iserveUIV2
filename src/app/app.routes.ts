import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'teacher',
    children: [
      {
        path: 'events',
        loadComponent: () =>
          import('./features/teacher/event-list/event-list.component').then(m => m.EventListComponent),
      },
      {
        path: 'events/create',
        loadComponent: () =>
          import('./features/teacher/create-event/create-event.component').then(m => m.CreateEventComponent),
      },
      {
        path: 'events/:id/qr',
        loadComponent: () =>
          import('./features/teacher/qr-manager/qr-manager.component').then(m => m.QrManagerComponent),
      },
      {
        path: 'events/:id',
        loadComponent: () =>
          import('./features/teacher/event-detail/event-detail.component').then(m => m.EventDetailComponent),
      },
    ],
  },
  {
    path: 'student',
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/student/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'scan',
        loadComponent: () =>
          import('./features/student/scan/scan.component').then(m => m.ScanComponent),
      },
    ],
  },
  {
    // QR scan landing — public, no auth needed.
    // Re-uses the unified scan component; it skips the in-app scanner step
    // when an eventId is present in the URL.
    path: 'submit/:eventId',
    loadComponent: () =>
      import('./features/student/scan/scan.component').then(m => m.ScanComponent),
  },
  {
    // Legacy V1 QR code URL alias — old printed QR codes used /Submit-Attendance/:id
    path: 'Submit-Attendance/:eventId',
    loadComponent: () =>
      import('./features/student/scan/scan.component').then(m => m.ScanComponent),
  },
  {
    path: 'nav',
    loadComponent: () =>
      import('./features/dev/dev-nav.component').then(m => m.DevNavComponent),
  },
  { path: '**', redirectTo: '' },
];
