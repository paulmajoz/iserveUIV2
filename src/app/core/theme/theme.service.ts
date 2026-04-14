import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  background: string;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** Track which school IDs we have already loaded so we don't re-fetch */
  private loaded = new Set<number>();

  constructor(private http: HttpClient) {}

  async loadAndApply(schoolId: number): Promise<void> {
    if (!schoolId || this.loaded.has(schoolId)) return;
    try {
      const colors = await firstValueFrom(
        this.http.get<ThemeColors>(`${environment.apiUrl}/schools/id/${schoolId}/theme`)
      );
      if (colors) {
        this.apply(colors);
        this.loaded.add(schoolId);
      }
    } catch {
      // School not found or API offline — keep default CSS variable values from styles.css
    }
  }

  apply(colors: ThemeColors): void {
    if (!colors) return;
    const root = document.documentElement;
    if (colors.primary)    root.style.setProperty('--color-primary',    colors.primary);
    if (colors.secondary)  root.style.setProperty('--color-secondary',  colors.secondary);
    if (colors.accent)     root.style.setProperty('--color-accent',     colors.accent);
    if (colors.surface)    root.style.setProperty('--color-surface',    colors.surface);
    if (colors.background) root.style.setProperty('--color-background', colors.background);
  }
}
