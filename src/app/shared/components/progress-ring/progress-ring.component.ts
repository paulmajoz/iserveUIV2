import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Simple SVG progress ring. Dual-arc rendering: the full track is a faint
 * background circle, the achieved arc sits on top in the brand colour (or
 * green once we hit 100%).
 *
 * Usage:
 *   <app-progress-ring
 *     [value]="12"
 *     [max]="18"
 *     [size]="160"
 *     [stroke]="14"
 *     [colour]="'var(--color-primary)'"
 *     label="Hours"
 *     [valueText]="12 + 'h'">
 *   </app-progress-ring>
 */
@Component({
  selector: 'app-progress-ring',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="inline-flex flex-col items-center"
         [style.width.px]="size">
      <svg [attr.width]="size" [attr.height]="size"
           [attr.viewBox]="'0 0 ' + size + ' ' + size"
           style="transform: rotate(-90deg);">
        <!-- track -->
        <circle [attr.cx]="size / 2"
                [attr.cy]="size / 2"
                [attr.r]="radius"
                fill="none"
                [attr.stroke]="trackColour"
                [attr.stroke-width]="stroke" />
        <!-- progress -->
        <circle [attr.cx]="size / 2"
                [attr.cy]="size / 2"
                [attr.r]="radius"
                fill="none"
                [attr.stroke]="resolvedColour"
                [attr.stroke-width]="stroke"
                [attr.stroke-dasharray]="circumference"
                [attr.stroke-dashoffset]="dashOffset"
                stroke-linecap="round"
                style="transition: stroke-dashoffset 600ms ease-out, stroke 200ms;" />
      </svg>

      <!-- Centred text -->
      <div class="absolute flex flex-col items-center justify-center pointer-events-none"
           [style.width.px]="size"
           [style.height.px]="size">
        <p *ngIf="valueText"
           class="font-bold leading-none"
           [style.font-size.px]="Math.round(size * 0.20)"
           [style.color]="resolvedColour">
          {{ valueText }}
        </p>
        <p *ngIf="label"
           class="text-gray-500 mt-1 uppercase tracking-wider font-semibold"
           [style.font-size.px]="Math.max(10, Math.round(size * 0.08))">
          {{ label }}
        </p>
        <p *ngIf="subLabel"
           class="text-gray-400 mt-0.5"
           [style.font-size.px]="Math.max(9, Math.round(size * 0.075))">
          {{ subLabel }}
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      position: relative;
      display: inline-block;
    }
  `],
})
export class ProgressRingComponent {
  @Input() value = 0;
  @Input() max = 100;
  @Input() size = 160;
  @Input() stroke = 14;
  @Input() colour = 'var(--color-primary)';
  @Input() trackColour = '#e5e7eb';
  /** Colour used when achievement >= 100% (overrides `colour`). Set to '' to disable. */
  @Input() completeColour = '#22c55e';
  @Input() label = '';
  @Input() subLabel = '';
  @Input() valueText = '';

  // Expose Math to the template
  Math = Math;

  get radius(): number {
    return (this.size - this.stroke) / 2;
  }

  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  get percent(): number {
    if (this.max <= 0) return 0;
    return Math.max(0, Math.min(1, this.value / this.max));
  }

  get dashOffset(): number {
    return this.circumference * (1 - this.percent);
  }

  get resolvedColour(): string {
    if (this.percent >= 1 && this.completeColour) return this.completeColour;
    return this.colour;
  }
}
