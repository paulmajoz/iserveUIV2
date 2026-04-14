import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions } from 'ag-grid-community';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { HoursFormatPipe } from '../../../shared/pipes/hours-format.pipe';
import { AttendanceService, AttendanceSummary, IAttendance } from '../../../core/services/attendance.service';
import { UrlContextService } from '../../../core/services/url-context.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { EventsService } from '../../../core/services/events.service';

interface ProgressBar {
  label: string;
  achieved: number;
  target: number;
  percent: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AgGridAngular, HeaderComponent, HoursFormatPipe],
  template: `
    <app-header></app-header>

    <main class="max-w-5xl mx-auto p-6 space-y-6">

      <!-- Student identity -->
      <div class="card flex items-center gap-4">
        <div class="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white"
             style="background-color: var(--color-primary)">
          {{ initials }}
        </div>
        <div>
          <h2 class="text-xl font-bold text-gray-800">{{ displayName }}</h2>
          <p class="text-sm text-gray-500">{{ ctx.email }}</p>
          <p *ngIf="summary && summary.totalPoints > 0"
             class="text-sm font-semibold mt-1" style="color: var(--color-primary)">
            {{ summary!.totalPoints }} points earned
          </p>
        </div>
        <div class="ml-auto text-right" *ngIf="summary">
          <p class="text-3xl font-bold text-gray-800">{{ summary.totalHours | hoursFormat }}</p>
          <p class="text-xs text-gray-500">Total hours</p>
        </div>
      </div>

      <!-- Hours by type progress bars -->
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
          <p *ngIf="bar.percent >= 100" class="text-xs text-green-600 font-medium">✓ Target met!</p>
        </div>
      </div>

      <!-- Hours breakdown -->
      <div *ngIf="summary" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="card" *ngIf="hoursByTypeEntries.length">
          <h3 class="font-semibold text-gray-700 mb-4">Hours by Type</h3>
          <div *ngFor="let entry of hoursByTypeEntries" class="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
            <span class="text-gray-600">{{ entry[0] }}</span>
            <span class="font-medium text-gray-800">{{ entry[1] | hoursFormat }}</span>
          </div>
        </div>
        <div class="card" *ngIf="hoursByCatEntries.length">
          <h3 class="font-semibold text-gray-700 mb-4">Hours by Category</h3>
          <div *ngFor="let entry of hoursByCatEntries" class="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
            <span class="text-gray-600">{{ entry[0] }}</span>
            <span class="font-medium text-gray-800">{{ entry[1] | hoursFormat }}</span>
          </div>
        </div>
      </div>

      <!-- Attendance records -->
      <div class="card space-y-3">
        <h3 class="font-semibold text-gray-700">Attendance Records</h3>
        <div style="height: 400px;">
          <ag-grid-angular
            class="ag-theme-alpine w-full h-full rounded-xl overflow-hidden"
            [rowData]="attendance"
            [columnDefs]="columnDefs"
            [gridOptions]="gridOptions"
          ></ag-grid-angular>
        </div>
      </div>

      <!-- Loading spinner -->
      <div *ngIf="loading" class="flex justify-center py-12">
        <div class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    </main>
  `,
})
export class DashboardComponent implements OnInit {
  loading = true;
  summary?: AttendanceSummary;
  attendance: IAttendance[] = [];
  progressBars: ProgressBar[] = [];

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

  columnDefs: ColDef[] = [
    { field: 'eventId', headerName: 'Event', flex: 2, filter: 'agTextColumnFilter' },
    {
      field: 'timeIn', headerName: 'Date', width: 130,
      valueFormatter: (p: any) => new Date(p.value).toLocaleDateString(),
      sort: 'desc',
    },
    {
      field: 'hours', headerName: 'Hours', width: 100,
      valueFormatter: (p: any) => {
        if (p.value == null) return '—';
        const h = Math.floor(p.value), m = Math.round((p.value - h) * 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      },
    },
    { field: 'pointsAwarded', headerName: 'Points', width: 90 },
    {
      field: 'source', headerName: 'Type', width: 100,
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
  };

  constructor(
    private attendanceService: AttendanceService,
    public ctx: UrlContextService,
    private route: ActivatedRoute,
    private theme: ThemeService,
  ) {}

  ngOnInit() {
    // Capture URL context if coming from deep link
    const params = this.route.snapshot.queryParams;
    this.ctx.captureFromUrl(params);

    const email = this.ctx.email;
    const schoolId = this.ctx.schoolId;

    if (!email) {
      this.loading = false;
      return;
    }

    this.theme.loadAndApply(schoolId);

    this.attendanceService.getSummary(email, schoolId).subscribe(s => {
      this.summary = s;
      this.buildProgressBars(s);
    });

    this.attendanceService.getByStudent(email).subscribe(records => {
      this.attendance = records;
      this.loading = false;
    });
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
