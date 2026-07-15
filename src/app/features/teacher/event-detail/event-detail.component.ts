import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ModuleRegistry, ColDef, GridOptions, GridReadyEvent, GetContextMenuItemsParams, MenuItemDef } from 'ag-grid-community';
import { ExcelExportModule, MenuModule, ClipboardModule } from 'ag-grid-enterprise';
import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([ExcelExportModule, MenuModule, ClipboardModule]);
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { QrScannerComponent, ScannedPayload } from '../../../shared/components/qr-scanner/qr-scanner.component';
import {
  AddAttendanceDialogComponent,
  AddAttendanceDialogData,
  AddAttendanceDialogResult,
} from '../../../shared/components/add-attendance-dialog/add-attendance-dialog.component';
import { HoursFormatPipe } from '../../../shared/pipes/hours-format.pipe';
import { EventsService, IEvent } from '../../../core/services/events.service';
import { AttendanceService, IAttendance, SubmitAttendancePayload, UpdateAttendancePayload } from '../../../core/services/attendance.service';
import {
  EditAttendanceDialogComponent,
  EditAttendanceDialogData,
  EditAttendanceDialogResult,
} from './edit-attendance-dialog.component';
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
    MatDialogModule,
    HeaderComponent,
    HoursFormatPipe,
    QrScannerComponent,
    EditAttendanceDialogComponent,
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
        <div class="flex flex-wrap items-center gap-2 mt-2 pl-10">
          <button mat-stroked-button class="flex-1"
                  style="min-width:110px;"
                  (click)="router.navigate(['/teacher/events', eventId, 'qr'], { queryParams: qp })">
            <mat-icon>qr_code</mat-icon>
            QR Codes
          </button>
          <button mat-flat-button class="flex-1"
                  style="min-width:110px;"
                  (click)="showScanner = !showScanner">
            <mat-icon>{{ showScanner ? 'close' : 'qr_code_scanner' }}</mat-icon>
            {{ showScanner ? 'Hide' : 'Scan' }}
          </button>
          <button mat-stroked-button class="flex-1"
                  style="min-width:140px;"
                  (click)="openAddAttendance()">
            <mat-icon>person_add</mat-icon>
            Add Attendance
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
          <p class="text-base font-bold text-gray-800">{{ attendance.length }}</p>
          <p class="text-xs text-gray-500">Scans</p>
        </div>
        <div class="text-center">
          <p class="text-base font-bold text-gray-800">{{ uniqueStudents }}</p>
          <p class="text-xs text-gray-500">Students</p>
        </div>
        <div class="text-center">
          <p class="text-base font-bold text-gray-800">{{ totalHours | hoursFormat }}</p>
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
      flex: 3,
      minWidth: 160,
      filter: 'agTextColumnFilter',
      valueGetter: (p: any) =>
        [p.data.studentFirstName, p.data.studentLastName].filter(Boolean).join(' ')
        || p.data.studentEmail,
    },
    // Email column hidden — student is identified by name now.
    { colId: 'studentGrade',  field: 'studentGrade',  headerName: 'Grade',    width: 80,  filter: 'agTextColumnFilter' },
    { colId: 'studentClass',  field: 'studentClass',  headerName: 'Class',    width: 80,  filter: 'agTextColumnFilter' },
    { colId: 'studentHouse',  field: 'studentHouse',  headerName: 'House',    width: 100, filter: 'agTextColumnFilter' },
    { colId: 'studentTutor',  field: 'studentTutor',  headerName: 'Tutor',    width: 100, filter: 'agTextColumnFilter' },
    { colId: 'customField1',  field: 'customField1',  headerName: 'Field 1',  width: 110, filter: 'agTextColumnFilter' },
    { colId: 'customField2',  field: 'customField2',  headerName: 'Field 2',  width: 110, filter: 'agTextColumnFilter' },
    { colId: 'customField3',  field: 'customField3',  headerName: 'Field 3',  width: 110, filter: 'agTextColumnFilter' },
    {
      colId: 'timeIn', field: 'timeIn', headerName: 'Time In', width: 160,
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
        : '—',
    },
    {
      colId: 'timeOut', field: 'timeOut', headerName: 'Time Out', width: 160,
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
        : '—',
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
      colId: 'location',
      headerName: 'On-site',
      width: 130,
      tooltipValueGetter: (p: any) => {
        const d = p.data?.distanceMeters;
        if (d == null) return 'No location captured for this scan';
        return `Captured ${d}m from the event target.`;
      },
      cellRenderer: (p: any) => {
        const w = p.data?.withinPerimeter;
        const d = p.data?.distanceMeters;
        if (w === true)  return `<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">On-site${d != null ? ' · ' + d + 'm' : ''}</span>`;
        if (w === false) return `<span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Off-site · ${d}m</span>`;
        return '<span class="text-xs text-gray-400">—</span>';
      },
    },
    {
      colId: 'source', field: 'source', headerName: 'Source', width: 110,
      cellRenderer: (p: any) => p.value === 'assisted'
        ? '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Assisted</span>'
        : '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Self</span>',
    },
  ];

  gridOptions: GridOptions = {
    defaultColDef: { resizable: true, sortable: true },
    // No pagination — show every attendee, scroll within the grid container.
    pagination: false,
    rowHeight: 36,
    rowGroupPanelShow: 'never',
    pivotPanelShow:    'never',
    suppressRowClickSelection: true,
    getContextMenuItems: (params) => this.getContextMenuItems(params),
  };

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private eventsService: EventsService,
    private attendanceService: AttendanceService,
    public ctx: UrlContextService,
    private snack: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  getContextMenuItems(params: GetContextMenuItemsParams): (string | MenuItemDef)[] {
    const items: (string | MenuItemDef)[] = [];
    if (params.node?.data) {
      items.push({
        name: 'Edit Attendance',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        action: () => this.openEditDialog(params.node!.data as IAttendance),
      });
      items.push('separator');
    }
    return [...items, 'copy', 'export'];
  }

  openEditDialog(record: IAttendance) {
    if (!this.event) return;
    const ref = this.dialog.open<
      EditAttendanceDialogComponent,
      EditAttendanceDialogData,
      EditAttendanceDialogResult
    >(EditAttendanceDialogComponent, {
      width: 'min(560px, 94vw)',
      maxHeight: '90vh',
      autoFocus: 'first-tabbable',
      data: { record, event: this.event, teacherEmail: this.ctx.email },
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.attendanceService.update(record._id, result.payload).subscribe({
        next: () => {
          this.snack.open('Attendance updated.', 'Close', { duration: 2500 });
          this.loadAttendance();
        },
        error: err => {
          this.attendanceError = err?.error?.message ?? err?.message ?? 'Update failed.';
        },
      });
    });
  }

  /** Opens the manual-attendance dialog and submits the resulting record. */
  openAddAttendance() {
    if (!this.event) return;
    const ref = this.dialog.open<
      AddAttendanceDialogComponent,
      AddAttendanceDialogData,
      AddAttendanceDialogResult
    >(AddAttendanceDialogComponent, {
      width: 'min(560px, 94vw)',
      maxHeight: '90vh',
      autoFocus: 'first-tabbable',
      data: {
        event: this.event,
        teacherEmail: this.ctx.email,
        schoolId: this.ctx.schoolId,
      },
    });

    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.attendanceService.createManual(payload).subscribe({
        next: () => {
          const name = [payload.studentFirstName, payload.studentLastName]
            .filter(Boolean).join(' ') || payload.studentEmail;
          this.snack.open(`Added ${name}.`, 'Close', { duration: 2500 });
          this.loadAttendance();
        },
        error: (err) => {
          this.snack.open(
            err?.error?.message ?? err?.message ?? 'Failed to add attendance.',
            'Close',
            { duration: 4500 },
          );
        },
      });
    });
  }

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
    this.gridApi.setColumnsVisible(['timeIn'],                                w >= 768);
    this.gridApi.setColumnsVisible(['studentGrade', 'studentClass', 'timeOut'], w >= 1024);
    this.gridApi.setColumnsVisible(['studentHouse', 'studentTutor', 'customField1', 'customField2', 'customField3'], w >= 1280);
  }

  exportExcel() {
    try {
      const records = this.attendance ?? [];
      if (!records.length) {
        this.snack.open('No attendees to export.', 'Close', { duration: 2500 });
        return;
      }

      const fmtHours = (v: number | null | undefined) => {
        if (v == null) return '';
        const h = Math.floor(v), m = Math.round((v - h) * 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      };

      const rows = records.map(r => ({
        'Student':  [r.studentFirstName, r.studentLastName].filter(Boolean).join(' ') || r.studentEmail || '',
        'Email':    r.studentEmail ?? '',
        'Grade':    r.studentGrade ?? '',
        'Class':    r.studentClass ?? '',
        'House':    r.studentHouse ?? '',
        'Tutor':    r.studentTutor ?? '',
        'Field 1':  r.customField1 ?? '',
        'Field 2':  r.customField2 ?? '',
        'Field 3':  r.customField3 ?? '',
        'Time In':  r.timeIn  ? new Date(r.timeIn).toLocaleString()  : '',
        'Time Out': r.timeOut ? new Date(r.timeOut).toLocaleString() : '',
        'Hours':    fmtHours(r.hours),
        'Points':   r.pointsAwarded ?? 0,
        'On-site':  r.withinPerimeter === true ? 'Yes'
                  : r.withinPerimeter === false ? 'No'
                  : '',
        'Distance (m)': r.distanceMeters ?? '',
        'Source':   r.source ?? '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const widths = Object.keys(rows[0]).map(k => ({
        wch: Math.max(k.length, ...rows.map(r => String((r as any)[k] ?? '').length)) + 2,
      }));
      (ws as any)['!cols'] = widths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendees');
      XLSX.writeFile(wb, `${this.event?.eventName ?? 'attendance'} - Attendees.xlsx`);

      this.snack.open(`Exported ${rows.length} ${rows.length === 1 ? 'attendee' : 'attendees'}.`, 'Close', { duration: 2500 });
    } catch (err) {
      console.error('Export failed', err);
      this.snack.open('Export failed. Please try again.', 'Close', { duration: 3500 });
    }
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
