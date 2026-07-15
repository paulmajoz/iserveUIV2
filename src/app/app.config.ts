import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';

import { routes } from './app.routes';
import { ThemeService } from './core/theme/theme.service';
import { environment } from '../environments/environment';

/**
 * Read schoolId from the raw URL query string.
 * APP_INITIALIZER runs before Angular's router processes the URL,
 * so we parse window.location.search directly.
 * Falls back to environment.defaultSchoolId if not present.
 */
function getStartupSchoolId(): number {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('schoolId');
    if (fromUrl) return +fromUrl;
  } catch { /* not in a browser context */ }
  return environment.defaultSchoolId;
}

function initTheme(theme: ThemeService) {
  return () => theme.loadAndApply(getStartupSchoolId());
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    provideAnimations(),
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'en-ZA' },
    {
      provide: APP_INITIALIZER,
      useFactory: initTheme,
      deps: [ThemeService],
      multi: true,
    },
  ],
};
