import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { EventsService, CreateEventPayload, IEvent } from '../../../core/services/events.service';
import { UrlContextService } from '../../../core/services/url-context.service';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, MatProgressSpinnerModule, HeaderComponent],
  template: `
    <app-header></app-header>

    <main class="max-w-2xl mx-auto p-6">
      <div class="flex items-center gap-3 mb-6">
        <button (click)="router.navigate(['/teacher/events'], { queryParams: qp })"
                class="text-gray-400 hover:text-gray-600">
          ← Back
        </button>
        <h2 class="text-2xl font-bold text-gray-800">Create Event</h2>
      </div>

      <form (ngSubmit)="submit()" #form="ngForm" class="space-y-6">

        <!-- Basic Details -->
        <div class="card space-y-4">
          <h3 class="font-semibold text-gray-700 border-b pb-2">Event Details</h3>

          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Event Name *</label>
            <input [(ngModel)]="payload.eventName" name="eventName" required
                   class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                   placeholder="e.g. Beach Cleanup 2024" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">Event Type</label>
              <select [(ngModel)]="payload.eventTypeId" name="eventTypeId"
                      class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">— Select Type —</option>
                <option *ngFor="let t of eventTypes" [value]="t._id">{{ t.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">Category</label>
              <select [(ngModel)]="payload.eventCategoryId" name="eventCategoryId"
                      class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">— Select Category —</option>
                <option *ngFor="let c of eventCategories" [value]="c._id">{{ c.name }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- QR Mode -->
        <div class="card space-y-3">
          <h3 class="font-semibold text-gray-700 border-b pb-2">QR Code Mode</h3>
          <div class="grid grid-cols-2 gap-3">
            <button type="button"
                    (click)="payload.qrMode = 'once-off'"
                    class="p-4 rounded-lg border-2 text-left transition-colors"
                    [class.border-primary]="payload.qrMode === 'once-off'"
                    [class.border-gray-200]="payload.qrMode !== 'once-off'">
              <p class="font-medium">Single Scan</p>
              <p class="text-xs text-gray-500">One QR for attendance</p>
            </button>
            <button type="button"
                    (click)="payload.qrMode = 'in-out'"
                    class="p-4 rounded-lg border-2 text-left transition-colors"
                    [class.border-primary]="payload.qrMode === 'in-out'"
                    [class.border-gray-200]="payload.qrMode !== 'in-out'">
              <p class="font-medium">Sign In + Sign Out</p>
              <p class="text-xs text-gray-500">Two QRs — tracks duration</p>
            </button>
          </div>
        </div>

        <!-- Hours Mode -->
        <div class="card space-y-3">
          <h3 class="font-semibold text-gray-700 border-b pb-2">Hours Tracking</h3>
          <div class="grid grid-cols-2 gap-3">
            <button *ngFor="let mode of hourModes" type="button"
                    (click)="payload.hourMode = mode.value"
                    class="p-3 rounded-lg border-2 text-left transition-colors"
                    [class.border-primary]="payload.hourMode === mode.value"
                    [class.border-gray-200]="payload.hourMode !== mode.value">
              <p class="font-medium text-sm">{{ mode.label }}</p>
              <p class="text-xs text-gray-500">{{ mode.desc }}</p>
            </button>
          </div>

          <div *ngIf="payload.hourMode === 'fixed'" class="flex items-center gap-3">
            <label class="text-sm font-medium text-gray-600 whitespace-nowrap">Fixed hours per attendance:</label>
            <input type="number" [(ngModel)]="payload.fixedHours" name="fixedHours" min="0" step="0.5"
                   class="w-24 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" />
          </div>

          <div *ngIf="payload.hourMode === 'volume'" class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">Unit Name</label>
              <input [(ngModel)]="payload.volumeUnitName" name="volumeUnitName"
                     placeholder="e.g. bags collected"
                     class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">Units → Hours</label>
              <input type="number" [(ngModel)]="payload.volumeConversion" name="volumeConversion" min="0" step="0.1"
                     class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" />
            </div>
          </div>
        </div>

        <!-- Points -->
        <div class="card space-y-3">
          <h3 class="font-semibold text-gray-700 border-b pb-2">Points</h3>
          <label class="flex items-center gap-3 cursor-pointer">
            <div class="relative">
              <input type="checkbox" [(ngModel)]="payload.pointsEnabled" name="pointsEnabled" class="sr-only" />
              <div class="w-10 h-5 rounded-full transition-colors"
                   [class.bg-primary]="payload.pointsEnabled" [class.bg-gray-200]="!payload.pointsEnabled"></div>
              <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                   [class.translate-x-5]="payload.pointsEnabled"></div>
            </div>
            <span class="text-sm font-medium text-gray-700">Award points per scan</span>
          </label>

          <div *ngIf="payload.pointsEnabled" class="flex items-center gap-3">
            <label class="text-sm font-medium text-gray-600">Points per scan:</label>
            <input type="number" [(ngModel)]="payload.pointsValue" name="pointsValue" min="0"
                   class="w-24 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" />
          </div>
        </div>

        <!-- Capture Options -->
        <div class="card space-y-3">
          <h3 class="font-semibold text-gray-700 border-b pb-2">Additional Capture</h3>
          <div class="space-y-2">
            <label *ngFor="let opt of captureOpts" class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox"
                     [(ngModel)]="payload.captureOptions[opt.key]"
                     [name]="opt.key"
                     class="w-4 h-4 rounded" />
              <div>
                <p class="text-sm font-medium text-gray-700">{{ opt.label }}</p>
                <p class="text-xs text-gray-500">{{ opt.desc }}</p>
              </div>
            </label>
          </div>
        </div>

        <button type="submit" [disabled]="loading || !payload.eventName"
                class="w-full btn-primary py-3 text-base flex items-center justify-center gap-2 disabled:opacity-50">
          <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
          {{ loading ? 'Creating...' : 'Create Event & Generate QR Codes' }}
        </button>
      </form>
    </main>
  `,
})
export class CreateEventComponent implements OnInit {
  loading = false;
  eventTypes: { _id: string; name: string }[] = [];
  eventCategories: { _id: string; name: string }[] = [];

  payload: CreateEventPayload = {
    eventName: '',
    school: '',
    teacher: '',
    teacherEmail: '',
    eventTypeId: '',
    eventCategoryId: '',
    qrMode: 'once-off',
    hourMode: 'in-out',
    fixedHours: 1,
    volumeUnitName: '',
    volumeConversion: 1,
    pointsEnabled: false,
    pointsValue: 0,
    captureOptions: { hasGeolocate: false, hasDescription: false, hasReflection: false },
  };

  hourModes = [
    { value: 'in-out', label: 'In/Out Duration', desc: 'Calculate from sign-in to sign-out' },
    { value: 'fixed', label: 'Fixed Hours', desc: 'Set a fixed hours value per scan' },
    { value: 'volume', label: 'Volume-based', desc: 'Units submitted × conversion rate' },
    { value: 'disabled', label: 'No Hours', desc: 'Track attendance only' },
  ] as const;

  captureOpts = [
    { key: 'hasDescription' as const, label: 'Description', desc: 'Student describes their contribution' },
    { key: 'hasReflection' as const, label: 'Reflection', desc: 'Student writes a reflection' },
    { key: 'hasGeolocate' as const, label: 'Geolocation', desc: 'Capture GPS location on scan' },
  ];

  get qp() {
    const c = this.ctx.context;
    return c ? { email: c.email, role: c.role, schoolId: c.schoolId } : {};
  }

  constructor(
    private eventsService: EventsService,
    public ctx: UrlContextService,
    public router: Router,
    private route: ActivatedRoute,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    const c = this.ctx.context;
    if (c) {
      this.payload.school = String(c.schoolId);
      this.payload.teacher = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email;
      this.payload.teacherEmail = c.email;
    }
    const schoolId = this.ctx.schoolId;
    this.eventsService.getEventTypes(schoolId).subscribe(t => (this.eventTypes = t));
    this.eventsService.getEventCategories(schoolId).subscribe(c => (this.eventCategories = c));
  }

  submit() {
    if (!this.payload.eventName) return;
    this.loading = true;

    const dto = { ...this.payload };
    if (!dto.eventTypeId) delete dto.eventTypeId;
    if (!dto.eventCategoryId) delete dto.eventCategoryId;

    this.eventsService.createEvent(dto).subscribe({
      next: (event: IEvent) => {
        this.loading = false;
        this.snack.open('Event created! QR codes generated.', 'Close', { duration: 3000 });
        this.router.navigate(['/teacher/events', event._id, 'qr'], { queryParams: this.qp });
      },
      error: () => {
        this.loading = false;
        this.snack.open('Failed to create event. Please try again.', 'Close', { duration: 4000 });
      },
    });
  }
}
