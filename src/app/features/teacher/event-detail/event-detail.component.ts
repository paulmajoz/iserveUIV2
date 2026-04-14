import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { QrScannerComponent, ScannedPayload } from '../../../shared/components/qr-scanner/qr-scanner.component';
import { HoursFormatPipe } from '../../../shared/pipes/hours-format.pipe';
import { EventsService, IEvent } from '../../../core/services/events.service';
import { AttendanceService, IAttendance, SubmitAttendancePayload } from '../../../core/services/attendance.service';
import { UrlContextService } from '../../../core/services/url-context.service';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    CommonModule,
    AgGridAngular,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    HeaderComponent,
    HoursFormatPipe,
    QrScannerComponent,
  ],
  template: `
    <app-header></app-header>

    <main class="flex flex-col h-[calc(100vh-64px)]">

      <!-- Loading state -->
      <div *ngIf="loadingEvent" class="flex justify-center py-16">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- Event load error -->
      <div *ngIf="eventError" class="error-banner m-6">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">Could not load event</p>
          <p class="mt-0.5 text-red-600">{{ eventError }}</p>
        </div>
      </div>

      <!-- Event summary bar -->
      <div *ngIf="event" class="px-6 py-4 bg-white border-b border-gray-100">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-4">
            <button type="button"
                    (click)="router.navigate(['/teacher/events'], { queryParams: qp })"
                    class="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    aria-label="Back to events">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div>
              <h2 class="text-xl font-bold text-gray-800">{{ event.eventName }}</h2>
              <div class="flex gap-3 text-sm text-gray-500 mt-0.5">
                <span>{{ event.qrMode === 'in-out' ? 'In/Out' : 'Single Scan' }}</span>
                <span>•</span>
                <span>{{ hourModeLabel }}</span>
                <span *ngIf="event.pointsEnabled">• {{ event.pointsValue }}pts/scan</span>
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn-secondary !px-4 !py-2 !text-sm"
                    (click)="router.navigate(['/teacher/events', eventId, 'qr'], { queryParams: qp })">
              View QR Codes
            </button>
            <button type="button" class="btn-primary !px-4 !py-2 !text-sm"
                    (click)="showScanner = !showScanner">
              {{ showScanner ? 'Hide Scanner' : 'Scan Student' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Scanner panel -->
      <div *ngIf="showScanner" class="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-col items-center gap-4">
        <p class="text-sm font-medium text-gray-600">Scan a student's QR badge to record attendance</p>
        <app-qr-scanner (scanned)="onStudentScanned($event)"></app-qr-scanner>
        <div *ngIf="scanError" class="error-banner w-full max-w-md">
          <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
          <p>{{ scanError }}</p>
        </div>
      </div>

      <!-- Stats bar -->
      <div *ngIf="event" class="grid grid-cols-3 px-6 py-3 bg-gray-50 border-b border-gray-100 gap-4">
        <div class="text-center">
          <p class="text-2xl font-bold text-gray-800">{{ attendance.length }}</p>
          <p class="text-xs text-gray-500">Total Scans</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-gray-800">{{ uniqueStudents }}</p>
          <p class="text-xs text-gray-500">Students</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-gray-800">{{ totalHours | hoursFormat }}</p>
          <p class="text-xs text-gray-500">Total Hours</p>
        </div>
      </div>

      <!-- Attendance load error -->
      <div *ngIf="attendanceError" class="error-banner mx-6 mt-4">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">Could not load attendance records</p>
          <p class="mt-0.5 text-red-600">{{ attendanceError }}</p>
        </div>
      </div>

      <!-- Attendance grid -->
      <div *ngIf="event && !attendanceError" class="flex-1 p-4">
        <div class="flex justify-end mb-2">
          <button type="button" (click)="exportCsv()"
                  class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <mat-icon class="!text-base !w-4 !h-4">download</mat-icon>
            Export CSV
          </button>
        </div>
        <ag-grid-angular
          class="ag-theme-alpine w-full h-full rounded-xl overflow-hidden shadow-sm"
          [rowData]="attendance"
          [columnDefs]="columnDefs"
          [gridOptions]="gridOptions"
          rowGroupPanelShow="never"
          pivotPanelShow="never"
          [sideBar]="false"
          (gridReady)="onGridReady($event)"
        ></ag-grid-angular>
      </div>

    </main>
  `,
})
export class EventDetailComponent implements OnInit {
  event?: IEvent;
  attendance: IAttendance[] = [];
  eventId = '';
  loadingEvent = true;
  showScanner = false;
  eventError = '';
  attendanceError = '';
  scanError = '';
  private gridApi: any;

  get qp() {
    const c = this.ctx.context;
    return c ? { email: c.email, role: c.role, schoolId: c.schoolId } : {};
  }

  get uniqueStudents(): number {
    return new Set(this.attendance.map(a => a.studentEmail)).size;
  }

  get totalHours(): number {
    return this.attendance.reduce((s, a) => s + (a.hours ?? 0), 0);
  }

  get hourModeLabel(): string {
    const map: Record<string, string> = { 'in-out': 'In/Out', fixed: 'Fixed', volume: 'Volume', disabled: 'No Hours' };
    return map[this.event?.hourMode ?? ''] ?? (this.event?.hourMode ?? '');
  }

  columnDefs: ColDef[] = [
    {
      headerName: 'Student',
      valueGetter: (p: any) => [p.data.studentFirstName, p.data.studentLastName].filter(Boolean).join(' ') || p.data.studentEmail,
      flex: 2, filter: 'agTextColumnFilter',
    },
    { field: 'studentEmail', headerName: 'Email', flex: 2, filter: 'agTextColumnFilter' },
    { field: 'studentGrade', headerName: 'Grade', width: 90 },
    { field: 'studentClass', headerName: 'Class', width: 90 },
    {
      field: 'timeIn', headerName: 'Time In', width: 160,
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleString() : '—',
    },
    {
      field: 'timeOut', headerName: 'Time Out', width: 160,
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleString() : '—',
    },
    {
      field: 'hours', headerName: 'Hours', width: 100,
      valueFormatter: (p: any) => {
        if (p.value == null) return '—';
        const h = Math.floor(p.value), m = Math.round((p.value - h) * 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      },
    },
    { field: 'pointsAwarded', headerName: 'Points', width: 100 },
    {
      field: 'source', headerName: 'Source', width: 110,
      cellRenderer: (p: any) => p.value === 'assisted'
        ? '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Assisted</span>'
        : '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Self</span>',
    },
  ];

  gridOptions: GridOptions = {
    defaultColDef: { resizable: true, sortable: true },
    pagination: true,
    paginationPageSize: 25,
    rowHeight: 48,
    rowGroupPanelShow: 'never',
    pivotPanelShow:    'never',
    suppressRowClickSelection: true,
  };

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private eventsService: EventsService,
    private attendanceService: AttendanceService,
    public ctx: UrlContextService,
    private snack: MatSnackBar,
  ) {}

  private isValidId(id: string): boolean {
    return /^[a-f\d]{24}$/i.test(id);
  }

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.isValidId(this.eventId)) {
      this.loadingEvent = false;
      this.eventError = `Invalid event ID "${this.eventId}". Navigate to an event from the Events list.`;
      return;
    }
    this.eventsService.getEventById(this.eventId).subscribe({
      next: e => {
        this.event = e;
        this.loadingEvent = false;
      },
      error: err => {
        this.loadingEvent = false;
        this.eventError = err?.error?.message ?? err?.message ?? 'Failed to load event details.';
      },
    });
    this.loadAttendance();
  }

  loadAttendance() {
    this.attendanceError = '';
    this.attendanceService.getByEvent(this.eventId).subscribe({
      next: a => (this.attendance = a),
      error: err => {
        this.attendanceError = err?.error?.message ?? err?.message ?? 'Failed to load attendance records.';
      },
    });
  }

  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;
    if (window.innerWidth < 768) {
      this.gridApi.setColumnsVisible(['studentEmail', 'studentClass', 'source'], false);
    }
  }

  exportCsv() {
    this.gridApi?.exportDataAsCsv({ fileName: `${this.event?.eventName ?? 'attendance'}.csv` });
  }

  onStudentScanned(payload: ScannedPayload) {
    this.scanError = '';
    if (!payload.studentEmail) {
      this.scanError = 'Could not read student email from QR code.';
      return;
    }
    const dto: SubmitAttendancePayload = {
      eventId: this.eventId,
      studentEmail: payload.studentEmail,
      direction: 'in',
      studentFirstName: payload.studentFirst,
      studentLastName: payload.studentLast,
      studentGrade: payload.studentGrade,
      studentClass: payload.studentClass,
      schoolId: payload.schoolId,
      teacherEmail: this.ctx.email,
    };
    this.attendanceService.assistedScan(dto).subscribe({
      next: () => {
        this.snack.open('Attendance recorded ✓', 'Close', { duration: 2000 });
        this.loadAttendance();
        this.showScanner = false;
      },
      error: (err) => {
        this.scanError = err?.error?.message ?? err?.message ?? 'Scan failed. Please try again.';
      },
    });
  }
}
