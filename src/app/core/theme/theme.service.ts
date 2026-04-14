import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface ThemeColors {
  primary:    string;   // buttons, toggles, active states, progress bars
  secondary:  string;   // header background, section labels
  accent:     string;   // subtle highlights, AG Grid selected row tint
  surface:    string;   // selected tile light tint
  background: string;   // stored but NOT applied to page bg (fixed neutral used instead)
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
      // School not found or API offline — keep default CSS variable values
    }
  }

  apply(colors: ThemeColors): void {
    if (!colors) return;
    const root = document.documentElement;
    // All five vars from the schools.themeColors schema are written to :root.
    // The CSS decides what each var controls — page/card backgrounds are
    // intentionally fixed neutrals; the vars are used only for branded accents.
    if (colors.primary)    root.style.setProperty('--color-primary',    colors.primary);
    if (colors.secondary)  root.style.setProperty('--color-secondary',  colors.secondary);
    if (colors.accent)     root.style.setProperty('--color-accent',     colors.accent);
    if (colors.surface)    root.style.setProperty('--color-surface',    colors.surface);
    if (colors.background) root.style.setProperty('--color-background', colors.background);
  }
}
