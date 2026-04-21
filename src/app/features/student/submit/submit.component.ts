import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventsService, IEvent } from '../../../core/services/events.service';
import { AttendanceService, IAttendance, SubmitAttendancePayload } from '../../../core/services/attendance.service';
import { UrlContextService } from '../../../core/services/url-context.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { ApiService } from '../../../core/services/api.service';

type PageState = 'loading' | 'confirm-in' | 'confirm-out' | 'success' | 'already-recorded' | 'error';

@Component({
  selector: 'app-submit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-gray-100">

      <!-- ── Header bar ───────────────────────────── -->
      <div class="page-header text-center py-5 px-4">
        <p class="text-xs font-medium uppercase tracking-widest opacity-70 mb-1">iServe</p>
        <h1 class="text-base font-bold">{{ schoolName || 'Loading...' }}</h1>
        <p *ngIf="event" class="text-sm opacity-80 mt-0.5">{{ event.eventName }}</p>
      </div>

      <main class="flex-1 flex items-start justify-center p-4 pt-8">
        <div class="w-full max-w-sm space-y-4">

          <!-- ── Loading ─────────────────────────── -->
          <div *ngIf="state === 'loading'" class="flex flex-col items-center gap-4 py-12">
            <mat-spinner diameter="48"></mat-spinner>
            <p class="text-gray-500 text-sm">Loading event details...</p>
          </div>

          <!-- ── Error ────────────────────────────── -->
          <div *ngIf="state === 'error'"
               class="bg-white rounded-2xl shadow-sm p-6 text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <mat-icon class="text-red-400 !text-3xl">link_off</mat-icon>
            </div>
            <h2 class="text-sm font-bold text-gray-800">Event Not Found</h2>
            <p class="text-gray-500 text-sm">
              This QR code may be invalid or the event may have ended.
            </p>
            <p *ngIf="loadError" class="text-xs text-red-500 bg-red-50 rounded-lg p-3 text-left">
              {{ loadError }}
            </p>
          </div>

          <!-- ── Sign In ───────────────────────────── -->
          <ng-container *ngIf="state === 'confirm-in'">

            <!-- Student identity -->
            <div class="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
              <div class="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0"
                   style="background-color: var(--color-primary)">
                {{ initials }}
              </div>
              <div class="min-w-0">
                <p class="font-semibold text-gray-800 truncate">{{ displayName }}</p>
                <p class="text-xs text-gray-500 truncate">{{ studentEmail }}</p>
                <p *ngIf="studentGrade" class="text-xs text-gray-400">
                  Grade {{ studentGrade }}<span *ngIf="studentClass"> · {{ studentClass }}</span>
                </p>
              </div>
            </div>

            <!-- Event summary -->
            <div class="bg-white rounded-2xl shadow-sm p-4 space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Event</span>
                <span class="font-medium text-gray-800 text-right ml-4">{{ event?.eventName }}</span>
              </div>
              <div *ngIf="event?.pointsEnabled" class="flex justify-between">
                <span class="text-gray-500">Points on sign-in</span>
                <span class="font-semibold" style="color: var(--color-primary)">
                  +{{ event?.pointsValue }}
                </span>
              </div>
              <div *ngIf="event?.hourMode === 'fixed'" class="flex justify-between">
                <span class="text-gray-500">Hours awarded</span>
                <span class="font-medium text-gray-800">{{ event?.fixedHours }}h</span>
              </div>
              <div class="flex justify-between text-green-600">
                <span>Signing <strong>in</strong></span>
                <mat-icon class="text-base">login</mat-icon>
              </div>
            </div>

            <!-- Optional fields -->
            <ng-container
              *ngIf="event?.captureOptions?.hasDescription || event?.captureOptions?.hasReflection || event?.hourMode === 'volume'">
              <form [formGroup]="optionalForm" class="bg-white rounded-2xl shadow-sm p-5 space-y-4" novalidate>
                <p class="form-section-label">Additional Information</p>

                <mat-form-field *ngIf="event?.captureOptions?.hasDescription" appearance="outline" class="w-full">
                  <mat-label>Description</mat-label>
                  <textarea matInput formControlName="description" rows="3"
                            placeholder="Describe your contribution..."></textarea>
                  <mat-hint>Tell us what you did</mat-hint>
                  <mat-error *ngIf="optionalForm.get('description')?.invalid">
                    A description is required for this event.
                  </mat-error>
                </mat-form-field>

                <mat-form-field *ngIf="event?.captureOptions?.hasReflection" appearance="outline" class="w-full">
                  <mat-label>Reflection</mat-label>
                  <textarea matInput formControlName="reflection" rows="3"
                            placeholder="Reflect on your experience..."></textarea>
                  <mat-hint>What did you learn or feel?</mat-hint>
                  <mat-error *ngIf="optionalForm.get('reflection')?.invalid">
                    A reflection is required for this event.
                  </mat-error>
                </mat-form-field>

                <mat-form-field *ngIf="event?.hourMode === 'volume'" appearance="outline" class="w-full">
                  <mat-label>How many {{ event?.volumeUnitName || 'units' }}?</mat-label>
                  <input matInput type="number" formControlName="unitAmount" min="0" step="1"
                         placeholder="e.g. 5">
                  <mat-hint>{{ volumeHint }}</mat-hint>
                  <mat-error *ngIf="optionalForm.get('unitAmount')?.hasError('required')">
                    Please enter an amount.
                  </mat-error>
                  <mat-error *ngIf="optionalForm.get('unitAmount')?.hasError('min')">
                    Must be 0 or more.
                  </mat-error>
                </mat-form-field>
              </form>
            </ng-container>

            <!-- Submission error -->
            <div *ngIf="submitError" class="error-banner">
              <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
              <p>{{ submitError }}</p>
            </div>

            <button mat-flat-button type="button"
                    (click)="confirmIn()"
                    [disabled]="submitting || optionalForm.invalid"
                    style="width:100%; height:52px; font-size:1rem; font-weight:600;">
              <span class="flex items-center justify-center gap-2">
                <mat-spinner *ngIf="submitting" diameter="20"></mat-spinner>
                {{ submitting ? 'Signing in...' : 'Confirm Sign In' }}
              </span>
            </button>

          </ng-container>

          <!-- ── Sign Out ──────────────────────────── -->
          <ng-container *ngIf="state === 'confirm-out'">

            <!-- Student identity -->
            <div class="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
              <div class="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0"
                   style="background-color: var(--color-primary)">
                {{ initials }}
              </div>
              <div class="min-w-0">
                <p class="font-semibold text-gray-800 truncate">{{ displayName }}</p>
                <p *ngIf="signedInAt" class="text-xs text-gray-500">
                  Signed in at {{ signedInAt | date:'shortTime' }}
                </p>
              </div>
            </div>

            <!-- Event summary -->
            <div class="bg-white rounded-2xl shadow-sm p-4 space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Event</span>
                <span class="font-medium text-gray-800 text-right ml-4">{{ event?.eventName }}</span>
              </div>
              <div class="flex justify-between text-orange-600">
                <span>Signing <strong>out</strong></span>
                <mat-icon class="text-base">logout</mat-icon>
              </div>
            </div>

            <!-- Submission error -->
            <div *ngIf="submitError" class="error-banner">
              <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
              <p>{{ submitError }}</p>
            </div>

            <button mat-flat-button type="button"
                    (click)="confirmOut()"
                    [disabled]="submitting"
                    style="width:100%; height:52px; font-size:1rem; font-weight:600;
                           --mdc-filled-button-container-color: #f97316;">
              <span class="flex items-center justify-center gap-2">
                <mat-spinner *ngIf="submitting" diameter="20"></mat-spinner>
                {{ submitting ? 'Signing out...' : 'Confirm Sign Out' }}
              </span>
            </button>

          </ng-container>

          <!-- ── Success ───────────────────────────── -->
          <div *ngIf="state === 'success'"
               class="bg-white rounded-2xl shadow-sm p-8 text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <mat-icon class="!text-3xl text-green-500">check_circle</mat-icon>
            </div>
            <h2 class="text-base font-bold text-gray-800">
              {{ direction === 'out' ? 'Signed Out!' : 'Signed In!' }}
            </h2>
            <p class="text-gray-500 text-sm">Your attendance has been recorded.</p>

            <div *ngIf="completedRecord" class="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-left">
              <div *ngIf="completedRecord.hours" class="flex justify-between items-center">
                <span class="text-gray-500">Hours logged</span>
                <span class="font-semibold text-gray-800">{{ formatHours(completedRecord.hours) }}</span>
              </div>
              <div *ngIf="completedRecord.pointsAwarded > 0" class="flex justify-between items-center">
                <span class="text-gray-500">Points awarded</span>
                <span class="font-semibold" style="color: var(--color-primary)">
                  +{{ completedRecord.pointsAwarded }}
                </span>
              </div>
            </div>
            <p class="text-xs text-gray-400">You may close this page.</p>
          </div>

          <!-- ── Already Recorded ──────────────────── -->
          <div *ngIf="state === 'already-recorded'"
               class="bg-white rounded-2xl shadow-sm p-8 text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
              <mat-icon class="!text-3xl text-blue-400">info</mat-icon>
            </div>
            <h2 class="text-base font-bold text-gray-800">Already Recorded</h2>
            <p class="text-gray-500 text-sm">
              Your attendance for <strong>{{ event?.eventName }}</strong> has already been recorded today.
            </p>
          </div>

        </div>
      </main>
    </div>
  `,
})
export class SubmitComponent implements OnInit {
  state: PageState = 'loading';
  event?: IEvent;
  direction: 'in' | 'out' = 'in';
  completedRecord?: IAttendance;
  signedInAt?: Date;
  schoolName = '';
  submitting = false;
  loadError = '';
  submitError = '';

  studentEmail = '';
  displayName = '';
  studentGrade = '';
  studentClass = '';
  studentId = '';
  studentFirst = '';
  studentLast = '';

  optionalForm!: FormGroup;

  get initials(): string {
    return ((this.studentFirst[0] ?? '') + (this.studentLast[0] ?? '')).toUpperCase()
      || this.studentEmail[0]?.toUpperCase() || '?';
  }

  get volumeHint(): string {
    const conv  = this.event?.volumeConversion ?? 1;
    const unit  = this.event?.volumeUnitName   ?? 'unit';
    const amount = this.optionalForm?.get('unitAmount')?.value;

    if (conv >= 1) {
      const hrs = Math.round(conv * 100) / 100;
      const suffix = hrs >= 1 ? `${hrs}h` : `${Math.round(conv * 60)} min`;
      const preview = amount > 0
        ? `  ·  ${amount} ${unit} = ${this.fmtHours(amount * conv)}`
        : '';
      return `Each ${unit} = ${suffix}${preview}`;
    } else {
      const unitsPerHour = Math.round((1 / conv) * 100) / 100;
      const preview = amount > 0
        ? `  ·  ${amount} ${unit} = ${this.fmtHours(amount * conv)}`
        : '';
      return `Every ${unitsPerHour} ${unit} = 1h${preview}`;
    }
  }

  private fmtHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private eventsService: EventsService,
    private attendanceService: AttendanceService,
    private ctx: UrlContextService,
    private theme: ThemeService,
    private api: ApiService,
  ) {}

  ngOnInit() {
    const params = { ...this.route.snapshot.queryParams, ...this.route.snapshot.params };
    this.ctx.captureFromUrl(params);

    const eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
    this.direction = (this.route.snapshot.queryParamMap.get('direction') ?? 'in') as 'in' | 'out';

    const c = this.ctx.context;
    this.studentEmail = c?.email        ?? params['email']   ?? '';
    this.studentFirst = c?.firstName    ?? params['first']   ?? '';
    this.studentLast  = c?.lastName     ?? params['last']    ?? '';
    this.studentGrade = c?.grade        ?? params['grade']   ?? '';
    this.studentClass = c?.studentClass ?? params['class']   ?? '';
    this.studentId    = c?.studentId    ?? params['studentId'] ?? '';
    this.displayName  = [this.studentFirst, this.studentLast].filter(Boolean).join(' ') || this.studentEmail;

    this.optionalForm = this.fb.group({
      description: [''],
      reflection:  [''],
      unitAmount:  [null, [Validators.min(0)]],
    });

    if (!/^[a-f\d]{24}$/i.test(eventId)) {
      this.loadError = 'Invalid event link — the QR code may be damaged or the link is incorrect.';
      this.state = 'error';
      return;
    }

    this.eventsService.getEventById(eventId).subscribe({
      next: async (event) => {
        this.event = event;

        if (event.captureOptions?.hasDescription) {
          this.optionalForm.get('description')?.setValidators(Validators.required);
        }
        if (event.captureOptions?.hasReflection) {
          this.optionalForm.get('reflection')?.setValidators(Validators.required);
        }
        if (event.hourMode === 'volume') {
          this.optionalForm.get('unitAmount')?.setValidators([Validators.required, Validators.min(0)]);
        }
        this.optionalForm.updateValueAndValidity();

        const schoolId = +event.school || this.ctx.schoolId;
        await this.theme.loadAndApply(schoolId);
        this.api.get<{ name: string }>(`schools/id/${schoolId}`)
          .subscribe({ next: s => (this.schoolName = s.name), error: () => {} });

        this.state = this.direction === 'out' ? 'confirm-out' : 'confirm-in';
      },
      error: (err) => {
        this.loadError = err?.error?.message ?? err?.message ?? 'Could not load event.';
        this.state = 'error';
      },
    });
  }

  confirmIn() {
    if (this.optionalForm.invalid) { this.optionalForm.markAllAsTouched(); return; }
    if (!this.event || !this.studentEmail) return;
    this.submitting = true;
    this.submitError = '';

    const v = this.optionalForm.value;
    const payload: SubmitAttendancePayload = {
      eventId:          this.event._id,
      studentEmail:     this.studentEmail,
      direction:        'in',
      studentFirstName: this.studentFirst  || undefined,
      studentLastName:  this.studentLast   || undefined,
      studentGrade:     this.studentGrade  || undefined,
      studentClass:     this.studentClass  || undefined,
      studentId:        this.studentId     || undefined,
      schoolId:         String(this.ctx.schoolId),
      description:      v.description      || undefined,
      reflection:       v.reflection       || undefined,
      unitAmount:       v.unitAmount       ?? undefined,
    };

    this.attendanceService.submit(payload).subscribe({
      next: (record) => {
        this.submitting = false;
        this.completedRecord = record;
        this.state = 'success';
      },
      error: (err) => {
        this.submitting = false;
        const msg: string = err?.error?.message ?? err?.message ?? 'Submission failed.';
        if (msg.toLowerCase().includes('already')) {
          this.state = 'already-recorded';
        } else {
          this.submitError = msg;
        }
      },
    });
  }

  confirmOut() {
    if (!this.event || !this.studentEmail) return;
    this.submitting = true;
    this.submitError = '';

    const payload: SubmitAttendancePayload = {
      eventId:      this.event._id,
      studentEmail: this.studentEmail,
      direction:    'out',
      schoolId:     String(this.ctx.schoolId),
    };

    this.attendanceService.submit(payload).subscribe({
      next: (record) => {
        this.submitting = false;
        this.completedRecord = record;
        this.state = 'success';
      },
      error: (err) => {
        this.submitting = false;
        this.submitError = err?.error?.message ?? err?.message ?? 'Sign-out failed. Please try again.';
      },
    });
  }

  formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
}
