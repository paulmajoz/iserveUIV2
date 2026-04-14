import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { EventsService, IEvent } from '../../../core/services/events.service';
import { UrlContextService } from '../../../core/services/url-context.service';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    HeaderComponent,
  ],
  template: `
    <app-header></app-header>

    <main class="max-w-xl mx-auto px-4 pb-12">

      <!-- Back + title -->
      <div class="flex items-center gap-3 my-6">
        <button mat-icon-button (click)="router.navigate(['/teacher/events'], { queryParams: qp })"
                aria-label="Back to events">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 class="text-2xl font-bold text-gray-800">Create Event</h2>
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

        <!-- ── Event Details ─────────────────────────────── -->
        <div class="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <p class="form-section-label">Event Details</p>

          <!-- Event Name -->
          <div>
            <label class="field-label">
              Event Name <span class="text-red-500">*</span>
            </label>
            <input type="text" formControlName="eventName"
                   placeholder="e.g. Beach Cleanup 2024"
                   class="field-input" />
            <p *ngIf="form.get('eventName')?.invalid && form.get('eventName')?.touched"
               class="field-error">
              <ng-container *ngIf="form.get('eventName')?.hasError('required')">Event name is required.</ng-container>
              <ng-container *ngIf="form.get('eventName')?.hasError('minlength')">Must be at least 3 characters.</ng-container>
            </p>
          </div>

          <!-- Type + Category -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="field-label">Event Type</label>
              <select formControlName="eventTypeId" class="field-input">
                <option value="">— None —</option>
                <option *ngFor="let t of eventTypes" [value]="t._id">{{ t.name }}</option>
              </select>
              <p *ngIf="typesError" class="field-error">{{ typesError }}</p>
            </div>
            <div>
              <label class="field-label">Category</label>
              <select formControlName="eventCategoryId" class="field-input">
                <option value="">— None —</option>
                <option *ngFor="let c of eventCategories" [value]="c._id">{{ c.name }}</option>
              </select>
              <p *ngIf="catsError" class="field-error">{{ catsError }}</p>
            </div>
          </div>
        </div>

        <!-- ── QR Code Mode ───────────────────────────────── -->
        <div class="bg-white rounded-2xl shadow-sm p-5">
          <p class="form-section-label">QR Code Mode</p>
          <div class="seg-control">
            <button type="button" class="seg-btn"
                    [class.active]="form.get('qrMode')?.value === 'once-off'"
                    (click)="form.get('qrMode')?.setValue('once-off')">
              Once-Off
            </button>
            <button type="button" class="seg-btn"
                    [class.active]="form.get('qrMode')?.value === 'in-out'"
                    (click)="form.get('qrMode')?.setValue('in-out')">
              Sign In &amp; Out
            </button>
          </div>
          <p class="field-hint mt-2">{{ qrModeHint }}</p>
        </div>

        <!-- ── Hours Tracking ─────────────────────────────── -->
        <div class="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <p class="form-section-label">Hours Tracking</p>

          <!-- 2 × 2 mode grid -->
          <div class="grid grid-cols-2 gap-2">
            <button type="button" *ngFor="let mode of hourModes"
                    class="rounded-xl border px-3 py-2.5 text-left transition-all duration-150"
                    [class.border-gray-200]="form.get('hourMode')?.value !== mode.value"
                    [style.border-color]="form.get('hourMode')?.value === mode.value ? 'var(--color-primary)' : null"
                    [style.background]="form.get('hourMode')?.value === mode.value ? 'var(--color-surface)' : 'white'"
                    (click)="form.get('hourMode')?.setValue(mode.value)">
              <p class="text-sm font-semibold text-gray-800">{{ mode.label }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ mode.desc }}</p>
            </button>
          </div>

          <!-- Fixed hours -->
          <div *ngIf="form.get('hourMode')?.value === 'fixed'">
            <label class="field-label">Fixed hours per scan</label>
            <input type="number" formControlName="fixedHours" min="0.5" step="0.5"
                   class="field-input" style="max-width: 160px" />
            <p *ngIf="form.get('fixedHours')?.invalid && form.get('fixedHours')?.touched"
               class="field-error">Must be at least 0.5 hours.</p>
            <p class="field-hint">e.g. 1 for one hour per attendance</p>
          </div>

          <!-- Volume -->
          <div *ngIf="form.get('hourMode')?.value === 'volume'"
               class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="field-label">Unit name</label>
              <input type="text" formControlName="volumeUnitName"
                     placeholder="e.g. bags collected" class="field-input" />
              <p *ngIf="form.get('volumeUnitName')?.invalid && form.get('volumeUnitName')?.touched"
                 class="field-error">Unit name is required for volume mode.</p>
            </div>
            <div>
              <label class="field-label">Units → hours multiplier</label>
              <input type="number" formControlName="volumeConversion" min="0.01" step="0.1"
                     class="field-input" />
              <p *ngIf="form.get('volumeConversion')?.invalid && form.get('volumeConversion')?.touched"
                 class="field-error">Must be greater than 0.</p>
              <p class="field-hint">e.g. 0.5 = each unit = 30 min</p>
            </div>
          </div>
        </div>

        <!-- ── Points ─────────────────────────────────────── -->
        <div class="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <p class="form-section-label">Points</p>

          <div class="flex items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-800">Award points per scan</p>
              <p class="text-xs text-gray-400 mt-0.5">Students earn points each time they scan in</p>
            </div>
            <button type="button"
                    class="toggle-track shrink-0"
                    [class.on]="form.get('pointsEnabled')?.value"
                    (click)="toggle('pointsEnabled')"
                    [attr.aria-checked]="form.get('pointsEnabled')?.value"
                    role="switch">
              <span class="toggle-thumb"></span>
            </button>
          </div>

          <div *ngIf="form.get('pointsEnabled')?.value">
            <label class="field-label">Points per scan</label>
            <input type="number" formControlName="pointsValue" min="1"
                   class="field-input" style="max-width: 160px" />
            <p *ngIf="form.get('pointsValue')?.invalid && form.get('pointsValue')?.touched"
               class="field-error">Must be at least 1 point.</p>
          </div>
        </div>

        <!-- ── Capture Options ────────────────────────────── -->
        <div class="bg-white rounded-2xl shadow-sm p-5">
          <p class="form-section-label">Additional Capture</p>
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
              <button type="button"
                      class="toggle-track shrink-0"
                      [class.on]="form.get(opt.key)?.value"
                      (click)="toggle(opt.key)"
                      [attr.aria-checked]="form.get(opt.key)?.value"
                      role="switch">
                <span class="toggle-thumb"></span>
              </button>
            </div>
          </div>
        </div>

        <!-- ── Submit ─────────────────────────────────────── -->
        <button mat-raised-button type="submit"
                [disabled]="loading"
                class="w-full !py-3 !text-sm !font-semibold"
                style="background-color: var(--color-primary); color: white;">
          <span class="flex items-center justify-center gap-2">
            <mat-spinner *ngIf="loading" diameter="18" class="!stroke-white"></mat-spinner>
            <mat-icon *ngIf="!loading">qr_code_2</mat-icon>
            {{ loading ? 'Creating event...' : 'Create Event & Generate QR Codes' }}
          </span>
        </button>

      </form>
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

  hourModes = [
    { value: 'in-out',   label: 'In/Out Duration', desc: 'Calculated from sign-in to sign-out time' },
    { value: 'fixed',    label: 'Fixed Hours',      desc: 'Set a fixed value per scan' },
    { value: 'volume',   label: 'Volume-based',     desc: 'Units entered × conversion rate' },
    { value: 'disabled', label: 'No Hours',         desc: 'Track attendance only' },
  ] as const;

  captureOpts = [
    { key: 'hasDescription', label: 'Description', desc: 'Student describes what they did',       emoji: '✏️' },
    { key: 'hasReflection',  label: 'Reflection',  desc: 'Student writes a personal reflection',  emoji: '💬' },
    { key: 'hasGeolocate',   label: 'Geolocation', desc: 'Capture GPS coordinates on scan',       emoji: '📍' },
  ];

  get qrModeHint(): string {
    return this.form?.get('qrMode')?.value === 'in-out'
      ? 'Two QR codes are generated — one for sign-in, one for sign-out.'
      : 'One QR code is generated — students scan once to register attendance.';
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
    this.form = this.fb.group({
      eventName:       ['', [Validators.required, Validators.minLength(3)]],
      eventTypeId:     [''],
      eventCategoryId: [''],
      qrMode:          ['once-off', Validators.required],
      hourMode:        ['in-out',   Validators.required],
      fixedHours:      [1,          [Validators.min(0.5)]],
      volumeUnitName:  [''],
      volumeConversion:[1,          [Validators.min(0.01)]],
      pointsEnabled:   [false],
      pointsValue:     [10,         [Validators.min(1)]],
      hasDescription:  [false],
      hasReflection:   [false],
      hasGeolocate:    [false],
    });

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

  /** Toggle a boolean form control (used for CSS toggle buttons) */
  toggle(field: string) {
    const ctrl = this.form.get(field);
    if (ctrl) {
      ctrl.setValue(!ctrl.value);
      ctrl.markAsDirty();
    }
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.apiError = '';

    const v = this.form.value;
    const c = this.ctx.context;

    const dto: any = {
      eventName:     v.eventName,
      school:        String(c?.schoolId ?? ''),
      teacher:       [c?.firstName, c?.lastName].filter(Boolean).join(' ') || (c?.email ?? ''),
      teacherEmail:  c?.email ?? '',
      qrMode:        v.qrMode,
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
      dto.volumeUnitName  = v.volumeUnitName;
      dto.volumeConversion = v.volumeConversion;
    }

    this.eventsService.createEvent(dto).subscribe({
      next: (event: IEvent) => {
        this.loading = false;
        this.snack.open('Event created — QR codes generated!', 'Close', { duration: 4000 });
        this.router.navigate(['/teacher/events', event._id, 'qr'], { queryParams: this.qp });
      },
      error: (err) => {
        this.loading = false;
        this.apiError = err?.error?.message ?? err?.message ?? 'An unexpected error occurred. Please try again.';
      },
    });
  }
}
