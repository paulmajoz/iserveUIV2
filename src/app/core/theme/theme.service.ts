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
  constructor(private http: HttpClient) {}

  async loadAndApply(schoolId: number): Promise<void> {
    try {
      const colors = await firstValueFrom(
        this.http.get<ThemeColors>(`${environment.apiUrl}/schools/id/${schoolId}/theme`)
      );
      this.apply(colors);
    } catch {
      // Keep default CSS variable values from styles.css
    }
  }

  apply(colors: ThemeColors): void {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-background', colors.background);
  }
}
