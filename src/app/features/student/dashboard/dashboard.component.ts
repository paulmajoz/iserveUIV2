import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { HoursFormatPipe } from '../../../shared/pipes/hours-format.pipe';
import { AttendanceService, AttendanceSummary, IAttendance } from '../../../core/services/attendance.service';
import { UrlContextService } from '../../../core/services/url-context.service';
import { ThemeService } from '../../../core/theme/theme.service';

interface ProgressBar {
  label: string;
  achieved: number;
  target: number;
  percent: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AgGridAngular, MatIconModule, MatProgressSpinnerModule, HeaderComponent, HoursFormatPipe],
  template: `
    <app-header></app-header>

    <main class="max-w-5xl mx-auto p-4 pb-12 space-y-6">

      <!-- Loading -->
      <div *ngIf="loading" class="flex justify-center py-16">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- No context error -->
      <div *ngIf="!loading && !ctx.email" class="error-banner mt-6">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">No student context found</p>
          <p class="mt-0.5 text-red-600">Please access this page via your school link.</p>
        </div>
      </div>

      <!-- API error -->
      <div *ngIf="!loading && apiError" class="error-banner mt-6">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">Could not load dashboard</p>
          <p class="mt-0.5 text-red-600">{{ apiError }}</p>
        </div>
      </div>

      <ng-container *ngIf="!loading && ctx.email">

        <!-- Student identity card -->
        <div class="card flex items-center gap-4 flex-wrap mt-6">
          <div class="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
               style="background-color: var(--color-primary)">
            {{ initials }}
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-xl font-bold text-gray-800">{{ displayName }}</h2>
            <p class="text-sm text-gray-500">{{ ctx.email }}</p>
            <p *ngIf="summary && summary.totalPoints > 0"
               class="text-sm font-semibold mt-1" style="color: var(--color-primary)">
              {{ summary.totalPoints }} points earned
            </p>
          </div>
          <div class="text-right shrink-0" *ngIf="summary">
            <p class="text-3xl font-bold text-gray-800">{{ summary.totalHours | hoursFormat }}</p>
            <p class="text-xs text-gray-500">Total hours</p>
          </div>
        </div>

        <!-- Progress bars -->
        <div *ngIf="progressBars.length > 0" class="card space-y-5">
          <h3 class="font-semibold text-gray-700">Progress Towards Targets</h3>
          <div *ngFor="let bar of progressBars" class="space-y-1">
            <div class="flex justify-between text-sm">
              <span class="font-medium text-gray-700">{{ bar.label }}</span>
              <span class="text-gray-500">
                {{ bar.achieved | hoursFormat }} / {{ bar.target | hoursFormat }}
              </span>
            </div>
            <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500"
                   [style.width.%]="bar.percent"
                   [style.background-color]="bar.percent >= 100 ? '#22c55e' : 'var(--color-primary)'">
              </div>
            </div>
            <p *ngIf="bar.percent >= 100" class="text-xs text-green-600 font-medium">Target met!</p>
          </div>
        </div>

        <!-- Hours breakdown -->
        <div *ngIf="summary" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="card" *ngIf="hoursByTypeEntries.length">
            <h3 class="font-semibold text-gray-700 mb-4">Hours by Type</h3>
            <div *ngFor="let entry of hoursByTypeEntries"
                 class="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0">
              <span class="text-gray-600">{{ entry[0] }}</span>
              <span class="font-medium text-gray-800">{{ entry[1] | hoursFormat }}</span>
            </div>
          </div>
          <div class="card" *ngIf="hoursByCatEntries.length">
            <h3 class="font-semibold text-gray-700 mb-4">Hours by Category</h3>
            <div *ngFor="let entry of hoursByCatEntries"
                 class="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0">
              <span class="text-gray-600">{{ entry[0] }}</span>
              <span class="font-medium text-gray-800">{{ entry[1] | hoursFormat }}</span>
            </div>
          </div>
        </div>

        <!-- No summary yet -->
        <div *ngIf="!summary && !apiError" class="info-banner">
          <mat-icon class="shrink-0 text-blue-500">info</mat-icon>
          <p>No attendance records found yet. Scan a QR code to get started!</p>
        </div>

        <!-- Attendance records grid -->
        <div *ngIf="attendance.length > 0" class="card space-y-3">
          <h3 class="font-semibold text-gray-700">Attendance Records</h3>
          <div style="height: 400px;">
            <ag-grid-angular
              class="ag-theme-alpine w-full h-full rounded-xl overflow-hidden"
              [rowData]="attendance"
              [columnDefs]="columnDefs"
              [gridOptions]="gridOptions"
              rowGroupPanelShow="never"
              pivotPanelShow="never"
              [sideBar]="false"
              (gridReady)="onGridReady($event)"
            ></ag-grid-angular>
          </div>
        </div>

        <!-- Attendance load error -->
        <div *ngIf="attendanceError" class="error-banner">
          <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
          <div>
            <p class="font-semibold">Could not load attendance history</p>
            <p class="mt-0.5 text-red-600">{{ attendanceError }}</p>
          </div>
        </div>

      </ng-container>
    </main>
  `,
})
export class DashboardComponent implements OnInit {
  loading = true;
  summary?: AttendanceSummary;
  attendance: IAttendance[] = [];
  progressBars: ProgressBar[] = [];
  apiError = '';
  attendanceError = '';
  private gridApi: any;

  get displayName(): string {
    const c = this.ctx.context;
    if (!c) return this.ctx.email;
    return [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email;
  }

  get initials(): string {
    const c = this.ctx.context;
    const first = c?.firstName?.[0] ?? '';
    const last = c?.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || (c?.email?.[0]?.toUpperCase() ?? '?');
  }

  get hoursByTypeEntries(): [string, number][] {
    return Object.entries(this.summary?.hoursByType ?? {});
  }

  get hoursByCatEntries(): [string, number][] {
    return Object.entries(this.summary?.hoursByCategory ?? {});
  }

  // colId on every column so setColumnsVisible references are unambiguous
  columnDefs: ColDef[] = [
    { colId: 'eventId', field: 'eventId', headerName: 'Event', flex: 2, minWidth: 120, filter: 'agTextColumnFilter' },
    {
      colId: 'timeIn', field: 'timeIn', headerName: 'Date', width: 130,
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString() : '—',
      sort: 'desc',
    },
    {
      colId: 'hours', field: 'hours', headerName: 'Hours', width: 100,
      valueFormatter: (p: any) => {
        if (p.value == null) return '—';
        const h = Math.floor(p.value), m = Math.round((p.value - h) * 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      },
    },
    { colId: 'pointsAwarded', field: 'pointsAwarded', headerName: 'Points', width: 90 },
    {
      colId: 'source', field: 'source', headerName: 'Type', width: 100,
      cellRenderer: (p: any) => p.value === 'assisted'
        ? '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Assisted</span>'
        : '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Self</span>',
    },
  ];

  gridOptions: GridOptions = {
    defaultColDef: { resizable: true, sortable: true },
    pagination: true,
    paginationPageSize: 15,
    rowHeight: 44,
    rowGroupPanelShow: 'never',
    pivotPanelShow:    'never',
  };

  constructor(
    private attendanceService: AttendanceService,
    public ctx: UrlContextService,
    private route: ActivatedRoute,
    private theme: ThemeService,
  ) {}

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    this.ctx.captureFromUrl(params);

    const email = this.ctx.email;
    const schoolId = this.ctx.schoolId;

    if (!email) {
      this.loading = false;
      return;
    }

    this.theme.loadAndApply(schoolId);

    let summaryDone = false;
    let attendanceDone = false;
    const checkDone = () => { if (summaryDone && attendanceDone) this.loading = false; };

    this.attendanceService.getSummary(email, schoolId).subscribe({
      next: s => {
        this.summary = s;
        this.buildProgressBars(s);
        summaryDone = true;
        checkDone();
      },
      error: err => {
        this.apiError = err?.error?.message ?? err?.message ?? 'Failed to load summary data.';
        summaryDone = true;
        checkDone();
      },
    });

    this.attendanceService.getByStudent(email).subscribe({
      next: records => {
        this.attendance = records;
        attendanceDone = true;
        checkDone();
      },
      error: err => {
        this.attendanceError = err?.error?.message ?? err?.message ?? 'Failed to load attendance history.';
        attendanceDone = true;
        checkDone();
      },
    });
  }

  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;
    this.applyResponsiveColumns();
    window.addEventListener('resize', () => this.applyResponsiveColumns());
  }

  // xs  < 480 : Event name + Hours
  // sm  480+  : + Type (source)
  // md  768+  : + Date + Points
  private applyResponsiveColumns() {
    if (!this.gridApi) return;
    const w = window.innerWidth;
    this.gridApi.setColumnsVisible(['source'],                   w >= 480);
    this.gridApi.setColumnsVisible(['timeIn', 'pointsAwarded'],  w >= 768);
  }

  private buildProgressBars(summary: AttendanceSummary) {
    const targets = { ...summary.gradeTargetHours, ...summary.honoursTargetHours };
    const grade = this.ctx.context?.grade;

    this.progressBars = Object.entries(summary.hoursByType).map(([type, achieved]) => {
      const targetKey = grade ? `grade${grade}` : Object.keys(targets)[0];
      const target = targets[targetKey] ?? 0;
      return {
        label: type,
        achieved,
        target,
        percent: target > 0 ? Math.min((achieved / target) * 100, 100) : 0,
      };
    });
  }
}
