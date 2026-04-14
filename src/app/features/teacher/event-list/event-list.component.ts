import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
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
  imports: [CommonModule, AgGridAngular, HeaderComponent],
  template: `
    <app-header></app-header>

    <main class="flex flex-col h-[calc(100vh-64px)]">
      <!-- Toolbar -->
      <div class="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100">
        <h2 class="text-xl font-bold text-gray-800">Events</h2>
        <div class="flex gap-3">
          <input
            type="text"
            placeholder="Search events..."
            (input)="onSearch($event)"
            class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-56"
          />
          <button
            (click)="router.navigate(['/teacher/events/create'], { queryParams: qp })"
            class="btn-primary text-sm">
            + New Event
          </button>
        </div>
      </div>

      <!-- AG Grid -->
      <div class="flex-1 p-4">
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
          .find((el: any) => el.dataset?.action)as HTMLElement | undefined;
        if (action?.dataset['action'] === 'qr') {
          this.router.navigate(['/teacher/events', p.data._id, 'qr'], { queryParams: this.qp });
        }
      },
    },
  ];

  gridOptions: GridOptions = {
    defaultColDef: {
      resizable: true,
      sortable: true,
    },
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
    if (c) {
      this.eventsService
        .getEventsByPerson(c.schoolId, c.email, c.role)
        .subscribe(events => (this.events = events));
    }
  }

  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;
    this.adjustColumnsForScreenSize();
    window.addEventListener('resize', () => this.adjustColumnsForScreenSize());
  }

  private adjustColumnsForScreenSize() {
    if (!this.gridApi) return;
    if (window.innerWidth < 768) {
      // Mobile: hide extra columns
      this.gridApi.setColumnsVisible(['hourMode', 'pointsEnabled', 'createdAt'], false);
    } else {
      this.gridApi.setColumnsVisible(['hourMode', 'pointsEnabled', 'createdAt'], true);
    }
  }

  onSearch(e: Event) {
    const q = (e.target as HTMLInputElement).value;
    this.gridApi?.setGridOption('quickFilterText', q);
  }

  onRowClick(e: any) {
    if ((e.event as MouseEvent).composedPath().some((el: any) => el.dataset?.action)) return;
    this.router.navigate(['/teacher/events', e.data._id], { queryParams: this.qp });
  }
}
