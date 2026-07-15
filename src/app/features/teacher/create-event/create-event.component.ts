import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { QrDisplayComponent } from '../../../shared/components/qr-display/qr-display.component';
import { GeofencePickerComponent } from '../../../shared/components/geofence-picker/geofence-picker.component';
import { EventsService, IEvent, GeoTarget } from '../../../core/services/events.service';
import { UrlContextService } from '../../../core/services/url-context.service';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    HeaderComponent,
    QrDisplayComponent,
    GeofencePickerComponent,
  ],
  template: `
    <app-header></app-header>

    <main class="max-w-xl mx-auto px-3 py-2">

      <!-- ═══════════════════════════════════════════════
           FORM VIEW
           ═══════════════════════════════════════════════ -->
      <ng-container *ngIf="view === 'form'">

        <!-- Title row: back + heading + clear -->
        <div class="flex items-center gap-2 my-1">
          <button mat-icon-button
                  (click)="router.navigate(['/teacher/events'], { queryParams: qp })"
                  aria-label="Back to events">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h2 class="text-base font-semibold text-gray-900 flex-1">Create Event</h2>
          <button mat-stroked-button type="button" (click)="clearForm()">Clear</button>
        </div>

        <!-- API error banner -->
        <div *ngIf="apiError" class="error-banner mb-3">
          <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
          <div>
            <p class="font-semibold">Could not create event</p>
            <p class="mt-0.5 text-red-600">{{ apiError }}</p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3" novalidate>

          <!-- ── Event Details ──────────────────────────── -->
          <div class="form-card">
            <p class="card-label">Event Details</p>

            <div class="field-wrap">
              <label class="field-label">Event Name <span class="text-red-400">*</span></label>
              <input type="text" formControlName="eventName" class="field-input"
                     placeholder="e.g. Beach Cleanup 2025">
              <p class="field-error"
                 *ngIf="form.get('eventName')?.touched && form.get('eventName')?.hasError('required')">
                Name is required.
              </p>
              <p class="field-error"
                 *ngIf="form.get('eventName')?.touched && form.get('eventName')?.hasError('minlength')">
                Minimum 3 characters.
              </p>
            </div>

            <div class="field-wrap">
              <label class="field-label">Department</label>
              <select formControlName="department" class="field-select"
                      (change)="onDepartmentChange(form.get('department')?.value)">
                <option value="">None</option>
                <option *ngFor="let d of departments" [value]="d.name">{{ d.name }}</option>
              </select>
            </div>

            <div *ngIf="subcategories.length > 0" class="field-wrap">
              <label class="field-label">Category</label>
              <select formControlName="category" class="field-select">
                <option value="">None</option>
                <option *ngFor="let s of subcategories" [value]="s">{{ s }}</option>
              </select>
            </div>

            <p *ngIf="lookupError" class="field-hint" style="color:#d97706">{{ lookupError }}</p>
          </div>

          <!-- ── Tracking ───────────────────────────────── -->
          <div class="form-card">

            <div class="seg-control" style="font-size:12px">
              <button type="button" class="seg-btn" [class.active]="trackingTab === 'hours'"
                      (click)="setTrackingTab('hours')">Hours</button>
              <button type="button" class="seg-btn" [class.active]="trackingTab === 'points'"
                      (click)="setTrackingTab('points')">Points</button>
              <button type="button" class="seg-btn" [class.active]="trackingTab === 'none'"
                      (click)="setTrackingTab('none')">Attendance</button>
            </div>

            <!-- Fixed-height zone: Hours and Points panels stacked, inactive ones fade -->
            <div class="tracking-base">

              <div class="tracking-tab" [class.tracking-tab--active]="trackingTab === 'hours'">
                <mat-button-toggle-group formControlName="hourMode" class="hour-mode-group" [hideSingleSelectionIndicator]="true">
                  <mat-button-toggle *ngFor="let m of hourModes" [value]="m.value">
                    <p class="text-xs font-semibold text-gray-800 leading-tight">{{ m.label }}</p>
                    <p class="text-xs text-gray-400 mt-0.5 leading-tight">{{ m.desc }}</p>
                  </mat-button-toggle>
                </mat-button-toggle-group>
              </div>

              <div class="tracking-tab" [class.tracking-tab--active]="trackingTab === 'points'">
                <mat-button-toggle-group formControlName="pointsMode" class="points-mode-group" [hideSingleSelectionIndicator]="true">
                  <mat-button-toggle *ngFor="let m of pointsModes" [value]="m.value">
                    <p class="text-xs font-semibold text-gray-800 leading-tight">{{ m.label }}</p>
                    <p class="text-xs text-gray-400 mt-0.5 leading-tight">{{ m.desc }}</p>
                  </mat-button-toggle>
                </mat-button-toggle-group>
              </div>

              <div class="tracking-tab" [class.tracking-tab--active]="trackingTab === 'none'">
                <div class="none-tab-content">
                  <i class="fa-solid fa-clipboard-list none-tab-icon"></i>
                  <p class="none-tab-title">Attendance Only</p>
                  <p class="none-tab-desc">Track who attended — no hours or points recorded</p>
                </div>
              </div>

            </div><!-- /tracking-base -->

            <!-- Expansion fields below the fixed zone -->

            <ng-container *ngIf="trackingTab === 'hours'">

              <div *ngIf="form.get('hourMode')?.value === 'fixed'" class="field-wrap" style="max-width:160px">
                <label class="field-label">Hours per scan</label>
                <input type="number" formControlName="fixedHours" class="field-input"
                       min="0.5" step="0.5" placeholder="e.g. 1">
                <p class="field-hint">Minimum 0.5 hrs</p>
                <p class="field-error" *ngIf="form.get('fixedHours')?.invalid && form.get('fixedHours')?.touched">
                  At least 0.5 hrs.
                </p>
              </div>

              <div *ngIf="form.get('hourMode')?.value === 'volume'" class="space-y-3">
                <div class="field-wrap">
                  <label class="field-label">Unit name</label>
                  <input type="text" formControlName="volumeUnitName" class="field-input"
                         placeholder="e.g. bags collected, km walked">
                  <p class="field-hint">What students will enter a count of</p>
                  <p class="field-error" *ngIf="form.get('volumeUnitName')?.invalid && form.get('volumeUnitName')?.touched">
                    Required.
                  </p>
                </div>
                <div class="conversion-card">
                  <p class="card-label">Conversion Rate</p>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="field-wrap">
                      <label class="field-label">Units collected</label>
                      <input type="number" formControlName="volumeUnitsInput" class="field-input"
                             min="0.01" step="any" placeholder="e.g. 1">
                      <p class="field-error" *ngIf="form.get('volumeUnitsInput')?.invalid && form.get('volumeUnitsInput')?.touched">
                        Must be &gt; 0.
                      </p>
                    </div>
                    <div class="field-wrap">
                      <label class="field-label">= Hours earned</label>
                      <input type="number" formControlName="volumeHoursInput" class="field-input"
                             min="0.01" step="any" placeholder="e.g. 1">
                      <p class="field-error" *ngIf="form.get('volumeHoursInput')?.invalid && form.get('volumeHoursInput')?.touched">
                        Must be &gt; 0.
                      </p>
                    </div>
                  </div>
                  <p class="field-hint">
                    Preview: 1 {{ form.get('volumeUnitName')?.value || 'unit' }} = <strong>{{ conversionPreview }}</strong>
                  </p>
                </div>
              </div>

            </ng-container>

            <ng-container *ngIf="trackingTab === 'points'">

              <div *ngIf="form.get('pointsMode')?.value === 'in-out' || form.get('pointsMode')?.value === 'fixed'"
                   class="field-wrap" style="max-width:160px">
                <label class="field-label">Points per scan</label>
                <input type="number" formControlName="pointsValue" class="field-input"
                       min="1" placeholder="e.g. 10">
                <p class="field-hint" *ngIf="form.get('pointsMode')?.value === 'in-out'">Awarded on sign-out only</p>
                <p class="field-hint" *ngIf="form.get('pointsMode')?.value === 'fixed'">Awarded on each scan</p>
                <p class="field-error" *ngIf="form.get('pointsValue')?.invalid && form.get('pointsValue')?.touched">
                  At least 1 point.
                </p>
              </div>

              <div *ngIf="form.get('pointsMode')?.value === 'volume'" class="space-y-3">
                <div class="field-wrap" *ngIf="form.get('hourMode')?.value !== 'volume'">
                  <label class="field-label">Unit name</label>
                  <input type="text" formControlName="volumeUnitName" class="field-input"
                         placeholder="e.g. bags collected, km walked">
                  <p class="field-hint">What students will enter a count of</p>
                </div>
                <div class="conversion-card">
                  <p class="card-label">Points Conversion</p>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="field-wrap">
                      <label class="field-label">Units collected</label>
                      <input type="number" formControlName="pointsUnitsInput" class="field-input"
                             min="0.01" step="any" placeholder="e.g. 1">
                      <p class="field-error" *ngIf="form.get('pointsUnitsInput')?.invalid && form.get('pointsUnitsInput')?.touched">
                        Must be &gt; 0.
                      </p>
                    </div>
                    <div class="field-wrap">
                      <label class="field-label">= Points earned</label>
                      <input type="number" formControlName="pointsPointsInput" class="field-input"
                             min="0.01" step="any" placeholder="e.g. 5">
                      <p class="field-error" *ngIf="form.get('pointsPointsInput')?.invalid && form.get('pointsPointsInput')?.touched">
                        Must be &gt; 0.
                      </p>
                    </div>
                  </div>
                  <p class="field-hint">
                    Preview: 1 {{ form.get('volumeUnitName')?.value || 'unit' }} = <strong>{{ pointsConversionPreview }}</strong>
                  </p>
                </div>
              </div>

            </ng-container>

          </div>

          <!-- ── Capture options — always visible, tap to toggle ─────────────── -->
          <div class="form-card">
            <p class="card-label">Capture Options</p>
            <div class="capture-grid">
              <button type="button" class="capture-tile"
                      *ngFor="let opt of captureOpts"
                      [class.capture-tile--active]="form.get(opt.key)?.value"
                      (click)="form.get(opt.key)?.setValue(!form.get(opt.key)?.value)">
                <i *ngIf="opt.icon" [class]="opt.icon + ' capture-icon'"></i>
                <p class="capture-label">{{ opt.label }}</p>
                <p class="capture-desc">{{ opt.desc }}</p>
              </button>
            </div>

            <!-- Geofence picker — only shown when "Geolocation" is enabled -->
            <div *ngIf="form.get('hasGeolocate')?.value"
                 class="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div class="flex items-baseline justify-between">
                <p class="card-label !mb-0">Target Location</p>
                <span class="text-[11px] text-gray-400">
                  Drop a pin where the event happens. Students who scan within
                  the radius will be flagged as on-site.
                </span>
              </div>
              <app-geofence-picker
                [value]="form.get('geoTarget')?.value"
                (valueChange)="onGeoTargetChange($event)">
              </app-geofence-picker>
            </div>
          </div>

          <!-- ── Submit — sticky so it never jumps when expansion fields change ── -->
          <div class="submit-sticky">
            <button mat-flat-button type="submit" [disabled]="loading"
                    style="width:100%; height:44px; font-size:0.875rem; font-weight:600; border-radius:10px;">
              <span class="flex items-center justify-center gap-2">
                <mat-spinner *ngIf="loading" diameter="18"></mat-spinner>
                {{ loading ? 'Creating event...' : 'Create Event & Generate QR Codes' }}
              </span>
            </button>
          </div>

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
  lookupError = '';

  view: 'form' | 'qr' = 'form';
  createdEvent?: IEvent;

  /** Controls which tab is active in the Tracking card */
  trackingTab: 'hours' | 'points' | 'none' = 'hours';

  departments: { name: string; subcategories: string[] }[] = [];
  subcategories: string[] = [];

  setTrackingTab(tab: 'hours' | 'points' | 'none') {
    this.trackingTab = tab;
    const hourCtrl = this.form.get('hourMode');
    const pointsCtrl = this.form.get('pointsMode');

    // Tabs are mutually exclusive: only one tracking mode is active at a time.
    // Switching tabs disables the other mode so the resulting event isn't
    // accidentally configured as both (e.g. "in/out hours + fixed points",
    // which would generate two QR codes for a points-only event).
    if (tab === 'hours') {
      if (hourCtrl?.value === 'disabled') hourCtrl.setValue('in-out');
      pointsCtrl?.setValue('disabled');
    } else if (tab === 'points') {
      if (pointsCtrl?.value === 'disabled') pointsCtrl.setValue('fixed');
      hourCtrl?.setValue('disabled');
    } else {
      hourCtrl?.setValue('disabled');
      pointsCtrl?.setValue('disabled');
    }
  }

  onDepartmentChange(deptName: string) {
    const dept = this.departments.find(d => d.name === deptName);
    this.subcategories = dept?.subcategories ?? [];
    if (!this.subcategories.includes(this.form.get('category')?.value ?? '')) {
      this.form.get('category')?.setValue('');
    }
  }

  readonly hourModes = [
    { value: 'in-out',   label: 'In / Out',  desc: 'Time from sign-in to sign-out' },
    { value: 'fixed',    label: 'Fixed',      desc: 'Set hours per scan' },
    { value: 'volume',   label: 'Volume',     desc: 'Units × conversion rate' },
    { value: 'disabled', label: 'No Hours',   desc: 'No hours tracked' },
  ] as const;

  readonly pointsModes = [
    { value: 'in-out',   label: 'In / Out',  desc: 'Points from sign-in to sign-out' },
    { value: 'fixed',    label: 'Fixed',      desc: 'Set points per scan' },
    { value: 'volume',   label: 'Volume',     desc: 'Units × conversion rate' },
    { value: 'disabled', label: 'No Points',  desc: 'No points tracked' },
  ] as const;

  readonly captureOpts = [
    { key: 'hasDescription', label: 'Description', desc: 'Student describes what they did',      icon: 'fa-solid fa-pen-to-square' },
    { key: 'hasReflection',  label: 'Reflection',  desc: 'Student writes a personal reflection', icon: 'fa-solid fa-lightbulb' },
    { key: 'hasGeolocate',   label: 'Geolocation', desc: 'Capture GPS coordinates on scan',      icon: 'fa-solid fa-location-dot' },
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

  get pointsConversionPreview(): string {
    const units  = +(this.form?.get('pointsUnitsInput')?.value  ?? 1) || 1;
    const points = +(this.form?.get('pointsPointsInput')?.value ?? 1) || 1;
    const rate   = points / units;
    const rounded = Math.round(rate * 100) / 100;
    return `${rounded} pts`;
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
    this.eventsService.getSchoolLookup(schoolId).subscribe({
      next: ({ departments }) => {
        this.departments = departments;
      },
      error: () => (this.lookupError = 'Could not load departments for this school'),
    });
  }

  private buildForm() {
    this.form = this.fb.group({
      eventName:         ['', [Validators.required, Validators.minLength(3)]],
      department:        [''],
      category:          [''],
      hourMode:          ['in-out',   Validators.required],
      fixedHours:        [1,          [Validators.min(0.5)]],
      volumeUnitName:    [''],
      volumeUnitsInput:  [1,          [Validators.required, Validators.min(0.01)]],
      volumeHoursInput:  [1,          [Validators.required, Validators.min(0.01)]],
      pointsMode:        ['disabled', Validators.required],
      pointsValue:       [10,         [Validators.min(1)]],
      pointsUnitsInput:  [1,          [Validators.required, Validators.min(0.01)]],
      pointsPointsInput: [10,         [Validators.required, Validators.min(0.01)]],
      hasDescription:    [false],
      hasReflection:     [false],
      hasGeolocate:      [false],
      geoTarget:         [null as GeoTarget | null],
    });
  }

  /** Called by the geofence picker; writes back into the reactive form. */
  onGeoTargetChange(target: GeoTarget | null) {
    this.form.get('geoTarget')?.setValue(target);
  }

  clearForm() {
    this.form.reset({
      eventName: '', department: '', category: '',
      hourMode: 'in-out',
      fixedHours: 1,
      volumeUnitName: '', volumeUnitsInput: 1, volumeHoursInput: 1,
      pointsMode: 'disabled', pointsValue: 10,
      pointsUnitsInput: 1, pointsPointsInput: 10,
      hasDescription: false, hasReflection: false, hasGeolocate: false,
      geoTarget: null,
    });
    this.apiError = '';
    this.createdEvent = undefined;
    this.view = 'form';
    this.trackingTab = 'hours';
    this.form.get('hourMode')?.setValue('in-out');
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.apiError = '';

    const v = this.form.value;
    const c = this.ctx.context;

    // Two QR codes (sign-in + sign-out) are only needed when EITHER hours
    // OR points are measured between an in-scan and an out-scan. Fixed /
    // volume / disabled modes only ever need a single scan, so we produce
    // a once-off QR for them.
    const qrMode =
      (v.hourMode === 'in-out' || v.pointsMode === 'in-out')
        ? 'in-out'
        : 'once-off';

    const dto: any = {
      eventName:     v.eventName,
      school:        String(c?.schoolId ?? ''),
      teacher:       [c?.firstName, c?.lastName].filter(Boolean).join(' ') || (c?.email ?? ''),
      teacherEmail:  c?.email ?? '',
      qrMode,
      hourMode:      v.hourMode,
      pointsMode:    v.pointsMode,
      pointsEnabled: v.pointsMode !== 'disabled',
      pointsValue:   (v.pointsMode === 'fixed' || v.pointsMode === 'in-out') ? (+v.pointsValue || 0) : 0,
      captureOptions: {
        hasDescription: v.hasDescription,
        hasReflection:  v.hasReflection,
        hasGeolocate:   v.hasGeolocate,
      },
      // Only send geoTarget if geolocation is enabled AND a centre has been picked.
      geoTarget: v.hasGeolocate && v.geoTarget ? v.geoTarget : null,
    };

    if (v.department) dto.department = v.department;
    if (v.category)   dto.category   = v.category;

    if (v.hourMode === 'fixed')  dto.fixedHours = v.fixedHours;
    if (v.hourMode === 'volume' || v.pointsMode === 'volume') {
      dto.volumeUnitName = v.volumeUnitName;
    }
    if (v.hourMode === 'volume') {
      dto.volumeConversion = (+v.volumeHoursInput || 1) / (+v.volumeUnitsInput || 1);
    }
    if (v.pointsMode === 'volume') {
      dto.pointsConversion = (+v.pointsPointsInput || 1) / (+v.pointsUnitsInput || 1);
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
