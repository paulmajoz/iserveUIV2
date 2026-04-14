import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-qr-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card flex flex-col items-center gap-4 max-w-xs">
      <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
           [style.background-color]="badgeColor">
        {{ label[0] }}
      </div>
      <p class="text-sm font-semibold uppercase tracking-wide" [style.color]="badgeColor">
        {{ label }}
      </p>
      <img [src]="qrDataUrl" alt="QR Code" class="w-56 h-56 border border-gray-100 rounded-lg" />
      <p class="text-xs text-gray-500 text-center">{{ eventName }}</p>
      <div class="flex gap-2 w-full">
        <button (click)="onPrint()" class="btn-primary flex-1 text-sm">Print</button>
        <button (click)="onDownload.emit(direction)" class="btn-secondary flex-1 text-sm">PDF</button>
        <button (click)="onEmail.emit()" class="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">Email</button>
      </div>
    </div>
  `,
})
export class QrDisplayComponent {
  @Input() qrDataUrl = '';
  @Input() eventName = '';
  @Input() label = 'SCAN';
  @Input() direction: 'in' | 'out' = 'in';
  @Output() onDownload = new EventEmitter<'in' | 'out'>();
  @Output() onEmail = new EventEmitter<void>();

  get badgeColor(): string {
    if (this.direction === 'out') return '#ef4444';
    return 'var(--color-primary)';
  }

  onPrint(): void {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>QR - ${this.eventName}</title>
      <style>
        body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
        h2 { color: #1a1a1a; font-size: 18px; margin-bottom: 8px; }
        p { color: #666; font-size: 13px; }
        img { width: 300px; height: 300px; }
      </style></head>
      <body>
        <h2>${this.eventName}</h2>
        <p>${this.label}</p>
        <img src="${this.qrDataUrl}" />
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  }
}
