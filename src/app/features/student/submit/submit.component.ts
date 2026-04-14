import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="min-h-screen flex flex-col" style="background-color: var(--color-background)">

      <!-- Header -->
      <div class="page-header text-center py-5">
        <p class="text-xs font-medium uppercase tracking-widest opacity-70 mb-1">iServe</p>
        <h1 class="text-xl font-bold">{{ schoolName || 'Loading...' }}</h1>
        <p *ngIf="event" class="text-sm opacity-80 mt-0.5">{{ event.eventName }}</p>
      </div>

      <main class="flex-1 flex items-start justify-center p-4 pt-8">
        <div class="w-full max-w-sm space-y-4">

          <!-- ── Loading ── -->
          <div *ngIf="state === 'loading'" class="flex flex-col items-center gap-4 py-12">
            <mat-spinner diameter="48"></mat-spinner>
            <p class="text-gray-500 text-sm">Loading event details...</p>
          </div>

          <!-- ── Not found / generic error ── -->
          <div *ngIf="state === 'error'" class="card text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <mat-icon class="text-red-400 !text-3xl">link_off</mat-icon>
            </div>
            <h2 class="text-lg font-bold text-gray-800">Event Not Found</h2>
            <p class="text-gray-500 text-sm">This QR code may be invalid or the event may have ended.</p>
            <p *ngIf="loadError" class="text-xs text-red-400 bg-red-50 rounded-lg p-3">{{ loadError }}</p>
          </div>

          <!-- ── Sign In ── -->
          <ng-container *ngIf="state === 'confirm-in'">

            <!-- Student info card -->
            <div class="card flex items-center gap-4">
              <div class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
                   style="background-color: var(--color-primary)">
                {{ initials }}
              </div>
              <div class="min-w-0">
                <p class="font-semibold text-gray-800 truncate">{{ displayName }}</p>
                <p class="text-xs text-gray-500 truncate">{{ studentEmail }}</p>
                <p *ngIf="studentGrade" class="text-xs text-gray-400">Grade {{ studentGrade }}
                  <span *ngIf="studentClass"> · {{ studentClass }}</span>
                </p>
              </div>
            </div>

            <!-- Event details -->
            <div class="card space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Event</span>
                <span class="font-medium text-gray-800">{{ event?.eventName }}</span>
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
            </div>

            <!-- Optional fields form -->
            <form [formGroup]="optionalForm" class="space-y-4"
                  *ngIf="event?.captureOptions?.hasDescription || event?.captureOptions?.hasReflection || event?.hourMode === 'volume'">
              <div class="card space-y-4">
                <p class="section-heading">Additional Information</p>

                <mat-form-field *ngIf="event?.captureOptions?.hasDescription" appearance="outline">
                  <mat-label>Description</mat-label>
                  <textarea matInput formControlName="description" rows="3"
                            placeholder="Describe your contribution..."></textarea>
                  <mat-hint>Tell us what you did</mat-hint>
                  <mat-error *ngIf="optionalForm.get('description')?.hasError('required')">
                    A description is required for this event
                  </mat-error>
                </mat-form-field>

                <mat-form-field *ngIf="event?.captureOptions?.hasReflection" appearance="outline">
                  <mat-label>Reflection</mat-label>
                  <textarea matInput formControlName="reflection" rows="3"
                            placeholder="Reflect on your experience..."></textarea>
                  <mat-hint>What did you learn or feel?</mat-hint>
                  <mat-error *ngIf="optionalForm.get('reflection')?.hasError('required')">
                    A reflection is required for this event
                  </mat-error>
                </mat-form-field>

                <mat-form-field *ngIf="event?.hourMode === 'volume'" appearance="outline">
                  <mat-label>{{ event?.volumeUnitName || 'Units' }}</mat-label>
                  <input matInput type="number" formControlName="unitAmount" min="0" step="1" />
                  <mat-hint>Enter the number of {{ event?.volumeUnitName || 'units' }}</mat-hint>
                  <mat-error *ngIf="optionalForm.get('unitAmount')?.hasError('required')">
                    Please enter an amount
                  </mat-error>
                  <mat-error *ngIf="optionalForm.get('unitAmount')?.hasError('min')">
                    Must be 0 or more
                  </mat-error>
                </mat-form-field>
              </div>
            </form>

            <!-- Submission error -->
            <div *ngIf="submitError" class="error-banner">
              <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
              <p>{{ submitError }}</p>
            </div>

            <!-- Sign In button -->
            <button
              mat-raised-button
              (click)="confirmIn()"
              [disabled]="submitting || optionalForm.invalid"
              class="w-full !py-4 !text-base !font-semibold"
              style="background-color: var(--color-primary); color: white;">
              <span class="flex items-center justify-center gap-2">
                <mat-spinner *ngIf="submitting" diameter="20"></mat-spinner>
                <mat-icon *ngIf="!submitting">how_to_reg</mat-icon>
                {{ submitting ? 'Signing in...' : 'Confirm Sign In' }}
              </span>
            </button>

          </ng-container>

          <!-- ── Sign Out ── -->
          <ng-container *ngIf="state === 'confirm-out'">

            <div class="card flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <mat-icon class="text-red-400">logout</mat-icon>
              </div>
              <div>
                <p class="font-semibold text-gray-800">{{ displayName }}</p>
                <p *ngIf="signedInAt" class="text-xs text-gray-500">
                  Signed in at {{ signedInAt | date:'shortTime' }}
                </p>
              </div>
            </div>

            <div class="card text-sm space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-500">Event</span>
                <span class="font-medium text-gray-800">{{ event?.eventName }}</span>
              </div>
              <div class="flex justify-between text-orange-600">
                <span>You are signing <strong>out</strong></span>
                <mat-icon class="text-base">arrow_outward</mat-icon>
              </div>
            </div>

            <!-- Submission error -->
            <div *ngIf="submitError" class="error-banner">
              <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
              <p>{{ submitError }}</p>
            </div>

            <button
              mat-raised-button
              (click)="confirmOut()"
              [disabled]="submitting"
              class="w-full !py-4 !text-base !font-semibold !bg-red-500 !text-white">
              <span class="flex items-center justify-center gap-2">
                <mat-spinner *ngIf="submitting" diameter="20"></mat-spinner>
                <mat-icon *ngIf="!submitting">exit_to_app</mat-icon>
                {{ submitting ? 'Signing out...' : 'Confirm Sign Out' }}
              </span>
            </button>

          </ng-container>

          <!-- ── Success ── -->
          <div *ngIf="state === 'success'" class="card text-center space-y-5 py-8">
            <div class="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <mat-icon class="!text-5xl text-green-500">check_circle</mat-icon>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-800">
                {{ direction === 'out' ? 'Signed Out!' : 'Signed In!' }}
              </h2>
              <p class="text-gray-500 text-sm mt-1">{{ event?.eventName }}</p>
            </div>

            <!-- Stats -->
            <div *ngIf="completedRecord"
                 class="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-600 text-left">
              <div *ngIf="completedRecord.hours != null" class="flex justify-between items-center">
                <span class="flex items-center gap-1">
                  <mat-icon class="text-base text-gray-400">schedule</mat-icon> Hours logged
                </span>
                <span class="font-semibold text-gray-800">{{ formatHours(completedRecord.hours) }}</span>
              </div>
              <div *ngIf="completedRecord.pointsAwarded > 0" class="flex justify-between items-center">
                <span class="flex items-center gap-1">
                  <mat-icon class="text-base text-yellow-500">stars</mat-icon> Points awarded
                </span>
                <span class="font-semibold" style="color: var(--color-primary)">
                  +{{ completedRecord.pointsAwarded }}
                </span>
              </div>
            </div>

            <p class="text-xs text-gray-400">You may close this page.</p>
          </div>

          <!-- ── Already recorded ── -->
          <div *ngIf="state === 'already-recorded'" class="card text-center space-y-4 py-8">
            <div class="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
              <mat-icon class="!text-3xl text-blue-400">info</mat-icon>
            </div>
            <h2 class="text-xl font-bold text-gray-800">Already Recorded</h2>
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
    this.studentEmail = c?.email ?? params['email'] ?? '';
    this.studentFirst = c?.firstName ?? params['first'] ?? '';
    this.studentLast  = c?.lastName  ?? params['last']  ?? '';
    this.studentGrade = c?.grade     ?? params['grade'] ?? '';
    this.studentClass = c?.studentClass ?? params['class'] ?? '';
    this.studentId    = c?.studentId ?? params['studentId'] ?? '';
    this.displayName  = [this.studentFirst, this.studentLast].filter(Boolean).join(' ') || this.studentEmail;

    // Build the optional fields form — validators added dynamically after event loads
    this.optionalForm = this.fb.group({
      description: [''],
      reflection:  [''],
      unitAmount:  [null, [Validators.min(0)]],
    });

    // Guard: validate the eventId is a proper MongoDB ObjectId before hitting the API
    if (!/^[a-f\d]{24}$/i.test(eventId)) {
      this.loadError = `Invalid event link — the QR code may be damaged or the link is incorrect.`;
      this.state = 'error';
      return;
    }

    this.eventsService.getEventById(eventId).subscribe({
      next: async (event) => {
        this.event = event;

        // Apply dynamic validators based on event config
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
      eventId:         this.event._id,
      studentEmail:    this.studentEmail,
      direction:       'in',
      studentFirstName: this.studentFirst || undefined,
      studentLastName:  this.studentLast  || undefined,
      studentGrade:     this.studentGrade || undefined,
      studentClass:     this.studentClass || undefined,
      studentId:        this.studentId    || undefined,
      schoolId:         String(this.ctx.schoolId),
      description:      v.description || undefined,
      reflection:       v.reflection  || undefined,
      unitAmount:       v.unitAmount  ?? undefined,
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
        this.submitError = err?.error?.message ?? err?.message ?? 'Sign out failed. Please try again.';
      },
    });
  }

  formatHours(h: number | null): string {
    if (h == null) return '—';
    const hrs = Math.floor(h);
    const min = Math.round((h - hrs) * 60);
    return hrs > 0 ? `${hrs}h ${min}m` : `${min}m`;
  }
}
