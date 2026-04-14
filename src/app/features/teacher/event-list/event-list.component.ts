import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AgGridAngular } from 'ag-grid-angular';
import { ModuleRegistry, ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { LicenseManager, MasterDetailModule } from 'ag-grid-enterprise';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { EventsService, IEvent } from '../../../core/services/events.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { UrlContextService } from '../../../core/services/url-context.service';
import { environment } from '../../../../environments/environment';

ModuleRegistry.registerModules([MasterDetailModule]);
if (environment.agGridLicense) LicenseManager.setLicenseKey(environment.agGridLicense);

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AgGridAngular,
    HeaderComponent,
  ],
  template: `
    <app-header></app-header>

    <main class="flex flex-col" style="height: calc(100vh - 56px)">

      <!-- ── Toolbar ─────────────────────────────────────── -->
      <div class="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 gap-4 shrink-0">
        <h2 class="text-xl font-bold text-gray-800 shrink-0">Events</h2>
        <div class="flex items-center gap-3 flex-1 justify-end">

          <!-- Search -->
          <div class="relative">
            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      style="font-size:18px;width:18px;height:18px;">search</mat-icon>
            <input type="text" [formControl]="searchCtrl" (input)="onSearch()"
                   placeholder="Search events…"
                   class="field-input !pl-9 !w-52" />
          </div>

          <button type="button" class="btn-primary !px-4 !py-2 !text-sm"
                  (click)="router.navigate(['/teacher/events/create'], { queryParams: qp })">
            New Event
          </button>
        </div>
      </div>

      <!-- ── API error ───────────────────────────────────── -->
      <div *ngIf="apiError" class="error-banner mx-6 mt-4 shrink-0">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">Could not load events</p>
          <p class="mt-0.5 text-red-600">{{ apiError }}</p>
        </div>
      </div>

      <!-- ── Loading ─────────────────────────────────────── -->
      <div *ngIf="loading" class="flex justify-center py-16 shrink-0">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- ── Empty state ─────────────────────────────────── -->
      <div *ngIf="!loading && !apiError && events.length === 0"
           class="flex flex-col items-center justify-center flex-1 gap-4 text-gray-400">
        <mat-icon style="font-size:56px;width:56px;height:56px;">event_busy</mat-icon>
        <p class="text-lg font-medium">No events yet</p>
        <p class="text-sm">Create your first event to get started</p>
        <button type="button" class="btn-primary !px-5 !py-2.5"
                (click)="router.navigate(['/teacher/events/create'], { queryParams: qp })">
          Create Event
        </button>
      </div>

      <!-- ── Master / Detail grid ────────────────────────── -->
      <div *ngIf="!loading && events.length > 0" class="flex-1 p-4 min-h-0">
        <ag-grid-angular
          class="ag-theme-alpine w-full h-full rounded-xl overflow-hidden shadow-sm"
          [rowData]="events"
          [columnDefs]="columnDefs"
          [gridOptions]="gridOptions"
          (gridReady)="onGridReady($event)"
        ></ag-grid-angular>
      </div>

    </main>
  `,
})
export class EventListComponent implements OnInit {
  events: IEvent[] = [];
  loading = true;
  apiError = '';
  searchCtrl = new FormControl('');
  private gridApi: any;

  get qp() {
    const c = this.ctx.context;
    return c ? { email: c.email, role: c.role, schoolId: c.schoolId } : {};
  }

  // ── Master columns ────────────────────────────────────────────────────────
  columnDefs: ColDef[] = [
    // Expand chevron is automatic with masterDetail — no need to add manually
    {
      field: 'eventName',
      headerName: 'Event Name',
      flex: 3,
      filter: 'agTextColumnFilter',
      cellRenderer: 'agGroupCellRenderer',   // renders the expand toggle
    },
    {
      field: 'qrMode',
      headerName: 'Mode',
      width: 110,
      cellRenderer: (p: any) =>
        p.value === 'in-out'
          ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">In / Out</span>'
          : '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Once-Off</span>',
    },
    {
      field: 'hourMode',
      headerName: 'Hours',
      width: 120,
      valueFormatter: (p: any) =>
        ({ 'in-out': 'In/Out', fixed: 'Fixed', volume: 'Volume', disabled: 'None' }[p.value as string] ?? p.value),
    },
    {
      field: 'pointsEnabled',
      headerName: 'Points',
      width: 90,
      cellRenderer: (p: any) =>
        p.value
          ? `<span class="font-semibold" style="color:var(--color-primary)">${p.data.pointsValue} pts</span>`
          : '<span class="text-gray-400 text-sm">—</span>',
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 130,
      sort: 'desc',
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString() : '—',
    },
    {
      headerName: '',
      width: 130,
      sortable: false,
      filter: false,
      cellRenderer: (p: any) => `
        <div class="flex items-center gap-2 h-full">
          <button data-action="qr" data-id="${p.data._id}"
            class="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-80"
            style="background-color:var(--color-secondary)">
            QR Codes
          </button>
          <button data-action="detail" data-id="${p.data._id}"
            class="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-80"
            style="background-color:var(--color-primary)">
            Open
          </button>
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

  // ── Grid options (built in ngOnInit so arrow fns capture `this`) ───────────
  gridOptions!: GridOptions;

  constructor(
    private eventsService: EventsService,
    private attendanceService: AttendanceService,
    public ctx: UrlContextService,
    public router: Router,
  ) {}

  ngOnInit() {
    // Build grid options here so `this` is valid in the detail callback
    this.gridOptions = {
      defaultColDef: { resizable: true, sortable: true },
      pagination: true,
      paginationPageSize: 20,
      rowHeight: 52,
      rowGroupPanelShow: 'never',
      pivotPanelShow:    'never',

      // ── Master / Detail ──────────────────────────────────────────────────
      masterDetail: true,
      detailRowHeight: 340,
      detailRowAutoHeight: false,
      embedFullWidthRows: true,

      isRowMaster: () => true,   // every event row is expandable

      detailCellRendererParams: {
        // columns for the attendance sub-grid
        detailGridOptions: {
          rowHeight: 42,
          defaultColDef: { resizable: true, sortable: true, flex: 1 },
          suppressCellFocus: true,
          columnDefs: [
            {
              headerName: 'Student',
              flex: 2,
              valueGetter: (p: any) =>
                [p.data.studentFirstName, p.data.studentLastName].filter(Boolean).join(' ')
                || p.data.studentEmail,
            },
            { field: 'studentEmail',  headerName: 'Email',  flex: 2 },
            {
              headerName: 'Grade / Class',
              width: 120,
              valueGetter: (p: any) =>
                [p.data.studentGrade, p.data.studentClass].filter(Boolean).join(' · ') || '—',
            },
            {
              field: 'timeIn',
              headerName: 'Time In',
              width: 150,
              valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleString() : '—',
            },
            {
              field: 'timeOut',
              headerName: 'Time Out',
              width: 150,
              valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleString() : '—',
            },
            {
              field: 'hours',
              headerName: 'Hours',
              width: 90,
              valueFormatter: (p: any) => {
                if (p.value == null) return '—';
                const h = Math.floor(p.value);
                const m = Math.round((p.value - h) * 60);
                return h > 0 ? `${h}h ${m}m` : `${m}m`;
              },
            },
            {
              field: 'pointsAwarded',
              headerName: 'Points',
              width: 80,
              cellRenderer: (p: any) =>
                p.value > 0
                  ? `<span class="font-semibold" style="color:var(--color-primary)">${p.value}</span>`
                  : '<span class="text-gray-400">0</span>',
            },
            {
              field: 'source',
              headerName: 'Source',
              width: 100,
              cellRenderer: (p: any) =>
                p.value === 'assisted'
                  ? '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">Assisted</span>'
                  : '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Self</span>',
            },
          ] as ColDef[],
        },

        // Lazy-load attendance for the expanded event
        getDetailRowData: (params: any) => {
          this.attendanceService.getByEvent(params.data._id).subscribe({
            next:  (records) => params.successCallback(records),
            error: ()        => params.successCallback([]),
          });
        },
      },
    };

    // Load events
    const c = this.ctx.context;
    if (!c) {
      this.loading = false;
      this.apiError = 'No user context found. Please access the app via your school link.';
      return;
    }
    this.eventsService.getEventsByPerson(c.schoolId, c.email, c.role).subscribe({
      next: events => { this.events = events; this.loading = false; },
      error: err   => {
        this.loading = false;
        this.apiError = err?.error?.message ?? err?.message ?? 'Failed to load events. Please try again.';
      },
    });
  }

  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;
    this.adjustColumnsForScreenSize();
    window.addEventListener('resize', () => this.adjustColumnsForScreenSize());
  }

  private adjustColumnsForScreenSize() {
    if (!this.gridApi) return;
    const mobile = window.innerWidth < 768;
    this.gridApi.setColumnsVisible(['hourMode', 'pointsEnabled', 'createdAt'], !mobile);
  }

  onSearch() {
    this.gridApi?.setGridOption('quickFilterText', this.searchCtrl.value ?? '');
  }
}
