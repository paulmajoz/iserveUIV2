import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { QrDisplayComponent } from '../../../shared/components/qr-display/qr-display.component';
import { EventsService, IEvent } from '../../../core/services/events.service';
import { UrlContextService } from '../../../core/services/url-context.service';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    HeaderComponent,
    QrDisplayComponent,
  ],
  template: `
    <app-header></app-header>

    <main class="max-w-xl mx-auto px-4 py-4 pb-12">

      <!-- ═══════════════════════════════════════════════
           FORM VIEW
           ═══════════════════════════════════════════════ -->
      <ng-container *ngIf="view === 'form'">

        <!-- Title row: back + heading + clear -->
        <div class="flex items-center gap-3 my-4">
          <button mat-icon-button
                  (click)="router.navigate(['/teacher/events'], { queryParams: qp })"
                  aria-label="Back to events">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h2 class="text-base font-semibold text-gray-900 flex-1">Create Event</h2>
          <button mat-stroked-button type="button" (click)="clearForm()">Clear</button>
        </div>

        <!-- API error banner -->
        <div *ngIf="apiError" class="error-banner mb-5">
          <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
          <div>
            <p class="font-semibold">Could not create event</p>
            <p class="mt-0.5 text-red-600">{{ apiError }}</p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>

          <!-- ── Event Details ──────────────────────────── -->
          <div class="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Event Details</p>

            <!-- Event Name -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Event Name</mat-label>
              <input matInput formControlName="eventName" placeholder="e.g. Beach Cleanup 2025">
              <mat-error *ngIf="form.get('eventName')?.hasError('required')">Event name is required.</mat-error>
              <mat-error *ngIf="form.get('eventName')?.hasError('minlength')">Must be at least 3 characters.</mat-error>
            </mat-form-field>

            <!-- Type + Category — always 2 columns, min-width 0 prevents overflow -->
            <div class="grid grid-cols-2 gap-3">
              <mat-form-field appearance="outline" class="w-full min-w-0">
                <mat-label>Type</mat-label>
                <mat-select formControlName="eventTypeId">
                  <mat-option value="">None</mat-option>
                  <mat-option *ngFor="let t of eventTypes" [value]="t._id">{{ t.name }}</mat-option>
                </mat-select>
                <mat-error *ngIf="typesError">{{ typesError }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full min-w-0">
                <mat-label>Category</mat-label>
                <mat-select formControlName="eventCategoryId">
                  <mat-option value="">None</mat-option>
                  <mat-option *ngFor="let c of eventCategories" [value]="c._id">{{ c.name }}</mat-option>
                </mat-select>
                <mat-error *ngIf="catsError">{{ catsError }}</mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- ── Hours Tracking ─────────────────────────── -->
          <div class="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Hours Tracking</p>

            <!-- 2 × 2 hour mode button-toggle -->
            <mat-button-toggle-group formControlName="hourMode" class="hour-mode-group">
              <mat-button-toggle *ngFor="let mode of hourModes" [value]="mode.value">
                <p class="text-xs font-semibold text-gray-800 leading-tight">{{ mode.label }}</p>
                <p class="text-xs text-gray-400 mt-0.5 leading-tight whitespace-normal">{{ mode.desc }}</p>
              </mat-button-toggle>
            </mat-button-toggle-group>

            <!-- Fixed hours -->
            <div *ngIf="form.get('hourMode')?.value === 'fixed'" class="grid grid-cols-2 gap-3">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Fixed hours per scan</mat-label>
                <input matInput type="number" formControlName="fixedHours" min="0.5" step="0.5">
                <mat-error *ngIf="form.get('fixedHours')?.invalid">At least 0.5 hours.</mat-error>
                <mat-hint>e.g. 1 = one hour</mat-hint>
              </mat-form-field>
            </div>

            <!-- Volume -->
            <div *ngIf="form.get('hourMode')?.value === 'volume'" class="space-y-3">

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Unit name</mat-label>
                <input matInput formControlName="volumeUnitName"
                       placeholder="e.g. bags collected, km walked">
                <mat-error *ngIf="form.get('volumeUnitName')?.invalid && form.get('volumeUnitName')?.touched">
                  Unit name is required.
                </mat-error>
              </mat-form-field>

              <!-- Conversion rate — responsive row -->
              <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversion Rate</p>
                <div class="grid grid-cols-2 gap-3 items-end">
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Units</mat-label>
                    <input matInput type="number" formControlName="volumeUnitsInput" min="0.01" step="any">
                    <mat-hint>{{ form.get('volumeUnitName')?.value || 'units' }}</mat-hint>
                    <mat-error *ngIf="form.get('volumeUnitsInput')?.invalid && form.get('volumeUnitsInput')?.touched">Must be &gt; 0.</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>= Hours</mat-label>
                    <input matInput type="number" formControlName="volumeHoursInput" min="0.01" step="any">
                    <mat-hint>hour(s)</mat-hint>
                    <mat-error *ngIf="form.get('volumeHoursInput')?.invalid && form.get('volumeHoursInput')?.touched">Must be &gt; 0.</mat-error>
                  </mat-form-field>
                </div>
                <p class="text-xs text-gray-400">
                  Preview: 1 {{ form.get('volumeUnitName')?.value || 'unit' }} = <strong>{{ conversionPreview }}</strong>
                </p>
              </div>

            </div>
          </div>

          <!-- ── Points ─────────────────────────────────── -->
          <div class="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Points</p>

            <div class="flex items-center justify-between gap-4 py-1">
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-800">Award points per scan</p>
                <p class="text-xs text-gray-400 mt-0.5">Students earn points each time they scan in</p>
              </div>
              <mat-slide-toggle formControlName="pointsEnabled"></mat-slide-toggle>
            </div>

            <div *ngIf="form.get('pointsEnabled')?.value">
              <mat-form-field appearance="outline" style="max-width:200px">
                <mat-label>Points per scan</mat-label>
                <input matInput type="number" formControlName="pointsValue" min="1">
                <mat-error *ngIf="form.get('pointsValue')?.invalid">Must be at least 1 point.</mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- ── Capture Options ────────────────────────── -->
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Additional Capture</p>
            <div class="space-y-1">
              <div *ngFor="let opt of captureOpts"
                   class="flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="text-lg w-7 text-center flex-shrink-0">{{ opt.emoji }}</span>
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-800">{{ opt.label }}</p>
                    <p class="text-xs text-gray-400">{{ opt.desc }}</p>
                  </div>
                </div>
                <mat-slide-toggle [formControlName]="opt.key"></mat-slide-toggle>
              </div>
            </div>
          </div>

          <!-- ── Submit ─────────────────────────────────── -->
          <button mat-flat-button type="submit" [disabled]="loading"
                  style="width:100%; height:44px; font-size:0.875rem; font-weight:600;">
            <span class="flex items-center justify-center gap-2">
              <mat-spinner *ngIf="loading" diameter="18"></mat-spinner>
              {{ loading ? 'Creating event...' : 'Create Event & Generate QR Codes' }}
            </span>
          </button>

        </form>
      </ng-container>

      <!-- ═══════════════════════════════════════════════
           QR SUCCESS VIEW
           ═══════════════════════════════════════════════ -->
      <ng-container *ngIf="view === 'qr' && createdEvent">

        <!-- Title row: back + heading + view-event -->
        <div class="flex items-center gap-3 my-4">
          <button mat-icon-button (click)="view = 'form'" aria-label="Back to form">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="flex-1 min-w-0">
            <h2 class="text-base font-semibold text-gray-900">QR Codes Ready</h2>
            <p class="text-xs text-gray-500 truncate">{{ createdEvent.eventName }}</p>
          </div>
          <button mat-stroked-button
                  (click)="router.navigate(['/teacher/events', createdEvent._id], { queryParams: qp })">
            View Event
          </button>
        </div>

        <!-- Success banner -->
        <div class="success-banner mb-6">
          <mat-icon class="shrink-0 text-green-600">check_circle</mat-icon>
          <div>
            <p class="font-semibold">Event created successfully!</p>
            <p class="mt-0.5 text-green-700">
              {{ createdEvent.qrMode === 'in-out'
                  ? 'Two QR codes generated — one for Sign In, one for Sign Out.'
                  : 'One QR code generated — students scan once to attend.' }}
            </p>
          </div>
        </div>

        <!-- QR code card(s) -->
        <div class="flex flex-wrap gap-6 justify-center">

          <app-qr-display
            *ngIf="createdEvent.qrCodeIn"
            [qrDataUrl]="createdEvent.qrCodeIn"
            [eventName]="createdEvent.eventName"
            [label]="createdEvent.qrMode === 'once-off' ? 'SCAN TO ATTEND' : 'SIGN IN'"
            direction="in"
            (onDownload)="downloadPdf('in')"
            (onEmail)="sendEmail()"
          ></app-qr-display>

          <app-qr-display
            *ngIf="createdEvent.qrMode === 'in-out' && createdEvent.qrCodeOut"
            [qrDataUrl]="createdEvent.qrCodeOut"
            [eventName]="createdEvent.eventName"
            label="SIGN OUT"
            direction="out"
            (onDownload)="downloadPdf('out')"
            (onEmail)="sendEmail()"
          ></app-qr-display>

          <div *ngIf="!createdEvent.qrCodeIn" class="info-banner w-full">
            <mat-icon class="shrink-0 text-blue-500">info</mat-icon>
            <p>QR codes are being generated — refresh the event page in a moment.</p>
          </div>

        </div>

        <!-- Bottom: create another -->
        <div class="mt-8 pt-6 border-t border-gray-200">
          <button mat-stroked-button type="button" (click)="clearForm()"
                  style="width:100%; height:48px; font-size:0.875rem;">
            Create Another Event
          </button>
        </div>

      </ng-container>

    </main>
  `,
})
export class CreateEventComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  apiError = '';
  typesError = '';
  catsError = '';
  eventTypes: { _id: string; name: string }[] = [];
  eventCategories: { _id: string; name: string }[] = [];

  view: 'form' | 'qr' = 'form';
  createdEvent?: IEvent;

  readonly hourModes = [
    { value: 'in-out',   label: 'In/Out Duration', desc: 'Calculated from sign-in to sign-out time' },
    { value: 'fixed',    label: 'Fixed Hours',      desc: 'Set a fixed value per scan' },
    { value: 'volume',   label: 'Volume-based',     desc: 'Units entered × conversion rate' },
    { value: 'disabled', label: 'No Hours',         desc: 'Track attendance only' },
  ] as const;

  readonly captureOpts = [
    { key: 'hasDescription', label: 'Description', desc: 'Student describes what they did',       emoji: '✏️' },
    { key: 'hasReflection',  label: 'Reflection',  desc: 'Student writes a personal reflection',  emoji: '💬' },
    { key: 'hasGeolocate',   label: 'Geolocation', desc: 'Capture GPS coordinates on scan',       emoji: '📍' },
  ];

  get conversionPreview(): string {
    const units = +(this.form?.get('volumeUnitsInput')?.value ?? 1) || 1;
    const hours = +(this.form?.get('volumeHoursInput')?.value ?? 1) || 1;
    const rate  = hours / units;
    if (rate >= 1) {
      const rounded = Math.round(rate * 100) / 100;
      return `${rounded}h`;
    }
    return `${Math.round(rate * 60)} min`;
  }

  get qp() {
    const c = this.ctx.context;
    return c ? { email: c.email, role: c.role, schoolId: c.schoolId } : {};
  }

  constructor(
    private fb: FormBuilder,
    private eventsService: EventsService,
    public ctx: UrlContextService,
    public router: Router,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    this.buildForm();

    const schoolId = this.ctx.schoolId;
    this.eventsService.getEventTypes(schoolId).subscribe({
      next: t  => (this.eventTypes = t),
      error: () => (this.typesError = 'Could not load event types'),
    });
    this.eventsService.getEventCategories(schoolId).subscribe({
      next: c  => (this.eventCategories = c),
      error: () => (this.catsError = 'Could not load categories'),
    });
  }

  private buildForm() {
    this.form = this.fb.group({
      eventName:       ['', [Validators.required, Validators.minLength(3)]],
      eventTypeId:     [''],
      eventCategoryId: [''],
      hourMode:        ['in-out',   Validators.required],
      fixedHours:      [1,          [Validators.min(0.5)]],
      volumeUnitName:  [''],
      volumeUnitsInput:[1,          [Validators.required, Validators.min(0.01)]],
      volumeHoursInput:[1,          [Validators.required, Validators.min(0.01)]],
      pointsEnabled:   [false],
      pointsValue:     [10,         [Validators.min(1)]],
      hasDescription:  [false],
      hasReflection:   [false],
      hasGeolocate:    [false],
    });
  }

  clearForm() {
    this.form.reset({
      eventName: '', eventTypeId: '', eventCategoryId: '',
      hourMode: 'in-out',
      fixedHours: 1,
      volumeUnitName: '', volumeUnitsInput: 1, volumeHoursInput: 1,
      pointsEnabled: false, pointsValue: 10,
      hasDescription: false, hasReflection: false, hasGeolocate: false,
    });
    this.apiError = '';
    this.createdEvent = undefined;
    this.view = 'form';
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.apiError = '';

    const v = this.form.value;
    const c = this.ctx.context;

    const qrMode = v.hourMode === 'in-out' ? 'in-out' : 'once-off';

    const dto: any = {
      eventName:     v.eventName,
      school:        String(c?.schoolId ?? ''),
      teacher:       [c?.firstName, c?.lastName].filter(Boolean).join(' ') || (c?.email ?? ''),
      teacherEmail:  c?.email ?? '',
      qrMode,
      hourMode:      v.hourMode,
      pointsEnabled: v.pointsEnabled,
      pointsValue:   v.pointsEnabled ? v.pointsValue : 0,
      captureOptions: {
        hasDescription: v.hasDescription,
        hasReflection:  v.hasReflection,
        hasGeolocate:   v.hasGeolocate,
      },
    };

    if (v.eventTypeId)     dto.eventTypeId     = v.eventTypeId;
    if (v.eventCategoryId) dto.eventCategoryId = v.eventCategoryId;
    if (v.hourMode === 'fixed')  dto.fixedHours = v.fixedHours;
    if (v.hourMode === 'volume') {
      dto.volumeUnitName   = v.volumeUnitName;
      dto.volumeConversion = (+v.volumeHoursInput || 1) / (+v.volumeUnitsInput || 1);
    }

    this.eventsService.createEvent(dto).subscribe({
      next: (event: IEvent) => {
        this.loading = false;
        this.createdEvent = event;
        this.view = 'qr';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.loading = false;
        this.apiError = err?.error?.message ?? err?.message ?? 'An unexpected error occurred. Please try again.';
      },
    });
  }

  downloadPdf(direction: 'in' | 'out') {
    if (!this.createdEvent) return;
    this.eventsService.downloadQrPdf(this.createdEvent._id, direction).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `${this.createdEvent?.eventName ?? 'event'}_QR_${direction.toUpperCase()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.snack.open('PDF download failed', 'Close', { duration: 3000 }),
    });
  }

  sendEmail() {
    if (!this.createdEvent) return;
    this.eventsService.sendEmail(this.createdEvent._id).subscribe({
      next: () => this.snack.open('QR codes emailed to teacher!', 'Close', { duration: 3000 }),
      error: () => this.snack.open('Email failed — check SMTP settings', 'Close', { duration: 4000 }),
    });
  }
}
