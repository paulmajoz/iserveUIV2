import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AgGridAngular } from 'ag-grid-angular';
import { ModuleRegistry, ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { LicenseManager, MasterDetailModule, ExcelExportModule } from 'ag-grid-enterprise';
import * as XLSX from 'xlsx';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { EventsService, IEvent } from '../../../core/services/events.service';
import { AttendanceService, IAttendance } from '../../../core/services/attendance.service';
import { UrlContextService } from '../../../core/services/url-context.service';
import { environment } from '../../../../environments/environment';

ModuleRegistry.registerModules([MasterDetailModule, ExcelExportModule]);
if (environment.agGridLicense) LicenseManager.setLicenseKey(environment.agGridLicense);

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    AgGridAngular,
    HeaderComponent,
  ],
  template: `
    <app-header></app-header>

    <main class="flex flex-col" style="height: calc(100vh - 48px)">

      <!-- ── Primary toolbar row (never wraps) ─────────────────────────── -->
      <div class="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 shrink-0">

        <h2 class="text-base font-bold text-gray-800 shrink-0">Events</h2>

        <!-- Search fills remaining space -->
        <div class="flex-1 min-w-0">
          <mat-form-field appearance="outline" class="compact-field w-full" style="margin-bottom:0">
            <mat-icon matPrefix style="font-size:16px;width:16px;height:16px;color:#9ca3af">search</mat-icon>
            <input matInput [formControl]="searchCtrl" (input)="onSearch()" placeholder="Search…">
          </mat-form-field>
        </div>

        <!-- Filter toggle (mobile only) -->
        <button mat-icon-button class="md:hidden relative shrink-0"
                (click)="showFilters = !showFilters"
                [style.color]="activeFilterCount > 0 ? 'var(--color-primary)' : '#6b7280'"
                [attr.aria-label]="showFilters ? 'Hide filters' : 'Show filters'">
          <mat-icon>{{ showFilters ? 'filter_list_off' : 'filter_list' }}</mat-icon>
          <span *ngIf="activeFilterCount > 0"
                class="absolute top-1 right-1 w-4 h-4 rounded-full text-white flex items-center justify-center"
                style="font-size:9px; font-weight:700; background-color:var(--color-primary); line-height:1">
            {{ activeFilterCount }}
          </span>
        </button>

        <!-- Export (desktop only) -->
        <button mat-stroked-button class="hidden md:flex shrink-0"
                [disabled]="!gridApi || filteredEvents.length === 0"
                (click)="exportMasterGrid()">
          <mat-icon>download</mat-icon>
          Export
        </button>

        <!-- New Event -->
        <button mat-flat-button class="shrink-0"
                (click)="router.navigate(['/teacher/events/create'], { queryParams: qp })">
          <mat-icon>add</mat-icon>
          <span class="hidden sm:inline">New Event</span>
        </button>

      </div>

      <!-- ── Filter panel (toggle on mobile, always on desktop) ──────────── -->
      <div *ngIf="showFilters || isDesktop"
           class="px-3 pb-3 pt-2 bg-white border-b border-gray-100 shrink-0">

        <div class="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">

          <mat-form-field appearance="outline" class="compact-field" style="margin-bottom:0">
            <mat-label>Mode</mat-label>
            <mat-select [formControl]="filterModeCtrl">
              <mat-option value="">All</mat-option>
              <mat-option value="in-out">In / Out</mat-option>
              <mat-option value="once-off">Once-Off</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="compact-field" style="margin-bottom:0">
            <mat-label>Hours</mat-label>
            <mat-select [formControl]="filterHoursCtrl">
              <mat-option value="">All</mat-option>
              <mat-option value="in-out">In/Out</mat-option>
              <mat-option value="fixed">Fixed</mat-option>
              <mat-option value="volume">Volume</mat-option>
              <mat-option value="disabled">None</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="compact-field" style="margin-bottom:0">
            <mat-label>Points</mat-label>
            <mat-select [formControl]="filterPointsCtrl">
              <mat-option value="">Any</mat-option>
              <mat-option value="yes">Yes</mat-option>
              <mat-option value="no">No</mat-option>
            </mat-select>
          </mat-form-field>

          <label class="toolbar-date-field">
            <span class="toolbar-date-label">From</span>
            <input type="date" [formControl]="filterFromCtrl" class="toolbar-date-input">
          </label>

          <label class="toolbar-date-field">
            <span class="toolbar-date-label">To</span>
            <input type="date" [formControl]="filterToCtrl" class="toolbar-date-input">
          </label>

          <!-- Active filter count + clear -->
          <ng-container *ngIf="activeFilterCount > 0">
            <span class="text-xs text-gray-400 shrink-0">
              {{ filteredEvents.length }}/{{ events.length }}
            </span>
            <button mat-icon-button (click)="clearFilters()"
                    style="color:#ef4444; width:36px; height:36px;"
                    matTooltip="Clear filters">
              <mat-icon style="font-size:18px;width:18px;height:18px">filter_list_off</mat-icon>
            </button>
          </ng-container>

          <!-- Spacer on desktop -->
          <div class="hidden md:block flex-1"></div>

          <!-- Export (mobile — inside filter panel) -->
          <button mat-stroked-button class="col-span-2 md:hidden"
                  [disabled]="!gridApi || filteredEvents.length === 0"
                  (click)="exportMasterGrid()">
            <mat-icon>download</mat-icon>
            Export
          </button>

        </div>
      </div>

      <!-- ── API error ────────────────────────────────────────────────────── -->
      <div *ngIf="apiError" class="error-banner mx-3 mt-3 shrink-0">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">Could not load events</p>
          <p class="mt-0.5 text-red-600">{{ apiError }}</p>
        </div>
      </div>

      <!-- ── Loading ──────────────────────────────────────────────────────── -->
      <div *ngIf="loading" class="flex justify-center py-16 shrink-0">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- ── Empty — no events at all ────────────────────────────────────── -->
      <div *ngIf="!loading && !apiError && events.length === 0"
           class="flex flex-col items-center justify-center flex-1 gap-4 text-gray-400">
        <mat-icon style="font-size:56px;width:56px;height:56px;">event_busy</mat-icon>
        <p class="text-lg font-medium">No events yet</p>
        <p class="text-sm">Create your first event to get started</p>
        <button mat-flat-button
                (click)="router.navigate(['/teacher/events/create'], { queryParams: qp })">
          Create Event
        </button>
      </div>

      <!-- ── Empty — filters returned nothing ────────────────────────────── -->
      <div *ngIf="!loading && events.length > 0 && filteredEvents.length === 0"
           class="flex flex-col items-center justify-center flex-1 gap-3 text-gray-400">
        <mat-icon style="font-size:48px;width:48px;height:48px;">filter_list_off</mat-icon>
        <p class="text-base font-medium">No events match the current filters</p>
        <button mat-stroked-button (click)="clearFilters()">Clear Filters</button>
      </div>

      <!-- ── Master / Detail grid ─────────────────────────────────────────── -->
      <div *ngIf="!loading && filteredEvents.length > 0" class="flex-1 p-3 min-h-0">
        <ag-grid-angular
          class="ag-theme-alpine w-full h-full rounded-xl overflow-hidden shadow-sm"
          [rowData]="filteredEvents"
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
export class EventListComponent implements OnInit, OnDestroy {
  events: IEvent[] = [];
  filteredEvents: IEvent[] = [];
  loading = true;
  apiError = '';

  searchCtrl       = new FormControl('');
  filterModeCtrl   = new FormControl('');
  filterHoursCtrl  = new FormControl('');
  filterPointsCtrl = new FormControl('');
  filterFromCtrl   = new FormControl('');
  filterToCtrl     = new FormControl('');

  gridApi: any;
  private detailApis: any[] = [];

  showFilters = false;
  isDesktop   = typeof window !== 'undefined' && window.innerWidth >= 768;

  @HostListener('window:resize')
  onResize() { this.isDesktop = window.innerWidth >= 768; }

  get qp() {
    const c = this.ctx.context;
    return c ? { email: c.email, role: c.role, schoolId: c.schoolId } : {};
  }

  get activeFilterCount(): number {
    return [this.filterModeCtrl, this.filterHoursCtrl, this.filterPointsCtrl,
            this.filterFromCtrl, this.filterToCtrl].filter(c => !!c.value).length;
  }

  // ── Master columns ────────────────────────────────────────────────────────
  columnDefs: ColDef[] = [
    {
      field: 'eventName',
      headerName: 'Event Name',
      flex: 3,
      minWidth: 140,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'qrMode', field: 'qrMode', headerName: 'Mode', width: 110,
      cellRenderer: (p: any) =>
        p.value === 'in-out'
          ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">In / Out</span>'
          : '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Once-Off</span>',
    },
    {
      colId: 'hourMode', field: 'hourMode', headerName: 'Hours', width: 120,
      valueFormatter: (p: any) =>
        ({ 'in-out': 'In/Out', fixed: 'Fixed', volume: 'Volume', disabled: 'None' }[p.value as string] ?? p.value),
    },
    {
      colId: 'pointsEnabled', field: 'pointsEnabled', headerName: 'Points', width: 90,
      cellRenderer: (p: any) =>
        p.value
          ? `<span class="font-semibold" style="color:var(--color-primary)">${p.data.pointsValue} pts</span>`
          : '<span class="text-gray-400 text-sm">—</span>',
    },
    {
      colId: 'createdAt', field: 'createdAt', headerName: 'Created', width: 130, sort: 'desc',
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString() : '—',
    },
    {
      colId: 'actions',
      headerName: '',
      width: 150,
      minWidth: 150,
      sortable: false,
      filter: false,
      cellRenderer: (p: any) => `
        <div class="flex items-center gap-2 h-full">
          <button data-action="qr" data-id="${p.data._id}"
            class="text-xs px-2.5 py-1.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-80"
            style="background-color:var(--color-secondary)">QR</button>
          <button data-action="detail" data-id="${p.data._id}"
            class="text-xs px-2.5 py-1.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-80"
            style="background-color:var(--color-primary)">Open</button>
        </div>`,
      onCellClicked: (p: any) => {
        const btn = (p.event as MouseEvent).composedPath()
          .find((el: any) => el.dataset?.action) as HTMLElement | undefined;
        if (!btn) return;
        if (btn.dataset['action'] === 'qr')
          this.router.navigate(['/teacher/events', p.data._id, 'qr'], { queryParams: this.qp });
        if (btn.dataset['action'] === 'detail')
          this.router.navigate(['/teacher/events', p.data._id], { queryParams: this.qp });
      },
    },
  ];

  gridOptions!: GridOptions;

  constructor(
    private eventsService: EventsService,
    private attendanceService: AttendanceService,
    public ctx: UrlContextService,
    public router: Router,
  ) {}

  ngOnInit() {
    // ── Register global export callback used by detail-panel buttons ─────
    (window as any).__iserveExportAttendees =
      (eventId: string, eventName: string) => this.exportEventAttendees(eventId, eventName);

    // ── Subscribe to filter changes ───────────────────────────────────────
    [this.filterModeCtrl, this.filterHoursCtrl, this.filterPointsCtrl,
     this.filterFromCtrl, this.filterToCtrl]
      .forEach(ctrl => ctrl.valueChanges.subscribe(() => this.applyFilters()));

    // ── Grid options ──────────────────────────────────────────────────────
    this.gridOptions = {
      defaultColDef: { resizable: true, sortable: true },
      pagination: true,
      paginationPageSize: 25,
      rowHeight: 36,
      rowGroupPanelShow: 'never',
      pivotPanelShow:    'never',

      rowClass: 'cursor-pointer',
      suppressRowClickSelection: true,
      onRowClicked: (e: any) => {
        const target = e.event?.target as HTMLElement | null;
        if (target?.closest('[data-action]')) return;
        e.node.setExpanded(!e.node.expanded);
      },

      // ── Master / Detail ────────────────────────────────────────────────
      masterDetail: true,
      // fixed height: 40px panel header + 34px col headers + 10×32px rows + 34px pagination bar = 428
      detailRowHeight: 428,
      embedFullWidthRows: true,
      isRowMaster: () => true,

      detailCellRendererParams: {
        // ── Detail panel: event name header + Export Excel button ─────────
        template: (params: any) => {
          const id   = params.data._id;
          const name = encodeURIComponent(params.data.eventName ?? '');
          return `
            <div style="display:flex;flex-direction:column;height:100%;background:#fff;">
              <div style="display:flex;align-items:center;justify-content:space-between;
                          padding:8px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                <span style="font-size:12px;font-weight:600;color:#374151;">
                  ${params.data.eventName} — Attendees
                </span>
                <button
                  onclick="window.__iserveExportAttendees('${id}', decodeURIComponent('${name}'))"
                  style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:500;
                         padding:5px 12px;border-radius:6px;border:1px solid #d1d5db;
                         background:#fff;cursor:pointer;color:#374151;transition:background 0.15s;"
                  onmouseover="this.style.background='#f3f4f6'"
                  onmouseout="this.style.background='#fff'">
                  &#8595; Export Excel
                </button>
              </div>
              <div ref="eDetailGrid" style="flex:1;"></div>
            </div>`;
        },

        detailGridOptions: {
          rowHeight: 32,
          defaultColDef: { resizable: true, sortable: true },
          suppressCellFocus: true,
          pagination: true,
          paginationPageSize: 10,
          rowGroupPanelShow: 'never',
          pivotPanelShow:    'never',

          onGridReady: (e: any) => {
            this.detailApis.push(e.api);
            this.applyDetailResponsive(e.api);
            e.api.addEventListener('gridDestroyed', () => {
              this.detailApis = this.detailApis.filter(a => a !== e.api);
            });
          },

          onFirstDataRendered: (e: any) => {
            this.applyDetailResponsive(e.api);
          },

          columnDefs: [
            {
              colId: 'student', headerName: 'Student', flex: 2, minWidth: 120,
              valueGetter: (p: any) =>
                [p.data.studentFirstName, p.data.studentLastName].filter(Boolean).join(' ')
                || p.data.studentEmail,
            },
            { colId: 'studentEmail', field: 'studentEmail', headerName: 'Email', flex: 2, minWidth: 140 },
            {
              colId: 'gradeClass', headerName: 'Grade / Class', width: 120,
              valueGetter: (p: any) =>
                [p.data.studentGrade, p.data.studentClass].filter(Boolean).join(' · ') || '—',
            },
            {
              colId: 'timeIn', field: 'timeIn', headerName: 'Time In', width: 150,
              valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleString() : '—',
            },
            {
              colId: 'timeOut', field: 'timeOut', headerName: 'Time Out', width: 150,
              valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleString() : '—',
            },
            {
              colId: 'hours', field: 'hours', headerName: 'Hours', width: 90,
              valueFormatter: (p: any) => {
                if (p.value == null) return '—';
                const h = Math.floor(p.value), m = Math.round((p.value - h) * 60);
                return h > 0 ? `${h}h ${m}m` : `${m}m`;
              },
            },
            {
              colId: 'pointsAwarded', field: 'pointsAwarded', headerName: 'Points', width: 80,
              cellRenderer: (p: any) =>
                p.value > 0
                  ? `<span class="font-semibold" style="color:var(--color-primary)">${p.value}</span>`
                  : '<span class="text-gray-400">0</span>',
            },
            {
              colId: 'source', field: 'source', headerName: 'Source', width: 100,
              cellRenderer: (p: any) =>
                p.value === 'assisted'
                  ? '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">Assisted</span>'
                  : '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Self</span>',
            },
          ] as ColDef[],
        },

        getDetailRowData: (params: any) => {
          this.attendanceService.getByEvent(params.data._id).subscribe({
            next:  records => params.successCallback(records),
            error: ()      => params.successCallback([]),
          });
        },
      },
    };

    // ── Load events ───────────────────────────────────────────────────────
    const c = this.ctx.context;
    if (!c) {
      this.loading = false;
      this.apiError = 'No user context found. Please access the app via your school link.';
      return;
    }
    this.eventsService.getEventsByPerson(c.schoolId, c.email, c.role).subscribe({
      next: events => {
        this.events = events;
        this.filteredEvents = events;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.apiError = err?.error?.message ?? err?.message ?? 'Failed to load events. Please try again.';
      },
    });
  }

  ngOnDestroy() {
    delete (window as any).__iserveExportAttendees;
  }

  // ── Filter logic ──────────────────────────────────────────────────────────
  applyFilters() {
    const mode   = this.filterModeCtrl.value   ?? '';
    const hours  = this.filterHoursCtrl.value  ?? '';
    const points = this.filterPointsCtrl.value ?? '';
    const from   = this.filterFromCtrl.value   ?? '';
    const to     = this.filterToCtrl.value     ?? '';

    this.filteredEvents = this.events.filter(e => {
      if (mode   && e.qrMode   !== mode)  return false;
      if (hours  && e.hourMode !== hours) return false;
      if (points === 'yes' && !e.pointsEnabled)  return false;
      if (points === 'no'  &&  e.pointsEnabled)  return false;
      if (from && e.createdAt && new Date(e.createdAt) < new Date(from)) return false;
      if (to && e.createdAt) {
        const toEnd = new Date(to); toEnd.setHours(23, 59, 59, 999);
        if (new Date(e.createdAt) > toEnd) return false;
      }
      return true;
    });
  }

  clearFilters() {
    this.filterModeCtrl.setValue('');
    this.filterHoursCtrl.setValue('');
    this.filterPointsCtrl.setValue('');
    this.filterFromCtrl.setValue('');
    this.filterToCtrl.setValue('');
  }

  // ── Export: master events grid (AG Grid Enterprise Excel) ─────────────────
  exportMasterGrid() {
    this.gridApi?.exportDataAsExcel({
      fileName: 'Events.xlsx',
      sheetName: 'Events',
      columnKeys: ['eventName', 'qrMode', 'hourMode', 'pointsEnabled', 'createdAt'],
    });
  }

  // ── Export: individual event attendees (SheetJS → .xlsx) ──────────────────
  exportEventAttendees(eventId: string, eventName: string) {
    this.attendanceService.getByEvent(eventId).subscribe({
      next: records => this.writeAttendeesXlsx(records, eventName),
      error: ()     => console.error('Failed to fetch attendees for export'),
    });
  }

  private writeAttendeesXlsx(records: IAttendance[], eventName: string) {
    const fmtHours = (v: number | null | undefined) => {
      if (v == null) return '';
      const h = Math.floor(v), m = Math.round((v - h) * 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const rows = records.map(r => ({
      'Student':  [r.studentFirstName, r.studentLastName].filter(Boolean).join(' ') || r.studentEmail || '',
      'Email':    r.studentEmail    ?? '',
      'Grade':    r.studentGrade    ?? '',
      'Class':    r.studentClass    ?? '',
      'Time In':  r.timeIn  ? new Date(r.timeIn).toLocaleString()  : '',
      'Time Out': r.timeOut ? new Date(r.timeOut).toLocaleString() : '',
      'Hours':    fmtHours(r.hours),
      'Points':   r.pointsAwarded ?? 0,
      'Source':   r.source ?? '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0] ?? {}).map(k => ({
      wch: Math.max(k.length, ...rows.map(r => String((r as any)[k] ?? '').length)) + 2,
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendees');
    XLSX.writeFile(wb, `${eventName} - Attendees.xlsx`);
  }

  // ── Grid ready + responsive columns ──────────────────────────────────────
  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;
    this.applyMasterResponsive();
    window.addEventListener('resize', () => {
      this.applyMasterResponsive();
      this.detailApis.forEach(api => this.applyDetailResponsive(api));
    });
  }

  // xs <480: name + actions | sm 480+: +mode | md 768+: +hours+points | lg 1024+: +created
  private applyMasterResponsive() {
    if (!this.gridApi) return;
    const w = window.innerWidth;
    this.gridApi.setColumnsVisible(['qrMode'],                    w >= 480);
    this.gridApi.setColumnsVisible(['hourMode', 'pointsEnabled'], w >= 768);
    this.gridApi.setColumnsVisible(['createdAt'],                 w >= 1024);
  }

  // xs <480: student+hours | sm 480+: +source | md 768+: +email+grade | lg 1024+: +times+points
  private applyDetailResponsive(api: any) {
    if (!api) return;
    const w = window.innerWidth;
    api.setColumnsVisible(['source'],                               w >= 480);
    api.setColumnsVisible(['studentEmail', 'gradeClass'],           w >= 768);
    api.setColumnsVisible(['timeIn', 'timeOut', 'pointsAwarded'],   w >= 1024);
  }

  onSearch() {
    this.gridApi?.setGridOption('quickFilterText', this.searchCtrl.value ?? '');
  }
}
