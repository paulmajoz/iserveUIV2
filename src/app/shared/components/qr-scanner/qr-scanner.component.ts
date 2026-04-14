import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZXingScannerModule } from '@zxing/ngx-scanner';

export interface ScannedPayload {
  eventId?: string;
  direction?: 'in' | 'out';
  studentEmail?: string;
  studentFirst?: string;
  studentLast?: string;
  studentGrade?: string;
  studentClass?: string;
  schoolId?: string;
  raw?: string;
}

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, ZXingScannerModule],
  template: `
    <div class="relative rounded-xl overflow-hidden border border-gray-200 bg-black"
         style="max-width: 480px;">
      <zxing-scanner
        [enable]="enabled"
        (scanSuccess)="onScan($event)"
        (permissionResponse)="hasPermission = $event"
        class="w-full"
      ></zxing-scanner>
      <div *ngIf="!hasPermission"
           class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
        <p class="text-white text-sm text-center px-4">
          Camera permission required to scan QR codes.
        </p>
      </div>
      <div *ngIf="lastScan"
           class="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-xs p-2 text-center">
        Scanned ✓
      </div>
    </div>
  `,
})
export class QrScannerComponent implements OnDestroy {
  @Output() scanned = new EventEmitter<ScannedPayload>();

  enabled = true;
  hasPermission = true;
  lastScan = '';

  onScan(raw: string): void {
    if (raw === this.lastScan) return; // debounce repeated scans
    this.lastScan = raw;
    setTimeout(() => (this.lastScan = ''), 3000);

    this.scanned.emit(this.parse(raw));
  }

  private parse(raw: string): ScannedPayload {
    // Try b64 encoded JSON
    if (raw.startsWith('b64:')) {
      try {
        const json = atob(raw.slice(4).replace(/-/g, '+').replace(/_/g, '/'));
        const obj = JSON.parse(json);
        return { ...obj, raw };
      } catch {}
    }

    // Try plain JSON
    try {
      const obj = JSON.parse(raw);
      return { ...obj, raw };
    } catch {}

    // Try URL
    try {
      const url = new URL(raw);
      const parts = url.pathname.split('/');
      const submitIdx = parts.indexOf('submit');
      const eventId = submitIdx >= 0 ? parts[submitIdx + 1] : undefined;
      const direction = (url.searchParams.get('direction') ?? 'in') as 'in' | 'out';
      return { eventId, direction, raw };
    } catch {}

    return { raw };
  }

  ngOnDestroy(): void {
    this.enabled = false;
  }
}
