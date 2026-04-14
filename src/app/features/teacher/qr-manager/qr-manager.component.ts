import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { QrDisplayComponent } from '../../../shared/components/qr-display/qr-display.component';
import { EventsService, IEvent } from '../../../core/services/events.service';
import { UrlContextService } from '../../../core/services/url-context.service';

@Component({
  selector: 'app-qr-manager',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule, HeaderComponent, QrDisplayComponent],
  template: `
    <app-header></app-header>

    <main class="max-w-3xl mx-auto p-6">
      <div class="flex items-center gap-3 mb-6">
        <button (click)="router.navigate(['/teacher/events', eventId], { queryParams: qp })"
                class="text-gray-400 hover:text-gray-600">← Back to Event</button>
        <h2 class="text-2xl font-bold text-gray-800">QR Codes</h2>
      </div>

      <div *ngIf="event" class="mb-6 card">
        <p class="text-lg font-semibold text-gray-800">{{ event.eventName }}</p>
        <p class="text-sm text-gray-500">Mode: {{ event.qrMode === 'in-out' ? 'Sign In + Sign Out' : 'Single Scan' }}</p>
      </div>

      <div *ngIf="event" class="flex flex-wrap gap-6 justify-center">
        <app-qr-display
          *ngIf="event.qrCodeIn"
          [qrDataUrl]="event.qrCodeIn"
          [eventName]="event.eventName"
          [label]="event.qrMode === 'once-off' ? 'SCAN TO ATTEND' : 'SIGN IN'"
          direction="in"
          (onDownload)="downloadPdf('in')"
          (onEmail)="sendEmail()"
        ></app-qr-display>

        <app-qr-display
          *ngIf="event.qrMode === 'in-out' && event.qrCodeOut"
          [qrDataUrl]="event.qrCodeOut"
          [eventName]="event.eventName"
          label="SIGN OUT"
          direction="out"
          (onDownload)="downloadPdf('out')"
          (onEmail)="sendEmail()"
        ></app-qr-display>
      </div>

      <div *ngIf="!event" class="flex justify-center py-12">
        <div class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    </main>
  `,
})
export class QrManagerComponent implements OnInit {
  event?: IEvent;
  eventId = '';

  get qp() {
    const c = this.ctx.context;
    return c ? { email: c.email, role: c.role, schoolId: c.schoolId } : {};
  }

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private eventsService: EventsService,
    public ctx: UrlContextService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id') ?? '';
    this.eventsService.getEventById(this.eventId).subscribe(e => (this.event = e));
  }

  downloadPdf(direction: 'in' | 'out') {
    this.eventsService.downloadQrPdf(this.eventId, direction).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.event?.eventName ?? 'event'}_QR_${direction.toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  sendEmail() {
    this.eventsService.sendEmail(this.eventId).subscribe({
      next: () => this.snack.open('Email sent to teacher!', 'Close', { duration: 3000 }),
      error: () => this.snack.open('Failed to send email.', 'Close', { duration: 3000 }),
    });
  }
}
