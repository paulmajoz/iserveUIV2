import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AgGridAngular } from 'ag-grid-angular';
import { ModuleRegistry, ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { LicenseManager, MasterDetailModule, ExcelExportModule, MenuModule, ClipboardModule } from 'ag-grid-enterprise';
import * as XLSX from 'xlsx';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { EventsService, IEvent } from '../../../core/services/events.service';
import { AttendanceService, IAttendance, UpdateAttendancePayload } from '../../../core/services/attendance.service';
import {
  EditAttendanceDialogComponent,
  EditAttendanceDialogData,
  EditAttendanceDialogResult,
} from '../event-detail/edit-attendance-dialog.component';
import { UrlContextService } from '../../../core/services/url-context.service';
import { environment } from '../../../../environments/environment';

ModuleRegistry.registerModules([MasterDetailModule, ExcelExportModule, MenuModule, ClipboardModule]);
if (environment.agGridLicense) LicenseManager.setLicenseKey(environment.agGridLicense);

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSnackBarModule,
    MatDialogModule,
    AgGridAngular,
    HeaderComponent,
    EditAttendanceDialogComponent,
  ],
  template: `
    <app-header></app-header>

    <main class="flex flex-col" style="height: calc(100vh - 48px)">

      <!-- ── Primary toolbar row ───────────────────────────────────────── -->
      <div class="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 shrink-0">

        <h2 class="text-base font-bold text-gray-800 shrink-0">Events</h2>

        <!-- Smart Search -->
        <div class="flex-1 min-w-0 relative">
          <i class="fa-solid fa-magnifying-glass" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;color:#9ca3af;pointer-events:none;z-index:1"></i>
          <input type="search" [formControl]="searchCtrl"
                 (input)="onSearch()"
                 (focus)="onSearchFocus()"
                 (blur)="onSearchBlur()"
                 placeholder="Search events…"
                 class="field-input w-full"
                 style="padding-left:30px"
                 autocomplete="off">

          <!-- Search suggestions dropdown -->
          <div *ngIf="showSearchSuggestions && searchSuggestions.length > 0"
               class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            <button *ngFor="let suggestion of searchSuggestions; let isLast = last"
                    type="button"
                    (click)="selectSearchSuggestion(suggestion)"
                    class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                    [style.border-bottom]="!isLast ? '1px solid #f3f4f6' : 'none'">
              <div class="font-medium text-gray-900">{{ suggestion.label }}</div>
              <div class="text-xs text-gray-500">{{ suggestion.meta }}</div>
            </button>
          </div>
        </div>

        <!-- Filter toggle (mobile only) -->
        <button mat-icon-button class="md:hidden relative shrink-0"
                (click)="showFilters = !showFilters"
                [style.color]="activeFilterCount > 0 ? 'var(--color-primary)' : '#6b7280'"
                [attr.aria-label]="showFilters ? 'Hide filters' : 'Show filters'">
          <mat-icon>{{ showFilters ? 'filter_list_off' : 'filter_list' }}</mat-icon>
          <span *ngIf="activeFilterCount > 0"
                class="absolute top-1 right-1 w-4 h-4 rounded-full text-white flex items-center justify-center"
                style="font-size:9px;font-weight:700;background-color:var(--color-primary);line-height:1">
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

        <!-- "New Event" button removed — kept the empty-state CTA further down
             so the very first event can still be created from this page. -->

      </div>

      <!-- ── Filter panel (toggle on mobile, always on desktop) ──────────── -->
      <div *ngIf="showFilters || isDesktop"
           class="px-2 py-2 bg-white border-b border-gray-100 shrink-0">

        <div class="flex flex-wrap gap-2 items-end">

          <!-- Mode -->
          <div class="field-wrap-compact" style="width:100px">
            <label class="field-label-compact">Mode</label>
            <select [formControl]="filterModeCtrl" class="field-input-compact">
              <option value="">All</option>
              <option value="in-out">In / Out</option>
              <option value="once-off">Once-Off</option>
            </select>
          </div>

          <!-- Tracking -->
          <div class="field-wrap-compact" style="width:140px">
            <label class="field-label-compact">Tracking</label>
            <select [formControl]="filterTrackingCtrl" class="field-input-compact">
              <option value="all">All Events</option>
              <option value="hours">Hours Only</option>
              <option value="points">Points Only</option>
              <option value="attendance">Attendance</option>
            </select>
          </div>

          <!-- Department -->
          <div class="field-wrap-compact" style="width:100px">
            <label class="field-label-compact">Dept</label>
            <select [formControl]="filterDeptCtrl" class="field-input-compact">
              <option value="">All</option>
              <option *ngFor="let d of departments" [value]="d">{{ d }}</option>
            </select>
          </div>

          <!-- Category filter is hidden for now — kept in form/code for future use. -->


          <!-- From date -->
          <div class="field-wrap-compact" style="width:140px">
            <label class="field-label-compact">From</label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filter-date">
              <input matInput [matDatepicker]="fromPicker" [formControl]="filterFromCtrl"
                     placeholder="Start date" (click)="fromPicker.open()" readonly>
              <mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle>
              <mat-datepicker #fromPicker></mat-datepicker>
            </mat-form-field>
          </div>

          <!-- To date -->
          <div class="field-wrap-compact" style="width:140px">
            <label class="field-label-compact">To</label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filter-date">
              <input matInput [matDatepicker]="toPicker" [formControl]="filterToCtrl"
                     placeholder="End date" (click)="toPicker.open()" readonly
                     [min]="filterFromCtrl.value">
              <mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle>
              <mat-datepicker #toPicker></mat-datepicker>
            </mat-form-field>
          </div>

          <!-- Active filter count + clear -->
          <ng-container *ngIf="activeFilterCount > 0">
            <span class="text-xs text-gray-500 font-medium shrink-0" style="padding-top:20px">
              {{ filteredEvents.length }}/{{ events.length }}
            </span>
            <button mat-stroked-button (click)="clearFilters()"
                    style="height:32px;color:#ef4444;border-color:#ef4444;font-size:11px;padding:0 8px;flex-shrink:0">
              Clear
            </button>
          </ng-container>

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
      <div *ngIf="!loading && filteredEvents.length > 0" class="flex-1 px-3 pt-3 pb-4 min-h-0">
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

  searchCtrl        = new FormControl('');
  filterModeCtrl    = new FormControl('');
  filterTrackingCtrl = new FormControl('all'); // all | hours | points | attendance
  filterDeptCtrl    = new FormControl('');
  filterCategoryCtrl = new FormControl('');
  filterFromCtrl    = new FormControl('');
  filterToCtrl      = new FormControl('');

  // Cache of unique departments and categories for filter dropdowns
  departments: string[] = [];
  categories: string[] = [];

  gridApi: any;
  private detailApis: any[] = [];
  private attendeeCounts: Map<string, number> = new Map();
  /** Per-event count of attendance records flagged as on-site (within the event's geofence). */
  private onSiteCounts: Map<string, number> = new Map();
  /** Per-event count of attendance records that have a perimeter measurement (on or off site). */
  private perimeterMeasuredCounts: Map<string, number> = new Map();

  showFilters = false;
  isDesktop   = typeof window !== 'undefined' && window.innerWidth >= 768;

  // Smart search
  searchSuggestions: any[] = [];
  showSearchSuggestions = false;

  @HostListener('window:resize')
  onResize() { this.isDesktop = window.innerWidth >= 768; }

  get qp() {
    const c = this.ctx.context;
    return c ? { email: c.email, role: c.role, schoolId: c.schoolId } : {};
  }

  get activeFilterCount(): number {
    return [
      this.filterModeCtrl.value,
      this.filterTrackingCtrl.value !== 'all' ? true : false,
      this.filterDeptCtrl.value,
      this.filterCategoryCtrl.value,
      this.filterFromCtrl.value,
      this.filterToCtrl.value,
    ].filter(Boolean).length;
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
      colId: 'department', field: 'department', headerName: 'Department', width: 120,
      valueFormatter: (p: any) => p.value || '—',
    },
    // Category column hidden for now — kept commented for future use.
    // {
    //   colId: 'category', field: 'category', headerName: 'Category', width: 120,
    //   valueFormatter: (p: any) => p.value || '—',
    // },
    {
      colId: 'attendeeCount', headerName: 'Attendees', width: 100,
      valueGetter: (p: any) => this.getAttendeeCount(p.data._id),
    },
    {
      colId: 'onSite',
      headerName: 'On-site',
      width: 130,
      sortable: true,
      tooltipValueGetter: (p: any) => {
        if (!p.data.captureOptions?.hasGeolocate) return 'Geolocation not enabled for this event';
        if (!p.data.geoTarget) return 'Geolocation enabled, but no target location was set';
        const measured = this.perimeterMeasuredCounts.get(p.data._id) ?? 0;
        const onSite = this.onSiteCounts.get(p.data._id) ?? 0;
        return `${onSite} of ${measured} attendees with a captured location were within the perimeter.`;
      },
      valueGetter: (p: any) => {
        if (!p.data.captureOptions?.hasGeolocate || !p.data.geoTarget) return -1;
        const measured = this.perimeterMeasuredCounts.get(p.data._id) ?? 0;
        return measured === 0 ? 0 : (this.onSiteCounts.get(p.data._id) ?? 0) / measured;
      },
      cellRenderer: (p: any) => {
        if (!p.data.captureOptions?.hasGeolocate || !p.data.geoTarget) {
          return '<span class="text-xs text-gray-400">—</span>';
        }
        const measured = this.perimeterMeasuredCounts.get(p.data._id) ?? 0;
        const onSite = this.onSiteCounts.get(p.data._id) ?? 0;
        if (measured === 0) {
          return '<span class="text-xs text-gray-400">No scans</span>';
        }
        const offSite = measured - onSite;
        const tone = offSite === 0 ? 'green' : (onSite === 0 ? 'red' : 'amber');
        const colours: Record<string, string> = {
          green: 'bg-green-100 text-green-700',
          amber: 'bg-amber-100 text-amber-700',
          red:   'bg-red-100 text-red-700',
        };
        return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colours[tone]}">${onSite}/${measured} on-site</span>`;
      },
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
        <div class="flex items-center justify-end gap-1.5 h-full">
          <button type="button" data-action="qr" data-id="${p.data._id}" aria-label="Open QR codes"
            class="event-action-btn"
            style="background-color:var(--color-secondary)">QR</button>
          <button type="button" data-action="detail" data-id="${p.data._id}" aria-label="Open event"
            class="event-action-btn"
            style="background-color:var(--color-primary)">Open</button>
        </div>`,
      onCellClicked: (p: any) => {
        const target = p.event?.target as HTMLElement | null;
        const btn = target?.closest('[data-action]') as HTMLElement | null;
        if (!btn) return;
        // Stop AG Grid's row-click handler from also firing (it would toggle
        // the master-detail expansion right under the click).
        p.event?.stopPropagation?.();
        const action = btn.dataset['action'];
        const id = btn.dataset['id'] ?? p.data?._id;
        if (!id) return;
        if (action === 'qr') {
          this.router.navigate(['/teacher/events', id, 'qr'], { queryParams: this.qp });
        } else if (action === 'detail') {
          this.router.navigate(['/teacher/events', id], { queryParams: this.qp });
        }
      },
    },
  ];

  gridOptions!: GridOptions;

  constructor(
    private eventsService: EventsService,
    private attendanceService: AttendanceService,
    public ctx: UrlContextService,
    public router: Router,
    private snack: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    // ── Register global export callback used by detail-panel buttons ─────
    (window as any).__iserveExportAttendees =
      (eventId: string, eventName: string) => this.exportEventAttendees(eventId, eventName);

    // ── Subscribe to filter changes ───────────────────────────────────────
    [this.filterModeCtrl, this.filterTrackingCtrl,
     this.filterDeptCtrl, this.filterCategoryCtrl, this.filterFromCtrl, this.filterToCtrl]
      .forEach(ctrl => ctrl.valueChanges.subscribe(() => this.applyFilters()));

    // ── Grid options ──────────────────────────────────────────────────────
    this.gridOptions = {
      defaultColDef: { resizable: true, sortable: true },
      // Pagination disabled — the grid renders the full row set and scrolls
      // internally inside the flex container.
      pagination: false,
      // Slightly taller rows so the action buttons have proper breathing
      // room — especially on touch devices where the global stylesheet
      // bumps `.event-action-btn` to 32px.
      rowHeight: 42,
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
      // Fixed pixel height for the detail panel. The inner grid scrolls
      // vertically when there are more attendees than fit (40 px panel
      // header + 34 px col headers + N × 32 px rows; everything beyond
      // ~12 rows scrolls inside the panel).
      detailRowHeight: 460,
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
          // No pagination — full list, vertical scroll within the 460 px panel
          pagination: false,
          rowGroupPanelShow: 'never',
          pivotPanelShow:    'never',
          getContextMenuItems: (params: any) => {
            if (!params.node?.data) return ['copy', 'export'];
            const record = params.node.data as IAttendance;
            const event = this.events.find(e => e._id === record.eventId);
            if (!event) return ['copy', 'export'];
            return [
              {
                name: 'Edit Attendance',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
                action: () => this.openEditAttendanceDialog(record, event),
              },
              'separator',
              'copy',
              'export',
            ];
          },

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
              colId: 'student', headerName: 'Student', flex: 3, minWidth: 160,
              valueGetter: (p: any) =>
                [p.data.studentFirstName, p.data.studentLastName].filter(Boolean).join(' ')
                || p.data.studentEmail,
            },
            // Email column hidden — student is identified by name now.
            {
              colId: 'gradeClass', headerName: 'Grade / Class', width: 120,
              valueGetter: (p: any) =>
                [p.data.studentGrade, p.data.studentClass].filter(Boolean).join(' · ') || '—',
            },
            { colId: 'studentHouse', field: 'studentHouse', headerName: 'House', width: 100, filter: 'agTextColumnFilter' },
            { colId: 'studentTutor', field: 'studentTutor', headerName: 'Tutor', width: 100, filter: 'agTextColumnFilter' },
            {
              colId: 'timeIn', field: 'timeIn', headerName: 'Time In', width: 150,
              valueFormatter: (p: any) => p.value
                ? new Date(p.value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                : '—',
            },
            {
              colId: 'timeOut', field: 'timeOut', headerName: 'Time Out', width: 150,
              valueFormatter: (p: any) => p.value
                ? new Date(p.value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                : '—',
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
              colId: 'location', headerName: 'On-site', width: 130,
              tooltipValueGetter: (p: any) => {
                const d = p.data?.distanceMeters;
                if (d == null) return 'No location captured for this scan';
                return `Captured ${d}m from the event target.`;
              },
              cellRenderer: (p: any) => {
                const w = p.data?.withinPerimeter;
                const d = p.data?.distanceMeters;
                if (w === true)  return `<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">On-site${d != null ? ' · ' + d + 'm' : ''}</span>`;
                if (w === false) return `<span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">Off-site · ${d}m</span>`;
                return '<span class="text-xs text-gray-400">—</span>';
              },
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

        // Extract unique departments and categories
        const depts = new Set<string>();
        const cats = new Set<string>();
        events.forEach(e => {
          if (e.department) depts.add(e.department);
          if (e.category) cats.add(e.category);
        });
        this.departments = Array.from(depts).sort();
        this.categories = Array.from(cats).sort();

        // Load attendance counts for all events (incl. geofence breakdown).
        // Counts are tracked in maps; the value-getter columns read them, so
        // we have to tell AG Grid to re-evaluate after each fetch settles.
        events.forEach(e => {
          this.attendanceService.getByEvent(e._id).subscribe({
            next: records => {
              this.attendeeCounts.set(e._id, records.length);
              const measured = records.filter(r => r.withinPerimeter !== null && r.withinPerimeter !== undefined);
              this.perimeterMeasuredCounts.set(e._id, measured.length);
              this.onSiteCounts.set(e._id, measured.filter(r => r.withinPerimeter === true).length);
              this.refreshCountColumns();
            },
            error: () => {
              this.attendeeCounts.set(e._id, 0);
              this.perimeterMeasuredCounts.set(e._id, 0);
              this.onSiteCounts.set(e._id, 0);
              this.refreshCountColumns();
            },
          });
        });
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

  openEditAttendanceDialog(record: IAttendance, event: IEvent) {
    const ref = this.dialog.open<
      EditAttendanceDialogComponent,
      EditAttendanceDialogData,
      EditAttendanceDialogResult
    >(EditAttendanceDialogComponent, {
      width: 'min(560px, 94vw)',
      maxHeight: '90vh',
      autoFocus: 'first-tabbable',
      data: { record, event, teacherEmail: this.ctx.email },
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.attendanceService.update(record._id, result.payload).subscribe({
        next: () => {
          this.snack.open('Attendance updated.', 'Close', { duration: 2500 });
          // Refresh the detail panel by reloading attendance counts
          this.attendanceService.getByEvent(event._id).subscribe({
            next: records => {
              this.attendeeCounts.set(event._id, records.length);
              this.refreshCountColumns();
              // Refresh all open detail grids so the edited row updates
              this.detailApis.forEach(api => {
                try { (api as any).refreshInfiniteCache?.(); } catch {}
              });
            },
          });
        },
        error: err => {
          this.snack.open(err?.error?.message ?? err?.message ?? 'Update failed.', 'Close', { duration: 4000 });
        },
      });
    });
  }

  // ── Filter logic ──────────────────────────────────────────────────────────
  applyFilters() {
    const mode      = this.filterModeCtrl.value   ?? '';
    const tracking  = this.filterTrackingCtrl.value ?? 'all';
    const dept      = this.filterDeptCtrl.value   ?? '';
    const category  = this.filterCategoryCtrl.value ?? '';
    const from      = this.filterFromCtrl.value   ?? '';
    const to        = this.filterToCtrl.value     ?? '';

    this.filteredEvents = this.events.filter(e => {
      // QR Mode filter
      if (mode && e.qrMode !== mode) return false;

      // Tracking type filter
      if (tracking === 'hours' && e.hourMode === 'disabled') return false;
      if (tracking === 'points' && e.pointsMode === 'disabled') return false;
      if (tracking === 'attendance' && (e.hourMode !== 'disabled' || e.pointsMode !== 'disabled')) return false;

      // Department and category
      if (dept && e.department !== dept) return false;
      if (category && e.category !== category) return false;

      // Date range
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
    this.filterTrackingCtrl.setValue('all');
    this.filterDeptCtrl.setValue('');
    this.filterCategoryCtrl.setValue('');
    this.filterFromCtrl.setValue('');
    this.filterToCtrl.setValue('');
  }

  // Helper to get attendee count for an event
  getAttendeeCount(eventId: string): number {
    return this.attendeeCounts.get(eventId) ?? 0;
  }

  /** Force AG Grid to re-evaluate the value-getter columns whose data lives
   * in async maps (attendees + on-site breakdown). */
  private refreshCountColumns() {
    if (!this.gridApi) return;
    this.gridApi.refreshCells({
      columns: ['attendeeCount', 'onSite'],
      force: true,
    });
  }

  // ── Export: master events grid ────────────────────────────────────────────
  /**
   * Uses SheetJS rather than AG Grid Enterprise's `exportDataAsExcel` so
   * the result is consistent across browsers and includes the full row set
   * regardless of which columns the responsive layout is currently hiding.
   */
  exportMasterGrid() {
    try {
      if (!this.filteredEvents?.length) {
        this.snack.open('Nothing to export.', 'Close', { duration: 2500 });
        return;
      }
      const rows = this.filteredEvents.map(e => ({
        'Event':       e.eventName ?? '',
        'Mode':        e.qrMode === 'in-out' ? 'In / Out' : 'Once-Off',
        'Hours':       ({ 'in-out': 'In/Out', fixed: 'Fixed', volume: 'Volume', disabled: 'None' } as any)[e.hourMode as any] ?? e.hourMode ?? '',
        'Points':      e.pointsEnabled ? `${e.pointsValue ?? 0} pts` : '',
        'Department':  e.department ?? '',
        'Attendees':   this.getAttendeeCount(e._id),
        'On-site':     this.formatOnSiteForExport(e),
        'Created':     e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const widths = Object.keys(rows[0]).map(k => ({
        wch: Math.max(k.length, ...rows.map(r => String((r as any)[k] ?? '').length)) + 2,
      }));
      (ws as any)['!cols'] = widths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Events');
      XLSX.writeFile(wb, `Events_${new Date().toISOString().slice(0, 10)}.xlsx`);
      this.snack.open(`Exported ${rows.length} ${rows.length === 1 ? 'event' : 'events'}.`, 'Close', { duration: 2500 });
    } catch (err) {
      console.error('Export failed', err);
      this.snack.open('Export failed. Please try again.', 'Close', { duration: 3500 });
    }
  }

  /** Renders the on-site stat the same way the grid cell does. */
  private formatOnSiteForExport(e: IEvent): string {
    if (!e.captureOptions?.hasGeolocate || !(e as any).geoTarget) return '';
    const measured = this.perimeterMeasuredCounts.get(e._id) ?? 0;
    if (measured === 0) return 'No scans';
    return `${this.onSiteCounts.get(e._id) ?? 0} / ${measured}`;
  }

  // ── Export: individual event attendees (SheetJS → .xlsx) ──────────────────
  exportEventAttendees(eventId: string, eventName: string) {
    this.attendanceService.getByEvent(eventId).subscribe({
      next: records => {
        if (!records?.length) {
          this.snack.open('No attendees yet for this event.', 'Close', { duration: 2500 });
          return;
        }
        try {
          this.writeAttendeesXlsx(records, eventName);
          this.snack.open(`Exported ${records.length} ${records.length === 1 ? 'attendee' : 'attendees'}.`, 'Close', { duration: 2500 });
        } catch (err) {
          console.error('Excel export failed', err);
          this.snack.open('Export failed. Please try again.', 'Close', { duration: 3500 });
        }
      },
      error: err => {
        console.error('Failed to fetch attendees for export', err);
        this.snack.open(err?.error?.message ?? 'Could not load attendees for export.', 'Close', { duration: 3500 });
      },
    });
  }

  private writeAttendeesXlsx(records: IAttendance[], eventName: string) {
    const fmtHours = (v: number | null | undefined) => {
      if (v == null) return '';
      const h = Math.floor(v), m = Math.round((v - h) * 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const rows = records.map(r => ({
      'First Name': r.studentFirstName ?? '',
      'Last Name':  r.studentLastName  ?? '',
      'Email':      r.studentEmail     ?? '',
      'Grade':      r.studentGrade     ?? '',
      'Class':      r.studentClass     ?? '',
      'House':      r.studentHouse     ?? '',
      'Tutor':      r.studentTutor     ?? '',
      'Time In':    r.timeIn  ? new Date(r.timeIn).toLocaleString()  : '',
      'Time Out':   r.timeOut ? new Date(r.timeOut).toLocaleString() : '',
      'Hours':      fmtHours(r.hours),
      'Points':     r.pointsAwarded ?? 0,
      'Source':     r.source ?? '',
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

  // xs  < 480: Event Name + Actions
  // sm 480-639: + Mode badge
  // md 640-767: + Hours, Points
  // lg 768-1023: + Attendees, On-site
  // xl 1024-1279: + Department
  // 2xl >=1280: + Created date
  private applyMasterResponsive() {
    if (!this.gridApi) return;
    const w = window.innerWidth;
    this.gridApi.setColumnsVisible(['qrMode'],                                  w >= 480);
    this.gridApi.setColumnsVisible(['hourMode', 'pointsEnabled'],               w >= 640);
    this.gridApi.setColumnsVisible(['attendeeCount', 'onSite'],                 w >= 768);
    this.gridApi.setColumnsVisible(['department'],                              w >= 1024);
    this.gridApi.setColumnsVisible(['createdAt'],                               w >= 1280);
    this.gridApi.refreshHeader?.();
  }

  // xs <480: student+hours | sm 480+: +source | md 768+: +email+grade | lg 1024+: +times+points
  private applyDetailResponsive(api: any) {
    if (!api) return;
    const w = window.innerWidth;
    api.setColumnsVisible(['source'],                                      w >= 480);
    api.setColumnsVisible(['gradeClass'],                                  w >= 768);
    api.setColumnsVisible(['timeIn', 'timeOut', 'pointsAwarded'],          w >= 1024);
    api.setColumnsVisible(['studentHouse', 'studentTutor'],                w >= 1280);
  }

  onSearch() {
    const query = (this.searchCtrl.value ?? '').toLowerCase().trim();

    // Update grid filter
    this.gridApi?.setGridOption('quickFilterText', query);

    // Generate suggestions from loaded events
    if (query.length > 0) {
      this.searchSuggestions = this.events
        .filter(e =>
          e.eventName.toLowerCase().includes(query) ||
          (e.department && e.department.toLowerCase().includes(query)) ||
          (e.category && e.category.toLowerCase().includes(query))
        )
        .slice(0, 5)
        .map(e => ({
          type: 'event',
          id: e._id,
          label: e.eventName,
          meta: e.department || '—',
        }));
      this.showSearchSuggestions = true;
    } else {
      this.showSearchSuggestions = false;
      this.searchSuggestions = [];
    }
  }

  selectSearchSuggestion(suggestion: any) {
    if (suggestion.type === 'event') {
      this.searchCtrl.setValue(suggestion.label);
      this.showSearchSuggestions = false;
      this.router.navigate(['/teacher/events', suggestion.id], { queryParams: this.qp });
    }
  }

  onSearchFocus() {
    if (this.searchCtrl.value && this.searchCtrl.value.length > 0) {
      this.showSearchSuggestions = true;
    }
  }

  onSearchBlur() {
    // Delay to allow click on suggestion to register
    setTimeout(() => this.showSearchSuggestions = false, 200);
  }
}
