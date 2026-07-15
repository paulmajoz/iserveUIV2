import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { QrScannerComponent, ScannedPayload } from '../../../shared/components/qr-scanner/qr-scanner.component';
import { EventsService, IEvent } from '../../../core/services/events.service';
import { AttendanceService, IAttendance, SubmitAttendancePayload } from '../../../core/services/attendance.service';
import { UrlContextService } from '../../../core/services/url-context.service';
import { ThemeService } from '../../../core/theme/theme.service';

type View = 'idle' | 'scanning' | 'resolving' | 'confirming' | 'submitting' | 'success' | 'already-recorded' | 'no-identity' | 'error';

@Component({
  selector: 'app-student-scan',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    QrScannerComponent,
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-gray-100">

      <div class="page-header text-center py-5 px-4">
        <p class="text-xs font-medium uppercase tracking-widest opacity-70 mb-1">iServe</p>
        <h1 class="text-base font-bold">Scan Attendance QR</h1>
        <p *ngIf="studentName" class="text-sm opacity-80 mt-0.5">{{ studentName }}</p>
      </div>

      <main class="flex-1 flex items-start justify-center p-4 pt-6">
        <div class="w-full max-w-sm space-y-4">

          <!-- ── No identity ─────────────────────────────────── -->
          <div *ngIf="view === 'no-identity'"
               class="bg-white rounded-2xl shadow-sm p-6 text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center mx-auto">
              <mat-icon class="!text-3xl text-yellow-500">person_off</mat-icon>
            </div>
            <h2 class="text-sm font-bold text-gray-800">Sign In Required</h2>
            <p class="text-gray-500 text-sm">
              We couldn't identify you. Open this page from your school portal so we know who you are.
            </p>
          </div>

          <!-- ── Idle (start button) ─────────────────────────── -->
          <div *ngIf="view === 'idle'"
               class="bg-white rounded-2xl shadow-sm p-6 text-center space-y-4">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                 style="background-color: var(--color-primary-light, #dbeafe)">
              <mat-icon class="!text-3xl" style="color: var(--color-primary, #2c698d)">qr_code_scanner</mat-icon>
            </div>
            <h2 class="text-sm font-bold text-gray-800">Ready to scan</h2>
            <p class="text-gray-500 text-sm">Point your camera at the event QR code.</p>
            <button mat-flat-button type="button"
                    (click)="view = 'scanning'"
                    style="width:100%; height:48px; font-weight:600;">
              <span class="flex items-center justify-center gap-2">
                <mat-icon>photo_camera</mat-icon> Open Scanner
              </span>
            </button>
          </div>

          <!-- ── Scanning ────────────────────────────────────── -->
          <div *ngIf="view === 'scanning'" class="space-y-3">
            <app-qr-scanner (scanned)="onScanned($event)"></app-qr-scanner>
            <p class="text-xs text-gray-500 text-center">
              Hold the QR steady inside the camera frame.
            </p>
            <button mat-stroked-button type="button"
                    (click)="view = 'idle'"
                    style="width:100%; height:44px;">Cancel</button>
          </div>

          <!-- ── Resolving / submitting ──────────────────────── -->
          <div *ngIf="view === 'resolving' || view === 'submitting'"
               class="bg-white rounded-2xl shadow-sm p-8 text-center space-y-4">
            <mat-spinner diameter="48" class="mx-auto"></mat-spinner>
            <p class="text-sm text-gray-600">
              {{ view === 'resolving' ? 'Reading event…' : 'Recording attendance…' }}
            </p>
            <p *ngIf="event" class="text-xs text-gray-400">{{ event.eventName }}</p>
          </div>

          <!-- ── Confirming (form) ───────────────────────────── -->
          <ng-container *ngIf="view === 'confirming' && event">
            <!-- Event summary -->
            <div class="bg-white rounded-2xl shadow-sm p-4 space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Event</span>
                <span class="font-medium text-gray-800 text-right ml-4">{{ event.eventName }}</span>
              </div>
              <div class="flex justify-between"
                   [class.text-green-600]="resolvedDirection === 'in'"
                   [class.text-orange-600]="resolvedDirection === 'out'">
                <span>Signing <strong>{{ resolvedDirection }}</strong></span>
                <mat-icon class="text-base">{{ resolvedDirection === 'out' ? 'logout' : 'login' }}</mat-icon>
              </div>
            </div>

            <!-- Form -->
            <form [formGroup]="optionalForm" class="bg-white rounded-2xl shadow-sm p-5 space-y-4" novalidate>
              <p class="form-section-label">Additional Information</p>

              <mat-form-field *ngIf="event.captureOptions?.hasDescription" appearance="outline" class="w-full">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="3"
                          placeholder="Describe your contribution..."></textarea>
                <mat-hint>Tell us what you did</mat-hint>
                <mat-error *ngIf="optionalForm.get('description')?.invalid">
                  A description is required for this event.
                </mat-error>
              </mat-form-field>

              <mat-form-field *ngIf="event.captureOptions?.hasReflection" appearance="outline" class="w-full">
                <mat-label>Reflection</mat-label>
                <textarea matInput formControlName="reflection" rows="3"
                          placeholder="Reflect on your experience..."></textarea>
                <mat-hint>What did you learn or feel?</mat-hint>
                <mat-error *ngIf="optionalForm.get('reflection')?.invalid">
                  A reflection is required for this event.
                </mat-error>
              </mat-form-field>

              <!-- Geolocation -->
              <div *ngIf="event.captureOptions?.hasGeolocate"
                   class="border border-gray-200 rounded-xl p-4 space-y-2">
                <div class="flex items-center gap-2">
                  <i class="fa-solid fa-location-dot text-gray-400"></i>
                  <p class="text-sm font-medium text-gray-700">Location</p>
                </div>

                <p *ngIf="!geolocationValue" class="text-xs text-gray-500">
                  We need to capture your current location for this event.
                </p>

                <div *ngIf="geolocationValue"
                     class="text-xs flex items-center gap-2 text-green-600">
                  <mat-icon class="!text-base">check_circle</mat-icon>
                  Location captured
                  <span class="text-gray-400 font-mono ml-auto">{{ geolocationValue }}</span>
                </div>

                <button mat-stroked-button type="button"
                        (click)="captureLocation()"
                        [disabled]="geoCapturing"
                        style="width:100%; height:40px; font-weight:500;">
                  <span class="flex items-center justify-center gap-2">
                    <mat-spinner *ngIf="geoCapturing" diameter="16"></mat-spinner>
                    <mat-icon *ngIf="!geoCapturing" class="!text-base">my_location</mat-icon>
                    {{ geoCapturing ? 'Getting location…' : (geolocationValue ? 'Re-capture' : 'Capture my location') }}
                  </span>
                </button>

                <p *ngIf="geoError" class="text-xs text-red-500">{{ geoError }}</p>

                <mat-error *ngIf="optionalForm.get('geolocation')?.invalid && optionalForm.get('geolocation')?.touched"
                           class="text-xs">
                  Location is required for this event.
                </mat-error>
              </div>

              <!-- Volume / unit amount -->
              <mat-form-field *ngIf="needsUnitAmount" appearance="outline" class="w-full">
                <mat-label>How many {{ event.volumeUnitName || 'units' }}?</mat-label>
                <input matInput type="number" formControlName="unitAmount" min="0" step="1"
                       placeholder="e.g. 5">
                <mat-error *ngIf="optionalForm.get('unitAmount')?.hasError('required')">
                  Please enter an amount.
                </mat-error>
                <mat-error *ngIf="optionalForm.get('unitAmount')?.hasError('min')">
                  Must be 0 or more.
                </mat-error>
              </mat-form-field>
            </form>

            <button mat-flat-button type="button"
                    (click)="confirmAndSubmit()"
                    [disabled]="optionalForm.invalid"
                    style="width:100%; height:48px; font-weight:600;"
                    [style.--mdc-filled-button-container-color]="resolvedDirection === 'out' ? '#f97316' : null">
              <span class="flex items-center justify-center gap-2">
                {{ resolvedDirection === 'out' ? 'Confirm Sign Out' : 'Confirm Sign In' }}
              </span>
            </button>

            <button mat-stroked-button type="button"
                    (click)="reset()"
                    style="width:100%; height:40px;">Cancel</button>
          </ng-container>

          <!-- ── Success ─────────────────────────────────────── -->
          <div *ngIf="view === 'success'"
               class="bg-white rounded-2xl shadow-sm p-6 text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <mat-icon class="!text-3xl text-green-500">check_circle</mat-icon>
            </div>
            <h2 class="text-sm font-bold text-gray-800">
              {{ resolvedDirection === 'out' ? 'Signed Out!' : 'Signed In!' }}
            </h2>
            <p *ngIf="event" class="text-xs text-gray-400">{{ event.eventName }}</p>

            <div *ngIf="completedRecord" class="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-left">
              <div *ngIf="completedRecord.hours" class="flex justify-between">
                <span class="text-gray-500">Hours logged</span>
                <span class="font-semibold">{{ formatHours(completedRecord.hours) }}</span>
              </div>
              <div *ngIf="completedRecord.pointsAwarded > 0" class="flex justify-between">
                <span class="text-gray-500">Points awarded</span>
                <span class="font-semibold" style="color: var(--color-primary)">
                  +{{ completedRecord.pointsAwarded }}
                </span>
              </div>
            </div>

            <button mat-stroked-button type="button"
                    (click)="reset()"
                    style="width:100%; height:44px;">Scan Another</button>
          </div>

          <!-- ── Already recorded ────────────────────────────── -->
          <div *ngIf="view === 'already-recorded'"
               class="bg-white rounded-2xl shadow-sm p-6 text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
              <mat-icon class="!text-3xl text-blue-400">info</mat-icon>
            </div>
            <h2 class="text-sm font-bold text-gray-800">Already Recorded</h2>
            <p *ngIf="event" class="text-xs text-gray-400">{{ event.eventName }}</p>
            <p class="text-gray-500 text-sm">
              Your attendance for this event has already been recorded today.
            </p>
            <button mat-stroked-button type="button"
                    (click)="reset()"
                    style="width:100%; height:44px;">Scan Another</button>
          </div>

          <!-- ── Error ───────────────────────────────────────── -->
          <div *ngIf="view === 'error'"
               class="bg-white rounded-2xl shadow-sm p-6 text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <mat-icon class="!text-3xl text-red-400">error_outline</mat-icon>
            </div>
            <h2 class="text-sm font-bold text-gray-800">Couldn't record attendance</h2>
            <p class="text-xs text-red-500 bg-red-50 rounded-lg p-3 text-left">{{ errorMsg }}</p>
            <button mat-stroked-button type="button"
                    (click)="reset()"
                    style="width:100%; height:44px;">Try Again</button>
          </div>

        </div>
      </main>
    </div>
  `,
})
export class ScanComponent implements OnInit {
  view: View = 'idle';
  event?: IEvent;
  resolvedDirection: 'in' | 'out' = 'in';
  completedRecord?: IAttendance;
  errorMsg = '';
  studentName = '';

  // Optional info form (description / reflection / volume / geolocation)
  optionalForm!: FormGroup;
  geoCapturing = false;
  geoError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private events: EventsService,
    private attendance: AttendanceService,
    private ctx: UrlContextService,
    private theme: ThemeService,
  ) {}

  ngOnInit() {
    this.optionalForm = this.fb.group({
      description: [''],
      reflection:  [''],
      unitAmount:  [null, [Validators.min(0)]],
      geolocation: [''],
    });

    // Capture URL identity (handles legacy/poster-QR landings that include
    // ?email=...&first=... in the query string).
    const params = { ...this.route.snapshot.queryParams, ...this.route.snapshot.params };
    this.ctx.captureFromUrl(params);

    const c = this.ctx.context;
    if (!c?.email) {
      this.view = 'no-identity';
      return;
    }
    this.studentName = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email;
    this.theme.loadAndApply(c.schoolId).catch(() => {});

    // If we landed here with an eventId in the URL (e.g. /submit/:eventId from
    // a printed QR poster), skip the scanner and resolve directly.
    const urlEventId = this.route.snapshot.paramMap.get('eventId');
    if (urlEventId && /^[a-f\d]{24}$/i.test(urlEventId)) {
      const dirParam = this.route.snapshot.queryParamMap.get('direction');
      const direction = (dirParam === 'in' || dirParam === 'out') ? dirParam : undefined;
      this.loadEventAndResolve(urlEventId, direction);
    }
  }

  private loadEventAndResolve(eventId: string, hintedDirection?: 'in' | 'out') {
    this.view = 'resolving';
    this.events.getEventById(eventId).subscribe({
      next: (event) => {
        this.event = event;
        this.applyValidators(event);
        this.resolveDirection(event, hintedDirection);
      },
      error: (err) => {
        this.errorMsg = err?.error?.message ?? err?.message ?? 'Could not load this event.';
        this.view = 'error';
      },
    });
  }

  /** True when at least one of hours/points uses volume mode and needs a unit count */
  get needsUnitAmount(): boolean {
    return this.event?.hourMode === 'volume' || this.event?.pointsMode === 'volume';
  }

  get hasAnyCaptureField(): boolean {
    const o = this.event?.captureOptions;
    return !!(o?.hasDescription || o?.hasReflection || o?.hasGeolocate) || this.needsUnitAmount;
  }

  /**
   * Whether the optional-info form should be shown on this scan.
   * once-off → on the IN scan; in-out → on the OUT scan.
   */
  needsConfirmStep(direction: 'in' | 'out'): boolean {
    if (!this.hasAnyCaptureField) return false;
    if (this.event?.qrMode === 'once-off') return direction === 'in';
    if (this.event?.qrMode === 'in-out')   return direction === 'out';
    return false;
  }

  get geolocationValue(): string {
    return this.optionalForm?.get('geolocation')?.value ?? '';
  }

  onScanned(payload: ScannedPayload) {
    const eventId = payload.eventId ?? this.extractEventId(payload.raw ?? '');
    if (!eventId || !/^[a-f\d]{24}$/i.test(eventId)) {
      this.errorMsg = 'That doesn\'t look like a valid iServe event QR code.';
      this.view = 'error';
      return;
    }
    this.loadEventAndResolve(eventId, payload.direction);
  }

  private applyValidators(event: IEvent) {
    const desc = this.optionalForm.get('description');
    const refl = this.optionalForm.get('reflection');
    const geo  = this.optionalForm.get('geolocation');
    const unit = this.optionalForm.get('unitAmount');

    desc?.clearValidators();
    refl?.clearValidators();
    geo?.clearValidators();
    unit?.setValidators([Validators.min(0)]);

    if (event.captureOptions?.hasDescription) desc?.setValidators(Validators.required);
    if (event.captureOptions?.hasReflection)  refl?.setValidators(Validators.required);
    if (event.captureOptions?.hasGeolocate)   geo?.setValidators(Validators.required);
    if (event.hourMode === 'volume' || event.pointsMode === 'volume') {
      unit?.setValidators([Validators.required, Validators.min(0)]);
    }

    [desc, refl, geo, unit].forEach(c => c?.updateValueAndValidity());
  }

  private extractEventId(raw: string): string | undefined {
    try {
      const url = new URL(raw);
      const parts = url.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex(p => p === 'submit' || p === 'Submit-Attendance');
      return idx >= 0 ? parts[idx + 1] : undefined;
    } catch {
      return undefined;
    }
  }

  private resolveDirection(event: IEvent, hintedDirection?: 'in' | 'out') {
    const c = this.ctx.context;
    if (!c?.email) {
      this.view = 'no-identity';
      return;
    }

    // Once-off: always 'in' (API is idempotent)
    if (event.qrMode === 'once-off') {
      this.proceed(event, 'in');
      return;
    }

    // In-out: honour explicit direction in QR, otherwise auto-detect.
    if (hintedDirection === 'in' || hintedDirection === 'out') {
      this.proceed(event, hintedDirection);
      return;
    }

    this.attendance.getState(event._id, c.email).subscribe({
      next: (state) => {
        if (state.status === 'closed') {
          this.view = 'already-recorded';
          return;
        }
        this.proceed(event, state.direction === 'out' ? 'out' : 'in');
      },
      error: (err) => {
        this.errorMsg = err?.error?.message ?? err?.message ?? 'Could not check attendance status.';
        this.view = 'error';
      },
    });
  }

  /** After we know direction: show the form if needed, else submit straight. */
  private proceed(event: IEvent, direction: 'in' | 'out') {
    this.resolvedDirection = direction;
    if (this.needsConfirmStep(direction)) {
      this.view = 'confirming';
    } else {
      this.submit(event, direction);
    }
  }

  /** User clicked "Confirm Sign In/Out" inside the confirm view. */
  confirmAndSubmit() {
    if (!this.event) return;
    if (this.optionalForm.invalid) {
      this.optionalForm.markAllAsTouched();
      return;
    }
    this.submit(this.event, this.resolvedDirection);
  }

  private submit(event: IEvent, direction: 'in' | 'out') {
    const c = this.ctx.context!;
    this.view = 'submitting';
    const v = this.optionalForm.value;

    const payload: SubmitAttendancePayload = {
      eventId: event._id,
      studentEmail: c.email,
      direction,
      schoolId: String(c.schoolId),
      ...(direction === 'in' ? {
        studentFirstName: c.firstName    || undefined,
        studentLastName:  c.lastName     || undefined,
        studentGrade:     c.grade        || undefined,
        studentClass:     c.studentClass || undefined,
        studentId:        c.studentId    || undefined,
        studentHouse:     c.studentHouse || undefined,
        studentTutor:     c.studentTutor || undefined,
        customField1:     c.customField1 || undefined,
        customField2:     c.customField2 || undefined,
        customField3:     c.customField3 || undefined,
      } : {}),
      // Optional info — only attached when this is the scan that collects them
      ...(this.needsConfirmStep(direction) ? {
        description: v.description || undefined,
        reflection:  v.reflection  || undefined,
        unitAmount:  v.unitAmount  ?? undefined,
        ...(direction === 'in'  ? { locationIn:  v.geolocation || undefined } : {}),
        ...(direction === 'out' ? { locationOut: v.geolocation || undefined } : {}),
      } : {}),
    };

    this.attendance.submit(payload).subscribe({
      next: (record) => {
        this.completedRecord = record;
        this.view = 'success';
      },
      error: (err) => {
        const msg: string = err?.error?.message ?? err?.message ?? 'Submission failed.';
        if (msg.toLowerCase().includes('already')) {
          this.view = 'already-recorded';
        } else {
          this.errorMsg = msg;
          this.view = 'error';
        }
      },
    });
  }

  /** Capture device GPS coords into the form. */
  captureLocation() {
    if (!('geolocation' in navigator)) {
      this.geoError = 'Your browser does not support location services.';
      return;
    }
    this.geoError = '';
    this.geoCapturing = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
        this.optionalForm.get('geolocation')?.setValue(coords);
        this.optionalForm.get('geolocation')?.markAsTouched();
        this.geoCapturing = false;
      },
      (err) => {
        this.geoCapturing = false;
        this.geoError = err.code === err.PERMISSION_DENIED
          ? 'Location permission denied. Please allow location access and try again.'
          : 'Couldn\'t get your location. Please try again.';
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  reset() {
    this.event = undefined;
    this.completedRecord = undefined;
    this.errorMsg = '';
    this.geoError = '';
    this.optionalForm.reset({ description: '', reflection: '', unitAmount: null, geolocation: '' });
    this.view = 'idle';
  }

  formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
}
