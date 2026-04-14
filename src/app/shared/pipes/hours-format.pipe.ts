import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'hoursFormat', standalone: true })
export class HoursFormatPipe implements PipeTransform {
  transform(hours: number | null | undefined): string {
    if (hours == null) return '—';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
}
