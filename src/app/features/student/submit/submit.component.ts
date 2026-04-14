import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventsService, IEvent } from '../../../core/services/events.service';
import { AttendanceService, IAttendance, SubmitAttendancePayload } from '../../../core/services/attendance.service';
import { UrlContextService } from '../../../core/services/url-context.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { ApiService } from '../../../core/services/api.service';

type PageState = 'loading' | 'confirm-in' | 'confirm-out' | 'success' | 'already-out' | 'error';

@Component({
  selector: 'app-submit',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, MatProgressSpinnerModule],
  template: `
    <div class="min-h-screen flex flex-col" style="background-color: var(--color-background)">
      <!-- Header band -->
      <div class="page-header text-center py-6">
        <h1 class="text-2xl font-bold">{{ schoolName || 'iServe' }}</h1>
        <p class="text-sm opacity-80">{{ event?.eventName }}</p>
      </div>

      <main class="flex-1 flex items-center justify-center p-6">

        <!-- Loading -->
        <div *ngIf="state === 'loading'" class="flex flex-col items-center gap-4">
          <mat-spinner diameter="48"></mat-spinner>
          <p class="text-gray-500">Loading event...</p>
        </div>

        <!-- Error -->
        <div *ngIf="state === 'error'" class="card text-center max-w-sm">
          <p class="text-red-500 text-lg font-semibold mb-2">Event Not Found</p>
          <p class="text-gray-500 text-sm">This QR code may be invalid or expired.</p>
        </div>

        <!-- Confirm check-in -->
        <div *ngIf="state === 'confirm-in'" class="card max-w-sm w-full space-y-6">
          <div class="text-center">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
                 style="background-color: var(--color-surface)">✋</div>
            <h2 class="text-xl font-bold text-gray-800">Sign In</h2>
            <p class="text-gray-500 text-sm mt-1">{{ event?.eventName }}</p>
          </div>

          <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-1">
            <p><strong>Name:</strong> {{ displayName }}</p>
            <p><strong>Email:</strong> {{ studentEmail }}</p>
            <p *ngIf="studentGrade"><strong>Grade:</strong> {{ studentGrade }}</p>
          </div>

          <div *ngIf="event?.captureOptions?.hasDescription" class="space-y-1">
            <label class="block text-sm font-medium text-gray-600">Description</label>
            <textarea [(ngModel)]="form.description" rows="3"
                      placeholder="Describe your contribution..."
                      class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
          </div>

          <div *ngIf="event?.captureOptions?.hasReflection" class="space-y-1">
            <label class="block text-sm font-medium text-gray-600">Reflection</label>
            <textarea [(ngModel)]="form.reflection" rows="3"
                      placeholder="Reflect on your experience..."
                      class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
          </div>

          <div *ngIf="event?.hourMode === 'volume'" class="space-y-1">
            <label class="block text-sm font-medium text-gray-600">
              {{ event?.volumeUnitName || 'Units' }}
            </label>
            <input type="number" [(ngModel)]="form.unitAmount" min="0" step="1"
                   class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <button (click)="confirmIn()" [disabled]="submitting"
                  class="w-full btn-primary py-3 text-base flex items-center justify-center gap-2 disabled:opacity-50">
            <mat-spinner *ngIf="submitting" diameter="20"></mat-spinner>
            Confirm Sign In
          </button>
        </div>

        <!-- Confirm check-out -->
        <div *ngIf="state === 'confirm-out'" class="card max-w-sm w-full space-y-6">
          <div class="text-center">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
                 style="background-color: #fee2e2">👋</div>
            <h2 class="text-xl font-bold text-gray-800">Sign Out</h2>
            <p class="text-gray-500 text-sm mt-1">{{ event?.eventName }}</p>
          </div>

          <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-1">
            <p><strong>Name:</strong> {{ displayName }}</p>
            <p *ngIf="signedInAt"><strong>Signed in at:</strong> {{ signedInAt | date:'shortTime' }}</p>
          </div>

          <button (click)="confirmOut()" [disabled]="submitting"
                  class="w-full py-3 text-base font-medium text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  style="background-color: #ef4444">
            <mat-spinner *ngIf="submitting" diameter="20"></mat-spinner>
            Confirm Sign Out
          </button>
        </div>

        <!-- Success -->
        <div *ngIf="state === 'success'" class="card max-w-sm w-full text-center space-y-4">
          <div class="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-4xl"
               style="background-color: #dcfce7">✅</div>
          <h2 class="text-2xl font-bold text-gray-800">
            {{ direction === 'out' ? 'Signed Out!' : 'Signed In!' }}
          </h2>
          <p class="text-gray-500">{{ event?.eventName }}</p>

          <div *ngIf="completedRecord" class="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-600">
            <div *ngIf="completedRecord.hours != null" class="flex justify-between">
              <span>Hours logged</span>
              <span class="font-semibold text-gray-800">
                {{ formatHours(completedRecord.hours) }}
              </span>
            </div>
            <div *ngIf="completedRecord.pointsAwarded > 0" class="flex justify-between">
              <span>Points awarded</span>
              <span class="font-semibold text-gray-800">{{ completedRecord.pointsAwarded }}</span>
            </div>
          </div>

          <p class="text-xs text-gray-400">You may close this page.</p>
        </div>

        <!-- Already signed out -->
        <div *ngIf="state === 'already-out'" class="card max-w-sm w-full text-center space-y-4">
          <div class="text-4xl">ℹ️</div>
          <h2 class="text-xl font-bold text-gray-800">Already Recorded</h2>
          <p class="text-gray-500 text-sm">Your attendance for this event has already been recorded.</p>
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

  studentEmail = '';
  displayName = '';
  studentGrade = '';
  studentClass = '';
  studentId = '';
  studentFirst = '';
  studentLast = '';

  form = {
    description: '',
    reflection: '',
    unitAmount: undefined as number | undefined,
  };

  constructor(
    private route: ActivatedRoute,
    private eventsService: EventsService,
    private attendanceService: AttendanceService,
    private ctx: UrlContextService,
    private theme: ThemeService,
    private api: ApiService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    const params = { ...this.route.snapshot.queryParams, ...this.route.snapshot.params };
    this.ctx.captureFromUrl(params);

    const eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
    this.direction = (this.route.snapshot.queryParamMap.get('direction') ?? 'in') as 'in' | 'out';

    // Populate student details
    const c = this.ctx.context;
    this.studentEmail = c?.email ?? params['email'] ?? '';
    this.studentFirst = c?.firstName ?? params['first'] ?? '';
    this.studentLast = c?.lastName ?? params['last'] ?? '';
    this.studentGrade = c?.grade ?? params['grade'] ?? '';
    this.studentClass = c?.studentClass ?? params['class'] ?? '';
    this.studentId = c?.studentId ?? params['studentId'] ?? '';
    this.displayName = [this.studentFirst, this.studentLast].filter(Boolean).join(' ') || this.studentEmail;

    this.eventsService.getEventById(eventId).subscribe({
      next: async (event) => {
        this.event = event;
        // Load school theme
        const schoolId = +event.school || this.ctx.schoolId;
        await this.theme.loadAndApply(schoolId);
        this.api.get<{ name: string }>(`schools/id/${schoolId}`).subscribe(s => (this.schoolName = s.name));

        if (this.direction === 'out' || event.qrMode === 'once-off') {
          this.state = event.qrMode === 'once-off' ? 'confirm-in' : 'confirm-out';
        } else {
          this.state = 'confirm-in';
        }
      },
      error: () => (this.state = 'error'),
    });
  }

  confirmIn() {
    if (!this.event || !this.studentEmail) return;
    this.submitting = true;
    const payload: SubmitAttendancePayload = {
      eventId: this.event._id,
      studentEmail: this.studentEmail,
      direction: 'in',
      studentFirstName: this.studentFirst,
      studentLastName: this.studentLast,
      studentGrade: this.studentGrade,
      studentClass: this.studentClass,
      studentId: this.studentId,
      schoolId: String(this.ctx.schoolId),
      description: this.form.description || undefined,
      reflection: this.form.reflection || undefined,
      unitAmount: this.form.unitAmount,
    };
    this.attendanceService.submit(payload).subscribe({
      next: (record) => {
        this.submitting = false;
        this.completedRecord = record;
        this.state = 'success';
      },
      error: (err) => {
        this.submitting = false;
        const msg = err.error?.message ?? 'Submission failed';
        if (msg.includes('already')) {
          this.state = 'already-out';
        } else {
          this.snack.open(msg, 'Close', { duration: 4000 });
        }
      },
    });
  }

  confirmOut() {
    if (!this.event || !this.studentEmail) return;
    this.submitting = true;
    const payload: SubmitAttendancePayload = {
      eventId: this.event._id,
      studentEmail: this.studentEmail,
      direction: 'out',
      schoolId: String(this.ctx.schoolId),
    };
    this.attendanceService.submit(payload).subscribe({
      next: (record) => {
        this.submitting = false;
        this.completedRecord = record;
        this.state = 'success';
      },
      error: (err) => {
        this.submitting = false;
        this.snack.open(err.error?.message ?? 'Sign out failed', 'Close', { duration: 4000 });
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
