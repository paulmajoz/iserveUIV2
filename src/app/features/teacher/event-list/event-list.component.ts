import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AgGridAngular } from 'ag-grid-angular';
import { LicenseManager } from 'ag-grid-enterprise';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { EventsService, IEvent } from '../../../core/services/events.service';
import { UrlContextService } from '../../../core/services/url-context.service';
import { environment } from '../../../../environments/environment';

if (environment.agGridLicense) {
  LicenseManager.setLicenseKey(environment.agGridLicense);
}

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AgGridAngular,
    HeaderComponent,
  ],
  template: `
    <app-header></app-header>

    <main class="flex flex-col h-[calc(100vh-64px)]">
      <!-- Toolbar -->
      <div class="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 gap-4">
        <h2 class="text-xl font-bold text-gray-800 shrink-0">Events</h2>
        <div class="flex items-center gap-3 flex-1 justify-end">
          <!-- Material search field -->
          <mat-form-field appearance="outline" class="!w-56">
            <mat-label>Search events</mat-label>
            <input matInput [formControl]="searchCtrl" (input)="onSearch()" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <button
            mat-raised-button
            (click)="router.navigate(['/teacher/events/create'], { queryParams: qp })"
            style="background-color: var(--color-primary); color: white;">
            <mat-icon>add</mat-icon>
            New Event
          </button>
        </div>
      </div>

      <!-- API error banner -->
      <div *ngIf="apiError" class="error-banner mx-6 mt-4">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">Could not load events</p>
          <p class="mt-0.5 text-red-600">{{ apiError }}</p>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="flex justify-center py-16">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- Empty state -->
      <div *ngIf="!loading && !apiError && events.length === 0"
           class="flex flex-col items-center justify-center flex-1 gap-4 text-gray-400">
        <mat-icon style="font-size: 56px; width: 56px; height: 56px;">event_busy</mat-icon>
        <p class="text-lg font-medium">No events yet</p>
        <p class="text-sm">Create your first event to get started</p>
        <button
          mat-raised-button
          (click)="router.navigate(['/teacher/events/create'], { queryParams: qp })"
          style="background-color: var(--color-primary); color: white;">
          <mat-icon>add</mat-icon>
          Create Event
        </button>
      </div>

      <!-- AG Grid -->
      <div *ngIf="!loading && events.length > 0" class="flex-1 p-4">
        <ag-grid-angular
          class="ag-theme-alpine w-full h-full rounded-xl overflow-hidden shadow-sm"
          [rowData]="events"
          [columnDefs]="columnDefs"
          [gridOptions]="gridOptions"
          (gridReady)="onGridReady($event)"
          (rowClicked)="onRowClick($event)"
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

  columnDefs: ColDef[] = [
    { field: 'eventName', headerName: 'Event Name', flex: 2, filter: 'agTextColumnFilter' },
    {
      field: 'qrMode', headerName: 'QR Mode', width: 140,
      cellRenderer: (p: any) => p.value === 'in-out'
        ? '<span class="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">In/Out</span>'
        : '<span class="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">Single</span>',
    },
    {
      field: 'hourMode', headerName: 'Hours', width: 120,
      valueFormatter: (p: any) => ({ 'in-out': 'In/Out', fixed: 'Fixed', volume: 'Volume', disabled: 'None' }[p.value as string] ?? p.value),
    },
    {
      field: 'pointsEnabled', headerName: 'Points', width: 100,
      cellRenderer: (p: any) => p.value
        ? `<span class="text-green-600 font-medium">${p.data.pointsValue}pts</span>`
        : '<span class="text-gray-400">—</span>',
    },
    {
      field: 'createdAt', headerName: 'Created', width: 150,
      valueFormatter: (p: any) => new Date(p.value).toLocaleDateString(),
      sort: 'desc',
    },
    {
      headerName: 'Actions', width: 120, sortable: false, filter: false,
      cellRenderer: (p: any) => `
        <div class="flex gap-2 items-center h-full">
          <button data-id="${p.data._id}" data-action="qr"
            class="text-xs px-2 py-1 rounded bg-surface text-secondary font-medium hover:opacity-80">
            QR
          </button>
        </div>`,
      onCellClicked: (p: any) => {
        const action = (p.event as MouseEvent).composedPath()
          .find((el: any) => el.dataset?.action) as HTMLElement | undefined;
        if (action?.dataset['action'] === 'qr') {
          this.router.navigate(['/teacher/events', p.data._id, 'qr'], { queryParams: this.qp });
        }
      },
    },
  ];

  gridOptions: GridOptions = {
    defaultColDef: { resizable: true, sortable: true },
    pagination: true,
    paginationPageSize: 20,
    rowHeight: 48,
    suppressRowClickSelection: false,
    enableRangeSelection: true,
  };

  constructor(
    private eventsService: EventsService,
    public ctx: UrlContextService,
    public router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const c = this.ctx.context;
    if (!c) {
      this.loading = false;
      this.apiError = 'No user context found. Please access the app via your school link.';
      return;
    }
    this.eventsService.getEventsByPerson(c.schoolId, c.email, c.role).subscribe({
      next: events => {
        this.events = events;
        this.loading = false;
      },
      error: err => {
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
    if (window.innerWidth < 768) {
      this.gridApi.setColumnsVisible(['hourMode', 'pointsEnabled', 'createdAt'], false);
    } else {
      this.gridApi.setColumnsVisible(['hourMode', 'pointsEnabled', 'createdAt'], true);
    }
  }

  onSearch() {
    this.gridApi?.setGridOption('quickFilterText', this.searchCtrl.value ?? '');
  }

  onRowClick(e: any) {
    if ((e.event as MouseEvent).composedPath().some((el: any) => el.dataset?.action)) return;
    this.router.navigate(['/teacher/events', e.data._id], { queryParams: this.qp });
  }
}
