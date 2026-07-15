import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { HoursFormatPipe } from '../../../shared/pipes/hours-format.pipe';
import { AttendanceService, IAttendance } from '../../../core/services/attendance.service';
import { UrlContextService } from '../../../core/services/url-context.service';
import { ThemeService } from '../../../core/theme/theme.service';

type Tab = 'Hours' | 'Points' | 'Attendance';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    HeaderComponent,
    HoursFormatPipe,
  ],
  template: `
    <app-header></app-header>

    <main class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

      <!-- Loading -->
      <div *ngIf="loading" class="flex justify-center py-16">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- No email — can't identify the student -->
      <div *ngIf="!loading && !studentEmail" class="error-banner m-3 mt-6">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">No student email in the URL</p>
          <p class="mt-0.5 text-red-600">
            Open this page via your school link so we can show your hours, points
            and attendance — the URL must include <code>?email=…</code>.
          </p>
        </div>
      </div>

      <!-- API error -->
      <div *ngIf="!loading && apiError" class="error-banner m-3 mt-6">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">Could not load dashboard</p>
          <p class="mt-0.5 text-red-600">{{ apiError }}</p>
        </div>
      </div>

      <ng-container *ngIf="!loading && studentEmail">

        <!-- ── Student identity card ─────────────────────── -->
        <div class="max-w-3xl mx-auto m-3 mb-2 p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                 style="background: linear-gradient(135deg, var(--color-primary), var(--color-secondary))">
              {{ initials }}
            </div>
            <div class="flex-1 min-w-0">
              <h1 class="text-lg font-bold text-gray-900">{{ displayName }}</h1>
              <p class="text-xs text-gray-500">{{ studentGradeClass }}</p>
            </div>
          </div>
        </div>

        <!-- ── Tab navigation ─────────────────────── -->
        <div class="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div class="max-w-3xl mx-auto px-3 pt-1">
            <div class="flex gap-2 overflow-x-auto">
              <button *ngFor="let tab of tabs"
                      (click)="activeTab = tab"
                      class="px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
                      [style.border-bottom-color]="activeTab === tab ? 'var(--color-primary)' : 'transparent'"
                      [style.color]="activeTab === tab ? 'var(--color-primary)' : '#9ca3af'">
                <i [class]="getTabIcon(tab)" style="margin-right:6px"></i>
                {{ tab }}
              </button>
            </div>
          </div>
        </div>

        <!-- ── TAB CONTENT ─────────────────────── -->
        <div class="max-w-3xl mx-auto px-3 pb-12 pt-4 space-y-4">

          <!-- ═════════════════ HOURS TAB ═════════════════ -->
          <ng-container *ngIf="activeTab === 'Hours'">

            <!-- Total summary pill -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-gray-500">Total Hours</p>
                <p class="text-2xl font-bold mt-1" style="color:var(--color-primary)">{{ totalHours | hoursFormat }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-400">{{ hoursRecords.length }} {{ hoursRecords.length === 1 ? 'event' : 'events' }}</p>
              </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Hours Events</h3>

              <div *ngIf="hoursRecords.length === 0" class="text-sm text-gray-500 py-2">
                No hours logged yet.
              </div>

              <div class="space-y-1">
                <div *ngFor="let rec of hoursRecords"
                     class="flex items-start justify-between gap-3 py-2.5 border-b border-gray-50 last:border-b-0">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ rec.eventName || 'Event' }}</p>
                    <p class="text-xs text-gray-500 truncate">
                      <span *ngIf="rec.eventDepartment">{{ rec.eventDepartment }} · </span>
                      {{ rec.timeIn | date:'mediumDate' }}
                      <span *ngIf="rec.timeOut"> · {{ rec.timeIn | date:'shortTime' }} – {{ rec.timeOut | date:'shortTime' }}</span>
                    </p>
                    <p *ngIf="rec.description" class="text-xs text-gray-600 mt-0.5 line-clamp-2">{{ rec.description }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-sm font-bold" style="color:var(--color-primary)">{{ rec.hours | hoursFormat }}</p>
                    <p *ngIf="!rec.hours && !rec.timeOut" class="text-xs text-amber-500 mt-0.5">Pending out</p>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>

          <!-- ═════════════════ POINTS TAB ═════════════════ -->
          <ng-container *ngIf="activeTab === 'Points'">

            <!-- Total summary pill -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-gray-500">Total Points</p>
                <p class="text-2xl font-bold mt-1" style="color:var(--color-secondary)">{{ totalPoints }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-400">{{ pointsRecords.length }} {{ pointsRecords.length === 1 ? 'event' : 'events' }}</p>
              </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Points Events</h3>

              <div *ngIf="pointsRecords.length === 0" class="text-sm text-gray-500 py-2">
                No points earned yet.
              </div>

              <div class="space-y-1">
                <div *ngFor="let rec of pointsRecords"
                     class="flex items-start justify-between gap-3 py-2.5 border-b border-gray-50 last:border-b-0">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ rec.eventName || 'Event' }}</p>
                    <p class="text-xs text-gray-500 truncate">
                      <span *ngIf="rec.eventDepartment">{{ rec.eventDepartment }} · </span>
                      {{ rec.timeIn | date:'mediumDate' }}
                    </p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-sm font-bold" style="color:var(--color-secondary)">+{{ rec.pointsAwarded }}</p>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>

          <!-- ═════════════════ ATTENDANCE TAB ═════════════════ -->
          <ng-container *ngIf="activeTab === 'Attendance'">

            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div class="flex items-baseline justify-between mb-3">
                <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500">Attendance Only Events</h3>
                <span class="text-xs text-gray-400">
                  {{ attendanceOnlyRecords.length }} {{ attendanceOnlyRecords.length === 1 ? 'record' : 'records' }}
                </span>
              </div>

              <div *ngIf="attendanceOnlyRecords.length === 0" class="text-sm text-gray-500 py-2">
                No attendance-only records yet.
              </div>

              <div class="space-y-1">
                <div *ngFor="let rec of attendanceOnlyRecords"
                     class="flex items-start justify-between gap-3 py-2.5 border-b border-gray-50 last:border-b-0">
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                       style="background-color:color-mix(in srgb, var(--color-primary) 12%, white)">
                    <i class="fa-solid fa-check" style="color:var(--color-primary);font-size:13px"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ rec.eventName || 'Event' }}</p>
                    <p class="text-xs text-gray-500 truncate">
                      {{ rec.timeIn | date:'short' }}
                      <span *ngIf="rec.timeOut"> – {{ rec.timeOut | date:'shortTime' }}</span>
                      <span *ngIf="rec.eventDepartment"> · {{ rec.eventDepartment }}</span>
                    </p>
                  </div>
                  <div class="shrink-0">
                    <span class="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">Present</span>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>

        </div>
      </ng-container>
    </main>
  `,
})
export class DashboardComponent implements OnInit {
  loading = true;
  apiError = '';
  attendance: IAttendance[] = [];

  /** The email the dashboard is currently rendered for. Captured at init
   *  from the URL — sessionStorage is only used as a final fallback. */
  studentEmail = '';

  activeTab: Tab = 'Hours';
  readonly tabs: Tab[] = ['Hours', 'Points', 'Attendance'];

  constructor(
    private attendanceService: AttendanceService,
    public ctx: UrlContextService,
    private route: ActivatedRoute,
    private theme: ThemeService,
  ) {}

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    this.ctx.captureFromUrl(params);

    // Prefer the email in the URL — it identifies the student we're viewing.
    const urlEmail = ((params['email'] as string) ?? '').trim().toLowerCase();
    this.studentEmail = urlEmail || (this.ctx.email ?? '').trim().toLowerCase();
    const schoolId = this.ctx.schoolId;

    if (!this.studentEmail) {
      this.loading = false;
      return;
    }

    this.theme.loadAndApply(schoolId);

    this.attendanceService.getByStudent(this.studentEmail).subscribe({
      next: records => {
        this.attendance = records.sort((a, b) =>
          (b.timeIn?.toString() ?? '').localeCompare(a.timeIn?.toString() ?? ''));
        this.loading = false;
      },
      error: err => {
        this.apiError = err?.error?.message ?? err?.message ?? 'Failed to load attendance history.';
        this.loading = false;
      },
    });
  }

  // ── Identity helpers ────────────────────────────────────────────────────
  get displayName(): string {
    const c = this.ctx.context;
    if (c && c.email?.toLowerCase() === this.studentEmail) {
      return [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email;
    }
    const rec = this.attendance.find(r =>
      [r.studentFirstName, r.studentLastName].some(Boolean));
    if (rec) return [rec.studentFirstName, rec.studentLastName].filter(Boolean).join(' ');
    return this.studentEmail;
  }

  get initials(): string {
    const name = this.displayName;
    if (name && name.includes('@')) return name[0]?.toUpperCase() ?? '?';
    const parts = name.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  }

  get studentGradeClass(): string {
    const c = this.ctx.context;
    if (c && c.email?.toLowerCase() === this.studentEmail) {
      return [c.grade ? 'Grade ' + c.grade : '', c.studentClass].filter(Boolean).join(' · ');
    }
    const rec = this.attendance.find(r => r.studentGrade || r.studentClass);
    if (!rec) return '';
    return [rec.studentGrade ? 'Grade ' + rec.studentGrade : '', rec.studentClass].filter(Boolean).join(' · ');
  }

  // ── Hours ──────────────────────────────────────────────────────────────
  /** Records for events that track hours (hourMode is not disabled). */
  get hoursRecords(): IAttendance[] {
    return this.attendance.filter(r => r.eventHourMode && r.eventHourMode !== 'disabled');
  }

  get totalHours(): number {
    return this.hoursRecords.reduce((s, r) => s + (r.hours ?? 0), 0);
  }

  // ── Points ──────────────────────────────────────────────────────────────
  /** Records for events where points are enabled. */
  get pointsRecords(): IAttendance[] {
    return this.attendance.filter(r => r.eventPointsEnabled === true);
  }

  get totalPoints(): number {
    return this.pointsRecords.reduce((s, r) => s + (r.pointsAwarded ?? 0), 0);
  }

  // ── Attendance only ─────────────────────────────────────────────────────
  /** Records for events that track attendance only (no hours, no points). */
  get attendanceOnlyRecords(): IAttendance[] {
    return this.attendance.filter(
      r => (!r.eventHourMode || r.eventHourMode === 'disabled') && !r.eventPointsEnabled
    );
  }

  getTabIcon(tab: Tab): string {
    switch (tab) {
      case 'Hours':      return 'fa-solid fa-hourglass-end';
      case 'Points':     return 'fa-solid fa-star';
      case 'Attendance': return 'fa-solid fa-check-double';
      default:           return '';
    }
  }
}
