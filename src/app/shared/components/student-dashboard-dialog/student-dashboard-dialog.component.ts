import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EventsService, SchoolContact } from '../../../core/services/events.service';
import { AttendanceService, IAttendance, AttendanceSummary } from '../../../core/services/attendance.service';
import { UrlContextService } from '../../../core/services/url-context.service';
import { HoursFormatPipe } from '../../pipes/hours-format.pipe';
import { exportAttendanceExcel } from '../../utils/export-attendance-excel';

type Mode = 'search' | 'loading' | 'list';

/**
 * Teacher-facing "look up a student's dashboard" dialog.
 *
 *  • Type-ahead search over school contacts (students only), with a
 *    free-form email fallback for students not yet in the contact list.
 *  • On selection, fetches that student's attendance directly (same data
 *    the real dashboard uses) and shows it as a flat, scannable list —
 *    simpler than embedding the mobile-first dashboard page itself.
 *  • "Export to Excel" reuses the exact same workbook builder as the
 *    student's own dashboard export button.
 */
@Component({
  selector: 'app-student-dashboard-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    HoursFormatPipe,
  ],
  template: `
    <ng-container *ngIf="mode === 'search'">
      <h2 mat-dialog-title class="!text-base !font-bold">View Student Dashboard</h2>

      <mat-dialog-content class="!pt-1 !pb-0">
        <p class="text-sm text-gray-500 mb-3">
          Search for a student, or type their email directly.
        </p>

        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <mat-label>Student</mat-label>
          <input matInput
                 placeholder="Name or email…"
                 [(ngModel)]="inputValue"
                 [matAutocomplete]="auto"
                 (keydown.enter)="tryOpenFreeform()"
                 autocomplete="off" />
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onSelect($event)">
            <mat-option *ngFor="let s of filtered" [value]="s.email">
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm">
                  <span *ngIf="s.name" class="font-medium text-gray-800">{{ s.name }}</span>
                  <span *ngIf="!s.name" class="text-gray-500">{{ s.email }}</span>
                  <span class="text-xs text-gray-400 ml-2">{{ s.email }}</span>
                </span>
                <span *ngIf="s.grade" class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                  Gr {{ s.grade }}
                </span>
              </div>
            </mat-option>
          </mat-autocomplete>
          <mat-hint>Press Enter to open a typed email directly.</mat-hint>
        </mat-form-field>

        <div class="mt-2 flex items-center gap-1 text-xs text-gray-500" *ngIf="loadingContacts">
          <mat-spinner diameter="14"></mat-spinner>
          Loading students…
        </div>

        <p *ngIf="errorMsg" class="text-xs text-red-500 mt-3 bg-red-50 rounded-lg p-2">
          {{ errorMsg }}
        </p>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="!px-6 !pb-4 !pt-3">
        <button mat-button type="button" (click)="dialogRef.close()">Cancel</button>
      </mat-dialog-actions>
    </ng-container>

    <ng-container *ngIf="mode === 'loading'">
      <div class="flex flex-col items-center justify-center gap-3 py-16">
        <mat-spinner diameter="32"></mat-spinner>
        <p class="text-sm text-gray-500">Loading {{ selectedEmail }}…</p>
      </div>
    </ng-container>

    <ng-container *ngIf="mode === 'list'">
      <div class="flex items-center justify-between px-6 pt-5 pb-3">
        <div class="min-w-0">
          <p class="text-sm font-bold text-gray-900 truncate">{{ selectedName || selectedEmail }}</p>
          <p *ngIf="selectedName" class="text-xs text-gray-500 truncate">{{ selectedEmail }}</p>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="!pt-0">
        <div class="flex gap-4 mb-3 text-sm">
          <div><span class="font-bold" style="color:var(--color-primary)">{{ totalHours | hoursFormat }}</span> hours</div>
          <div><span class="font-bold" style="color:var(--color-secondary)">{{ totalPoints }}</span> points</div>
          <div class="text-gray-400">{{ attendance.length }} {{ attendance.length === 1 ? 'entry' : 'entries' }}</div>
        </div>

        <div *ngIf="attendance.length === 0" class="text-sm text-gray-500 py-4 text-center">
          No entries yet for this student.
        </div>

        <div class="max-h-96 overflow-y-auto -mx-1 px-1">
          <div *ngFor="let rec of attendance"
               class="flex items-start justify-between gap-3 py-2.5 border-b border-gray-50 last:border-b-0">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ rec.eventName || 'Event' }}</p>
              <p class="text-xs text-gray-500 truncate">
                <span *ngIf="rec.eventDepartment">{{ rec.eventDepartment }}</span>
                <span *ngIf="rec.eventCategory"> · {{ rec.eventCategory }}</span>
                <span> · {{ rec.timeIn | date:'mediumDate' }}</span>
              </p>
            </div>
            <div class="text-right shrink-0">
              <p *ngIf="rec.hours" class="text-sm font-bold" style="color:var(--color-primary)">{{ rec.hours | hoursFormat }}</p>
              <p *ngIf="rec.pointsAwarded" class="text-sm font-bold" style="color:var(--color-secondary)">+{{ rec.pointsAwarded }}</p>
            </div>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="!px-6 !pb-4 !pt-3">
        <button mat-button type="button" (click)="backToSearch()">Search another</button>
        <button mat-flat-button type="button" (click)="exportToExcel()" [disabled]="attendance.length === 0">
          <mat-icon>download</mat-icon>
          Export to Excel
        </button>
      </mat-dialog-actions>
    </ng-container>
  `,
})
export class StudentDashboardDialogComponent implements OnInit {
  mode: Mode = 'search';

  contacts: SchoolContact[] = [];
  loadingContacts = false;
  inputValue = '';
  errorMsg = '';

  selectedEmail = '';
  selectedName = '';
  attendance: IAttendance[] = [];
  summary: AttendanceSummary | null = null;

  constructor(
    public dialogRef: MatDialogRef<StudentDashboardDialogComponent>,
    private events: EventsService,
    private attendanceService: AttendanceService,
    private ctx: UrlContextService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    const schoolId = this.ctx.schoolId;
    if (!schoolId) return;
    this.loadingContacts = true;
    this.events.getSchoolContacts(schoolId).subscribe({
      next: ({ students }) => {
        this.contacts = students;
        this.loadingContacts = false;
      },
      error: () => (this.loadingContacts = false),
    });
  }

  get filtered(): SchoolContact[] {
    const q = this.inputValue.toLowerCase().trim();
    if (!q) return this.contacts.slice(0, 50);
    return this.contacts
      .filter((c) => c.email.includes(q) || (c.name?.toLowerCase().includes(q) ?? false))
      .slice(0, 50);
  }

  get totalHours(): number {
    return this.attendance.reduce((s, r) => s + (r.hours ?? 0), 0);
  }

  get totalPoints(): number {
    return this.attendance.reduce((s, r) => s + (r.pointsAwarded ?? 0), 0);
  }

  onSelect(event: MatAutocompleteSelectedEvent) {
    const email = event.option.value as string;
    const match = this.contacts.find((c) => c.email === email);
    this.loadStudent(email, match?.name);
  }

  /** Enter pressed with no autocomplete option chosen — try the typed value as a free email. */
  tryOpenFreeform() {
    const raw = this.inputValue.trim();
    if (!raw) return;
    const match = this.contacts.find((c) => c.email.toLowerCase() === raw.toLowerCase());
    if (match) {
      this.loadStudent(match.email, match.name);
      return;
    }
    if (!this.isValidEmail(raw)) {
      this.errorMsg = `"${raw}" doesn't look like a valid email.`;
      return;
    }
    this.loadStudent(raw.toLowerCase());
  }

  backToSearch() {
    this.mode = 'search';
    this.attendance = [];
    this.summary = null;
  }

  exportToExcel() {
    try {
      exportAttendanceExcel(this.summary, this.attendance, this.selectedName || this.selectedEmail);
    } catch (err) {
      console.error('Excel export failed', err);
      this.snack.open('Export failed. Please try again.', 'Close', { duration: 3500 });
    }
  }

  private loadStudent(email: string, name?: string) {
    this.errorMsg = '';
    this.selectedEmail = email;
    this.selectedName = name ?? '';
    this.mode = 'loading';
    const schoolId = this.ctx.schoolId;

    forkJoin({
      attendance: this.attendanceService.getByStudent(email),
      summary: this.attendanceService.getSummary(email, schoolId).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ attendance, summary }) => {
        this.attendance = attendance.sort((a, b) =>
          (b.timeIn?.toString() ?? '').localeCompare(a.timeIn?.toString() ?? ''));
        this.summary = summary;
        this.mode = 'list';
      },
      error: (err) => {
        this.errorMsg = err?.error?.message ?? err?.message ?? 'Could not load this student.';
        this.mode = 'search';
      },
    });
  }

  private isValidEmail(s: string): boolean {
    return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
      .test(s.trim());
  }
}
