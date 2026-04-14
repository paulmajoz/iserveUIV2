import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { QrDisplayComponent } from '../../../shared/components/qr-display/qr-display.component';
import { EventsService, IEvent } from '../../../core/services/events.service';
import { UrlContextService } from '../../../core/services/url-context.service';

@Component({
  selector: 'app-qr-manager',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    HeaderComponent,
    QrDisplayComponent,
  ],
  template: `
    <app-header></app-header>

    <main class="max-w-3xl mx-auto p-4 pb-12">

      <!-- Back + title -->
      <div class="flex items-center gap-3 my-6">
        <button mat-icon-button
                (click)="router.navigate(['/teacher/events', eventId], { queryParams: qp })"
                aria-label="Back to event">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 class="text-2xl font-bold text-gray-800">QR Codes</h2>
      </div>

      <!-- Load error -->
      <div *ngIf="loadError" class="error-banner mb-6">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">Could not load QR codes</p>
          <p class="mt-0.5 text-red-600">{{ loadError }}</p>
        </div>
      </div>

      <!-- Email error -->
      <div *ngIf="emailError" class="error-banner mb-6">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">Email failed</p>
          <p class="mt-0.5 text-red-600">{{ emailError }}</p>
        </div>
      </div>

      <!-- Download error -->
      <div *ngIf="downloadError" class="error-banner mb-6">
        <mat-icon class="shrink-0 text-red-500">error_outline</mat-icon>
        <div>
          <p class="font-semibold">Download failed</p>
          <p class="mt-0.5 text-red-600">{{ downloadError }}</p>
        </div>
      </div>

      <!-- Loading spinner -->
      <div *ngIf="loading" class="flex justify-center py-16">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- Event info card -->
      <div *ngIf="event && !loading" class="card mb-6">
        <p class="text-lg font-semibold text-gray-800">{{ event.eventName }}</p>
        <p class="text-sm text-gray-500 mt-1">
          Mode: {{ event.qrMode === 'in-out' ? 'Sign In + Sign Out' : 'Single Scan' }}
        </p>
      </div>

      <!-- QR display cards -->
      <div *ngIf="event && !loading" class="flex flex-wrap gap-6 justify-center">
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

      <!-- No QR codes warning -->
      <div *ngIf="event && !loading && !event.qrCodeIn" class="info-banner">
        <mat-icon class="shrink-0 text-blue-500">info</mat-icon>
        <p>No QR codes are attached to this event. This may be an older event — try recreating it.</p>
      </div>

    </main>
  `,
})
export class QrManagerComponent implements OnInit {
  event?: IEvent;
  eventId = '';
  loading = true;
  loadError = '';
  emailError = '';
  downloadError = '';

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

  private isValidId(id: string): boolean {
    return /^[a-f\d]{24}$/i.test(id);
  }

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.isValidId(this.eventId)) {
      this.loading = false;
      this.loadError = `Invalid event ID "${this.eventId}". Navigate to an event from the Events list.`;
      return;
    }
    this.eventsService.getEventById(this.eventId).subscribe({
      next: e => {
        this.event = e;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.loadError = err?.error?.message ?? err?.message ?? 'Failed to load event. Please try again.';
      },
    });
  }

  downloadPdf(direction: 'in' | 'out') {
    this.downloadError = '';
    this.eventsService.downloadQrPdf(this.eventId, direction).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.event?.eventName ?? 'event'}_QR_${direction.toUpperCase()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: err => {
        this.downloadError = err?.error?.message ?? err?.message ?? 'Failed to download PDF. Please try again.';
      },
    });
  }

  sendEmail() {
    this.emailError = '';
    this.eventsService.sendEmail(this.eventId).subscribe({
      next: () => this.snack.open('Email sent successfully!', 'Close', { duration: 3000 }),
      error: err => {
        this.emailError = err?.error?.message ?? err?.message ?? 'Failed to send email. Please check your email settings.';
      },
    });
  }
}
