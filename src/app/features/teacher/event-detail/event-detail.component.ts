import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
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
  imports: [CommonModule, AgGridAngular, MatDialogModule, MatSnackBarModule, HeaderComponent, HoursFormatPipe, QrScannerComponent],
  template: `
    <app-header></app-header>

    <main class="flex flex-col h-[calc(100vh-64px)]">
      <!-- Event summary -->
      <div class="px-6 py-4 bg-white border-b border-gray-100" *ngIf="event">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button (click)="router.navigate(['/teacher/events'], { queryParams: qp })"
                    class="text-gray-400 hover:text-gray-600">← Events</button>
            <div>
              <h2 class="text-xl font-bold text-gray-800">{{ event.eventName }}</h2>
              <div class="flex gap-3 text-sm text-gray-500 mt-1">
                <span>{{ event.qrMode === 'in-out' ? 'In/Out' : 'Single Scan' }}</span>
                <span>•</span>
                <span>{{ event.hourMode }}</span>
                <span *ngIf="event.pointsEnabled">• {{ event.pointsValue }}pts/scan</span>
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <button (click)="router.navigate(['/teacher/events', eventId, 'qr'], { queryParams: qp })"
                    class="btn-secondary text-sm">View QR Codes</button>
            <button (click)="showScanner = !showScanner" class="btn-primary text-sm">
              {{ showScanner ? 'Hide Scanner' : '📷 Scan Student' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Scanner panel -->
      <div *ngIf="showScanner" class="px-6 py-4 bg-surface border-b border-gray-100 flex flex-col items-center gap-4">
        <p class="text-sm font-medium text-gray-600">Scan a student's QR badge to record attendance</p>
        <app-qr-scanner (scanned)="onStudentScanned($event)"></app-qr-scanner>
      </div>

      <!-- Stats bar -->
      <div class="grid grid-cols-3 px-6 py-3 bg-gray-50 border-b border-gray-100 gap-4">
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

      <!-- Attendance grid -->
      <div class="flex-1 p-4">
        <div class="flex justify-end mb-2">
          <button (click)="exportCsv()" class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            ↓ Export CSV
          </button>
        </div>
        <ag-grid-angular
          class="ag-theme-alpine w-full h-full rounded-xl overflow-hidden shadow-sm"
          [rowData]="attendance"
          [columnDefs]="columnDefs"
          [gridOptions]="gridOptions"
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
  showScanner = false;
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
    enableRangeSelection: true,
  };

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private eventsService: EventsService,
    private attendanceService: AttendanceService,
    public ctx: UrlContextService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id') ?? '';
    this.eventsService.getEventById(this.eventId).subscribe(e => (this.event = e));
    this.loadAttendance();
  }

  loadAttendance() {
    this.attendanceService.getByEvent(this.eventId).subscribe(a => (this.attendance = a));
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
    if (!payload.studentEmail) {
      this.snack.open('Could not read student email from QR code.', 'Close', { duration: 3000 });
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
      error: (err) => this.snack.open(err.error?.message ?? 'Scan failed', 'Close', { duration: 3000 }),
    });
  }
}
