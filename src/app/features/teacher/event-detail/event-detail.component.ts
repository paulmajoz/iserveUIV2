import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ModuleRegistry, ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { ExcelExportModule } from 'ag-grid-enterprise';

ModuleRegistry.registerModules([ExcelExportModule]);
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    HeaderComponent,
    HoursFormatPipe,
    QrScannerComponent,
  ],
  template: `
    <app-header></app-header>

    <main class="flex flex-col" style="height:calc(100vh - 48px)">

      <!-- Loading -->
      <div *ngIf="loadingEvent" class="flex justify-center py-16">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- Event load error -->
      <div *ngIf="eventError" class="error-banner m-4">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">Could not load event</p>
          <p class="mt-0.5 text-red-600">{{ eventError }}</p>
        </div>
      </div>

      <!-- Top bar: back + name + actions -->
      <div *ngIf="event" class="px-3 py-2 bg-white border-b border-gray-100 shrink-0">

        <!-- Row 1: back button + event name -->
        <div class="flex items-center gap-2 min-w-0">
          <button mat-icon-button
                  (click)="router.navigate(['/teacher/events'], { queryParams: qp })"
                  aria-label="Back to events">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="flex-1 min-w-0">
            <h2 class="text-sm font-semibold text-gray-900 truncate">{{ event.eventName }}</h2>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ event.qrMode === 'in-out' ? 'In/Out' : 'Single Scan' }}
              <span class="mx-1">·</span>{{ hourModeLabel }}
              <span *ngIf="event.pointsEnabled" class="mx-1">·</span>
              <span *ngIf="event.pointsEnabled">{{ event.pointsValue }}pts</span>
            </p>
          </div>
        </div>

        <!-- Row 2: action buttons -->
        <div class="flex items-center gap-2 mt-2 pl-10">
          <button mat-stroked-button class="flex-1"
                  (click)="router.navigate(['/teacher/events', eventId, 'qr'], { queryParams: qp })">
            <mat-icon>qr_code</mat-icon>
            QR Codes
          </button>
          <button mat-flat-button class="flex-1"
                  (click)="showScanner = !showScanner">
            <mat-icon>{{ showScanner ? 'close' : 'qr_code_scanner' }}</mat-icon>
            {{ showScanner ? 'Hide' : 'Scan' }}
          </button>
        </div>
      </div>

      <!-- Scanner panel -->
      <div *ngIf="showScanner" class="px-4 py-3 bg-gray-50 border-b border-gray-100 flex flex-col items-center gap-3">
        <p class="text-sm font-medium text-gray-600 text-center">Scan a student's QR badge</p>
        <app-qr-scanner (scanned)="onStudentScanned($event)"></app-qr-scanner>
        <div *ngIf="scanError" class="error-banner w-full">
          <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
          <p>{{ scanError }}</p>
        </div>
      </div>

      <!-- Stats bar -->
      <div *ngIf="event" class="grid grid-cols-3 px-3 py-2 bg-gray-50 border-b border-gray-100 shrink-0 gap-2">
        <div class="text-center">
          <p class="text-lg font-bold text-gray-800">{{ attendance.length }}</p>
          <p class="text-xs text-gray-500">Scans</p>
        </div>
        <div class="text-center">
          <p class="text-lg font-bold text-gray-800">{{ uniqueStudents }}</p>
          <p class="text-xs text-gray-500">Students</p>
        </div>
        <div class="text-center">
          <p class="text-lg font-bold text-gray-800">{{ totalHours | hoursFormat }}</p>
          <p class="text-xs text-gray-500">Hours</p>
        </div>
      </div>

      <!-- Attendance load error -->
      <div *ngIf="attendanceError" class="error-banner mx-3 mt-3">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">Could not load attendance</p>
          <p class="mt-0.5 text-red-600">{{ attendanceError }}</p>
        </div>
      </div>

      <!-- Attendance grid -->
      <div *ngIf="event && !attendanceError" class="flex-1 p-3 min-h-0">
        <div class="flex justify-end mb-2">
          <button mat-button (click)="exportExcel()" style="color:#6b7280; font-size:12px">
            <mat-icon style="font-size:16px">download</mat-icon>
            Export Excel
          </button>
        </div>
        <ag-grid-angular
          class="ag-theme-alpine w-full rounded-xl overflow-hidden shadow-sm"
          style="height: calc(100% - 36px)"
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

  // colId on every column so setColumnsVisible references are unambiguous
  columnDefs: ColDef[] = [
    {
      colId: 'student',
      headerName: 'Student',
      flex: 2,
      minWidth: 120,
      filter: 'agTextColumnFilter',
      valueGetter: (p: any) =>
        [p.data.studentFirstName, p.data.studentLastName].filter(Boolean).join(' ')
        || p.data.studentEmail,
    },
    { colId: 'studentEmail',  field: 'studentEmail',  headerName: 'Email',    flex: 2, minWidth: 140, filter: 'agTextColumnFilter' },
    { colId: 'studentGrade',  field: 'studentGrade',  headerName: 'Grade',    width: 80 },
    { colId: 'studentClass',  field: 'studentClass',  headerName: 'Class',    width: 80 },
    {
      colId: 'timeIn', field: 'timeIn', headerName: 'Time In', width: 160,
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleString() : '—',
    },
    {
      colId: 'timeOut', field: 'timeOut', headerName: 'Time Out', width: 160,
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleString() : '—',
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
      colId: 'source', field: 'source', headerName: 'Source', width: 110,
      cellRenderer: (p: any) => p.value === 'assisted'
        ? '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Assisted</span>'
        : '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Self</span>',
    },
  ];

  gridOptions: GridOptions = {
    defaultColDef: { resizable: true, sortable: true },
    pagination: true,
    paginationPageSize: 25,
    rowHeight: 36,
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
    this.applyResponsiveColumns();
    window.addEventListener('resize', () => this.applyResponsiveColumns());
  }

  // xs  < 480 : Student name + Hours
  // sm  480+  : + Source + Points
  // md  768+  : + Email + Time In
  // lg  1024+ : + Grade + Class + Time Out
  private applyResponsiveColumns() {
    if (!this.gridApi) return;
    const w = window.innerWidth;
    this.gridApi.setColumnsVisible(['source', 'pointsAwarded'],              w >= 480);
    this.gridApi.setColumnsVisible(['studentEmail', 'timeIn'],               w >= 768);
    this.gridApi.setColumnsVisible(['studentGrade', 'studentClass', 'timeOut'], w >= 1024);
  }

  exportExcel() {
    this.gridApi?.exportDataAsExcel({
      fileName: `${this.event?.eventName ?? 'attendance'}.xlsx`,
      sheetName: 'Attendees',
    });
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
