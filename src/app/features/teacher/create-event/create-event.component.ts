import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { EventsService, IEvent } from '../../../core/services/events.service';
import { UrlContextService } from '../../../core/services/url-context.service';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    HeaderComponent,
  ],
  template: `
    <app-header></app-header>

    <main class="max-w-2xl mx-auto p-4 pb-12">

      <!-- Page title + back -->
      <div class="flex items-center gap-3 my-6">
        <button mat-icon-button (click)="router.navigate(['/teacher/events'], { queryParams: qp })"
                aria-label="Back to events">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 class="text-2xl font-bold text-gray-800">Create Event</h2>
      </div>

      <!-- API error banner -->
      <div *ngIf="apiError" class="error-banner mb-6">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">Could not create event</p>
          <p class="mt-0.5 text-red-600">{{ apiError }}</p>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">

        <!-- ── Event Details ── -->
        <div class="card space-y-4">
          <p class="section-heading">Event Details</p>

          <mat-form-field appearance="outline">
            <mat-label>Event Name</mat-label>
            <input matInput formControlName="eventName" placeholder="e.g. Beach Cleanup 2024" />
            <mat-hint>Give the event a clear, descriptive name</mat-hint>
            <mat-error *ngIf="form.get('eventName')?.hasError('required')">
              Event name is required
            </mat-error>
            <mat-error *ngIf="form.get('eventName')?.hasError('minlength')">
              Must be at least 3 characters
            </mat-error>
          </mat-form-field>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <mat-form-field appearance="outline">
              <mat-label>Event Type</mat-label>
              <mat-select formControlName="eventTypeId">
                <mat-option value="">— None —</mat-option>
                <mat-option *ngFor="let t of eventTypes" [value]="t._id">{{ t.name }}</mat-option>
              </mat-select>
              <mat-hint *ngIf="typesError" class="text-red-500">{{ typesError }}</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <mat-select formControlName="eventCategoryId">
                <mat-option value="">— None —</mat-option>
                <mat-option *ngFor="let c of eventCategories" [value]="c._id">{{ c.name }}</mat-option>
              </mat-select>
              <mat-hint *ngIf="catsError" class="text-red-500">{{ catsError }}</mat-hint>
            </mat-form-field>
          </div>
        </div>

        <!-- ── QR Code Mode ── -->
        <div class="card space-y-3">
          <p class="section-heading">QR Code Mode</p>
          <div class="grid grid-cols-2 gap-3">
            <button type="button"
                    class="selection-card"
                    [class.selected]="form.get('qrMode')?.value === 'once-off'"
                    (click)="form.get('qrMode')?.setValue('once-off')">
              <div class="flex items-center gap-2 mb-1">
                <mat-icon class="text-base" style="color: var(--color-primary)">qr_code</mat-icon>
                <p class="font-semibold text-sm text-gray-800">Single Scan</p>
              </div>
              <p class="text-xs text-gray-500">One QR code — marks attendance on scan</p>
            </button>
            <button type="button"
                    class="selection-card"
                    [class.selected]="form.get('qrMode')?.value === 'in-out'"
                    (click)="form.get('qrMode')?.setValue('in-out')">
              <div class="flex items-center gap-2 mb-1">
                <mat-icon class="text-base" style="color: var(--color-primary)">swap_horiz</mat-icon>
                <p class="font-semibold text-sm text-gray-800">Sign In + Sign Out</p>
              </div>
              <p class="text-xs text-gray-500">Two QR codes — records duration</p>
            </button>
          </div>
        </div>

        <!-- ── Hours Tracking ── -->
        <div class="card space-y-4">
          <p class="section-heading">Hours Tracking</p>
          <div class="grid grid-cols-2 gap-3">
            <button *ngFor="let mode of hourModes" type="button"
                    class="selection-card"
                    [class.selected]="form.get('hourMode')?.value === mode.value"
                    (click)="form.get('hourMode')?.setValue(mode.value)">
              <div class="flex items-center gap-2 mb-1">
                <mat-icon class="text-base" style="color: var(--color-primary)">{{ mode.icon }}</mat-icon>
                <p class="font-semibold text-sm text-gray-800">{{ mode.label }}</p>
              </div>
              <p class="text-xs text-gray-500">{{ mode.desc }}</p>
            </button>
          </div>

          <!-- Fixed hours field -->
          <div *ngIf="form.get('hourMode')?.value === 'fixed'">
            <mat-form-field appearance="outline" class="max-w-xs">
              <mat-label>Fixed hours per scan</mat-label>
              <input matInput type="number" formControlName="fixedHours" min="0.5" step="0.5" />
              <mat-hint>e.g. 1 for one hour per attendance</mat-hint>
              <mat-error *ngIf="form.get('fixedHours')?.hasError('min')">
                Must be at least 0.5 hours
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Volume fields -->
          <div *ngIf="form.get('hourMode')?.value === 'volume'" class="grid grid-cols-2 gap-4">
            <mat-form-field appearance="outline">
              <mat-label>Unit Name</mat-label>
              <input matInput formControlName="volumeUnitName" placeholder="e.g. bags collected" />
              <mat-error *ngIf="form.get('volumeUnitName')?.hasError('required')">
                Unit name is required for volume mode
              </mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Units → Hours multiplier</mat-label>
              <input matInput type="number" formControlName="volumeConversion" min="0.01" step="0.1" />
              <mat-hint>e.g. 0.5 = each unit = 30 min</mat-hint>
              <mat-error *ngIf="form.get('volumeConversion')?.hasError('min')">
                Must be greater than 0
              </mat-error>
            </mat-form-field>
          </div>
        </div>

        <!-- ── Points ── -->
        <div class="card space-y-4">
          <p class="section-heading">Points</p>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-700">Award points per scan</p>
              <p class="text-xs text-gray-500 mt-0.5">Students earn points each time they scan in</p>
            </div>
            <mat-slide-toggle formControlName="pointsEnabled" color="primary"></mat-slide-toggle>
          </div>

          <div *ngIf="form.get('pointsEnabled')?.value">
            <mat-form-field appearance="outline" class="max-w-xs">
              <mat-label>Points per scan</mat-label>
              <input matInput type="number" formControlName="pointsValue" min="1" />
              <mat-icon matSuffix>stars</mat-icon>
              <mat-error *ngIf="form.get('pointsValue')?.hasError('min')">
                Must be at least 1 point
              </mat-error>
            </mat-form-field>
          </div>
        </div>

        <!-- ── Capture Options ── -->
        <div class="card space-y-3">
          <p class="section-heading">Additional Capture</p>
          <div class="space-y-3">
            <div *ngFor="let opt of captureOpts"
                 class="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
              <mat-checkbox [formControlName]="opt.key" color="primary"></mat-checkbox>
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-700">{{ opt.label }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ opt.desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Submit ── -->
        <button
          mat-raised-button
          type="submit"
          [disabled]="loading || form.invalid"
          class="w-full !py-3 !text-base"
          style="background-color: var(--color-primary); color: white;">
          <span class="flex items-center justify-center gap-2">
            <mat-spinner *ngIf="loading" diameter="20" class="!stroke-white"></mat-spinner>
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
    { value: 'in-out',   label: 'In/Out Duration', icon: 'schedule',      desc: 'Calculated from sign-in to sign-out time' },
    { value: 'fixed',    label: 'Fixed Hours',      icon: 'timer',         desc: 'Set a fixed value awarded per scan' },
    { value: 'volume',   label: 'Volume-based',     icon: 'inventory_2',   desc: 'Units entered × conversion rate' },
    { value: 'disabled', label: 'No Hours',         icon: 'block',         desc: 'Track attendance only, no hours' },
  ] as const;

  captureOpts = [
    { key: 'hasDescription', label: 'Description',  desc: 'Student describes what they did' },
    { key: 'hasReflection',  label: 'Reflection',   desc: 'Student writes a personal reflection' },
    { key: 'hasGeolocate',   label: 'Geolocation',  desc: 'Capture GPS coordinates on scan' },
  ];

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
    const c = this.ctx.context;

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

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.apiError = '';

    const v = this.form.value;
    const c = this.ctx.context;

    const dto = {
      eventName:    v.eventName,
      school:       String(c?.schoolId ?? ''),
      teacher:      [c?.firstName, c?.lastName].filter(Boolean).join(' ') || (c?.email ?? ''),
      teacherEmail: c?.email ?? '',
      qrMode:       v.qrMode,
      hourMode:     v.hourMode,
      pointsEnabled: v.pointsEnabled,
      pointsValue:  v.pointsEnabled ? v.pointsValue : 0,
      captureOptions: {
        hasDescription: v.hasDescription,
        hasReflection:  v.hasReflection,
        hasGeolocate:   v.hasGeolocate,
      },
      ...(v.eventTypeId     ? { eventTypeId: v.eventTypeId }         : {}),
      ...(v.eventCategoryId ? { eventCategoryId: v.eventCategoryId } : {}),
      ...(v.hourMode === 'fixed'  ? { fixedHours: v.fixedHours }                             : {}),
      ...(v.hourMode === 'volume' ? { volumeUnitName: v.volumeUnitName, volumeConversion: v.volumeConversion } : {}),
    };

    this.eventsService.createEvent(dto as any).subscribe({
      next: (event: IEvent) => {
        this.loading = false;
        this.snack.open('Event created — QR codes generated!', 'Close', {
          duration: 4000,
          panelClass: ['bg-green-700'],
        });
        this.router.navigate(['/teacher/events', event._id, 'qr'], { queryParams: this.qp });
      },
      error: (err) => {
        this.loading = false;
        this.apiError = err?.error?.message ?? err?.message ?? 'An unexpected error occurred. Please try again.';
      },
    });
  }
}
