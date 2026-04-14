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

      <!-- ── Toolbar ─────────────────────────────────────────────────────── -->
      <div class="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 gap-4 shrink-0">
        <h2 class="text-xl font-bold text-gray-800 shrink-0">Events</h2>
        <div class="flex items-center gap-3 flex-1 justify-end">
          <div class="relative">
            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      style="font-size:18px;width:18px;height:18px;">search</mat-icon>
            <input type="text" [formControl]="searchCtrl" (input)="onSearch()"
                   placeholder="Search events…"
                   class="field-input !pl-9 !w-52 !py-2 !text-sm" />
          </div>
          <button type="button" class="btn-primary !px-4 !py-2 !text-sm"
                  (click)="router.navigate(['/teacher/events/create'], { queryParams: qp })">
            New Event
          </button>
        </div>
      </div>

      <!-- ── Filter bar ───────────────────────────────────────────────────── -->
      <div class="flex items-center gap-2 px-6 py-2.5 bg-gray-50 border-b border-gray-100 flex-wrap shrink-0">

        <!-- Mode -->
        <select [formControl]="filterModeCtrl"
                class="field-input !w-auto !py-1.5 !px-3 !text-xs !rounded-lg">
          <option value="">All Modes</option>
          <option value="in-out">In / Out</option>
          <option value="once-off">Once-Off</option>
        </select>

        <!-- Hour type -->
        <select [formControl]="filterHoursCtrl"
                class="field-input !w-auto !py-1.5 !px-3 !text-xs !rounded-lg">
          <option value="">All Hour Types</option>
          <option value="in-out">In/Out Duration</option>
          <option value="fixed">Fixed Hours</option>
          <option value="volume">Volume-Based</option>
          <option value="disabled">No Hours</option>
        </select>

        <!-- Points -->
        <select [formControl]="filterPointsCtrl"
                class="field-input !w-auto !py-1.5 !px-3 !text-xs !rounded-lg">
          <option value="">Any Points</option>
          <option value="yes">With Points</option>
          <option value="no">No Points</option>
        </select>

        <!-- Date range -->
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-gray-400 font-medium shrink-0">From</span>
          <input type="date" [formControl]="filterFromCtrl"
                 class="field-input !w-auto !py-1.5 !px-3 !text-xs !rounded-lg" />
        </div>
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-gray-400 font-medium shrink-0">To</span>
          <input type="date" [formControl]="filterToCtrl"
                 class="field-input !w-auto !py-1.5 !px-3 !text-xs !rounded-lg" />
        </div>

        <!-- Right: results count + clear button -->
        <div class="flex items-center gap-3 ml-auto">
          <span *ngIf="activeFilterCount > 0" class="text-xs text-gray-500 shrink-0">
            {{ filteredEvents.length }} of {{ events.length }} event{{ events.length !== 1 ? 's' : '' }}
          </span>
          <button *ngIf="activeFilterCount > 0"
                  (click)="clearFilters()"
                  class="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700
                         bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors shrink-0">
            <mat-icon style="font-size:13px;width:13px;height:13px">close</mat-icon>
            Clear {{ activeFilterCount > 1 ? activeFilterCount + ' filters' : 'filter' }}
          </button>
        </div>
      </div>

      <!-- ── API error ────────────────────────────────────────────────────── -->
      <div *ngIf="apiError" class="error-banner mx-6 mt-4 shrink-0">
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
        <button type="button" class="btn-primary !px-5 !py-2.5"
                (click)="router.navigate(['/teacher/events/create'], { queryParams: qp })">
          Create Event
        </button>
      </div>

      <!-- ── Empty — filters returned nothing ────────────────────────────── -->
      <div *ngIf="!loading && events.length > 0 && filteredEvents.length === 0"
           class="flex flex-col items-center justify-center flex-1 gap-3 text-gray-400">
        <mat-icon style="font-size:48px;width:48px;height:48px;">filter_list_off</mat-icon>
        <p class="text-base font-medium">No events match the current filters</p>
        <button type="button" (click)="clearFilters()"
                class="btn-secondary !px-4 !py-2 !text-sm">
          Clear Filters
        </button>
      </div>

      <!-- ── Master / Detail grid ─────────────────────────────────────────── -->
      <div *ngIf="!loading && filteredEvents.length > 0" class="flex-1 p-4 min-h-0">
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
export class EventListComponent implements OnInit {
  events: IEvent[] = [];
  filteredEvents: IEvent[] = [];
  loading = true;
  apiError = '';

  // ── Text search ─────────────────────────────────────────────────────────
  searchCtrl = new FormControl('');

  // ── Categorical / date filters ───────────────────────────────────────────
  filterModeCtrl   = new FormControl('');
  filterHoursCtrl  = new FormControl('');
  filterPointsCtrl = new FormControl('');
  filterFromCtrl   = new FormControl('');
  filterToCtrl     = new FormControl('');

  private gridApi: any;
  private detailApis: any[] = [];

  get qp() {
    const c = this.ctx.context;
    return c ? { email: c.email, role: c.role, schoolId: c.schoolId } : {};
  }

  get activeFilterCount(): number {
    return [this.filterModeCtrl, this.filterHoursCtrl, this.filterPointsCtrl,
            this.filterFromCtrl, this.filterToCtrl]
      .filter(c => !!c.value).length;
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
      colId: 'qrMode',
      field: 'qrMode',
      headerName: 'Mode',
      width: 110,
      cellRenderer: (p: any) =>
        p.value === 'in-out'
          ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">In / Out</span>'
          : '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Once-Off</span>',
    },
    {
      colId: 'hourMode',
      field: 'hourMode',
      headerName: 'Hours',
      width: 120,
      valueFormatter: (p: any) =>
        ({ 'in-out': 'In/Out', fixed: 'Fixed', volume: 'Volume', disabled: 'None' }[p.value as string] ?? p.value),
    },
    {
      colId: 'pointsEnabled',
      field: 'pointsEnabled',
      headerName: 'Points',
      width: 90,
      cellRenderer: (p: any) =>
        p.value
          ? `<span class="font-semibold" style="color:var(--color-primary)">${p.data.pointsValue} pts</span>`
          : '<span class="text-gray-400 text-sm">—</span>',
    },
    {
      colId: 'createdAt',
      field: 'createdAt',
      headerName: 'Created',
      width: 130,
      sort: 'desc',
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
            style="background-color:var(--color-secondary)">
            QR
          </button>
          <button data-action="detail" data-id="${p.data._id}"
            class="text-xs px-2.5 py-1.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-80"
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

  gridOptions!: GridOptions;

  constructor(
    private eventsService: EventsService,
    private attendanceService: AttendanceService,
    public ctx: UrlContextService,
    public router: Router,
  ) {}

  ngOnInit() {
    // ── Subscribe to filter changes ────────────────────────────────────────
    [this.filterModeCtrl, this.filterHoursCtrl, this.filterPointsCtrl,
     this.filterFromCtrl, this.filterToCtrl]
      .forEach(ctrl => ctrl.valueChanges.subscribe(() => this.applyFilters()));

    // ── Grid options ───────────────────────────────────────────────────────
    this.gridOptions = {
      defaultColDef: { resizable: true, sortable: true },
      pagination: true,
      paginationPageSize: 20,
      rowHeight: 52,
      rowGroupPanelShow: 'never',
      pivotPanelShow:    'never',

      // ── Row click expands / collapses detail ──────────────────────────────
      rowClass: 'cursor-pointer',
      suppressRowClickSelection: true,
      onRowClicked: (e: any) => {
        // Ignore clicks that originated from an action button
        const target = e.event?.target as HTMLElement | null;
        if (target?.closest('[data-action]')) return;
        e.node.setExpanded(!e.node.expanded);
      },

      masterDetail: true,
      detailRowHeight: 320,
      detailRowAutoHeight: false,
      embedFullWidthRows: true,
      isRowMaster: () => true,

      detailCellRendererParams: {
        detailGridOptions: {
          rowHeight: 42,
          defaultColDef: { resizable: true, sortable: true },
          suppressCellFocus: true,
          rowGroupPanelShow: 'never',
          pivotPanelShow:    'never',

          onGridReady: (e: any) => {
            this.detailApis.push(e.api);
            this.applyDetailResponsive(e.api);
            e.api.addEventListener('gridDestroyed', () => {
              this.detailApis = this.detailApis.filter(a => a !== e.api);
            });
          },

          columnDefs: [
            {
              colId: 'student',
              headerName: 'Student',
              flex: 2,
              minWidth: 120,
              valueGetter: (p: any) =>
                [p.data.studentFirstName, p.data.studentLastName].filter(Boolean).join(' ')
                || p.data.studentEmail,
            },
            { colId: 'studentEmail', field: 'studentEmail', headerName: 'Email',        flex: 2, minWidth: 140 },
            {
              colId: 'gradeClass',
              headerName: 'Grade / Class',
              width: 120,
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
            next:  (records) => params.successCallback(records),
            error: ()        => params.successCallback([]),
          });
        },
      },
    };

    // ── Load events ────────────────────────────────────────────────────────
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

  // ── Filter logic ──────────────────────────────────────────────────────────
  applyFilters() {
    const mode   = this.filterModeCtrl.value ?? '';
    const hours  = this.filterHoursCtrl.value ?? '';
    const points = this.filterPointsCtrl.value ?? '';
    const from   = this.filterFromCtrl.value ?? '';
    const to     = this.filterToCtrl.value ?? '';

    this.filteredEvents = this.events.filter(e => {
      if (mode   && e.qrMode   !== mode)  return false;
      if (hours  && e.hourMode !== hours) return false;
      if (points === 'yes' && !e.pointsEnabled)  return false;
      if (points === 'no'  &&  e.pointsEnabled)  return false;
      if (from && e.createdAt) {
        if (new Date(e.createdAt) < new Date(from)) return false;
      }
      if (to && e.createdAt) {
        // Include the whole "to" day
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
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
    // valueChanges subscriptions will call applyFilters() automatically
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

  private applyMasterResponsive() {
    if (!this.gridApi) return;
    const w = window.innerWidth;
    this.gridApi.setColumnsVisible(['qrMode'],                    w >= 480);
    this.gridApi.setColumnsVisible(['hourMode', 'pointsEnabled'], w >= 768);
    this.gridApi.setColumnsVisible(['createdAt'],                 w >= 1024);
  }

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
