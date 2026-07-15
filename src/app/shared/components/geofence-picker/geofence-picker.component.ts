import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as L from 'leaflet';
import { GeoTarget } from '../../../core/services/events.service';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  place_id: number;
}

/**
 * Inline geofence picker.
 * Teacher clicks on the map (or hits "Use my location") to set the centre,
 * drags the slider to size the radius. Emits a GeoTarget on every change.
 *
 * Usage:
 *   <app-geofence-picker [value]="form.value.geoTarget"
 *                        (valueChange)="form.controls.geoTarget.setValue($event)">
 *   </app-geofence-picker>
 */
@Component({
  selector: 'app-geofence-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="space-y-3">

      <!-- Search bar -->
      <div class="relative">
        <div class="flex items-center gap-2 rounded-xl border border-gray-200 bg-white pl-3 pr-2 focus-within:border-gray-400"
             style="min-height:44px;">
          <mat-icon class="!text-xl text-gray-400">search</mat-icon>
          <input type="text"
                 [(ngModel)]="searchQuery"
                 (ngModelChange)="search$.next($event)"
                 (focus)="showResults = true"
                 (blur)="onSearchBlur()"
                 placeholder="Search address, school, place…"
                 autocapitalize="off"
                 autocorrect="off"
                 spellcheck="false"
                 enterkeyhint="search"
                 class="flex-1 outline-none bg-transparent"
                 style="font-size:16px;" />
          <mat-spinner *ngIf="searching" diameter="18"></mat-spinner>
          <button *ngIf="searchQuery && !searching" type="button"
                  (click)="clearSearch()"
                  aria-label="Clear search"
                  class="text-gray-400 hover:text-gray-600 flex items-center justify-center"
                  style="width:36px; height:36px;">
            <mat-icon class="!text-lg">close</mat-icon>
          </button>
        </div>

        <!-- Results dropdown — z-index above Leaflet's 400 panes -->
        <div *ngIf="showResults && searchResults.length > 0"
             class="absolute left-0 right-0 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg overflow-y-auto"
             style="z-index:1100; max-height:60vh; -webkit-overflow-scrolling:touch;">
          <button *ngFor="let r of searchResults" type="button"
                  (mousedown)="$event.preventDefault()"
                  (touchstart)="$event.preventDefault(); selectResult(r)"
                  (click)="selectResult(r)"
                  class="block w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-50 last:border-b-0"
                  style="min-height:48px;">
            <p class="text-sm text-gray-800 leading-snug">{{ r.display_name }}</p>
          </button>
        </div>
        <div *ngIf="showResults && !searching && searchQuery.length >= 3 && searchResults.length === 0"
             class="absolute left-0 right-0 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg p-3"
             style="z-index:1100;">
          <p class="text-xs text-gray-500">No matches for "{{ searchQuery }}"</p>
        </div>
      </div>

      <div #mapRef class="rounded-xl overflow-hidden border border-gray-200 geofence-map"
           style="cursor: crosshair; touch-action: none; height: 280px; width: 100%;"></div>

      <div class="flex flex-wrap items-center gap-2">
        <button type="button" mat-stroked-button (click)="useMyLocation(true)"
                [disabled]="locating"
                style="min-height:44px; font-size:13px;">
          <span class="flex items-center gap-1.5">
            <mat-icon>my_location</mat-icon>
            {{ locating ? 'Locating…' : 'Use my location' }}
          </span>
        </button>
        <button *ngIf="value" type="button" mat-stroked-button (click)="clear()"
                style="min-height:44px; font-size:13px; color:#ef4444; border-color:#fecaca;">
          <span class="flex items-center gap-1.5">
            <mat-icon>close</mat-icon>
            Clear
          </span>
        </button>
      </div>
      <p *ngIf="!value" class="text-xs text-gray-500">
        Search above, or tap the map to set the location.
      </p>

      <p *ngIf="locateError" class="text-xs text-red-500">{{ locateError }}</p>

      <!-- Radius slider — only visible once a centre is set -->
      <div *ngIf="value" class="bg-gray-50 rounded-xl p-4 space-y-2">
        <div class="flex justify-between items-baseline text-sm">
          <span class="font-semibold text-gray-700">Radius</span>
          <span class="text-gray-800 font-mono">{{ value.radiusMeters }} m</span>
        </div>
        <input type="range" min="10" max="500" step="5"
               [ngModel]="value.radiusMeters"
               (ngModelChange)="onRadiusChange($event)"
               class="geofence-radius-slider w-full accent-blue-600" />
        <div class="flex justify-between text-[11px] text-gray-400">
          <span>10 m</span><span>500 m</span>
        </div>
        <div class="text-[11px] text-gray-500 font-mono pt-2 border-t border-gray-200 break-all">
          Centre: {{ value.lat.toFixed(5) }}, {{ value.lon.toFixed(5) }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Map taller on tablet+ to give the picker room to breathe */
    @media (min-width: 640px) { :host .geofence-map { height: 360px !important; } }

    /* Bigger thumb for touch on the radius slider */
    :host .geofence-radius-slider {
      -webkit-appearance: none;
      appearance: none;
      height: 6px;
      background: #e5e7eb;
      border-radius: 9999px;
      outline: none;
    }
    :host .geofence-radius-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--color-primary, #2c698d);
      border: 3px solid #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.25);
      cursor: pointer;
    }
    :host .geofence-radius-slider::-moz-range-thumb {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--color-primary, #2c698d);
      border: 3px solid #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.25);
      cursor: pointer;
    }
  `],
})
export class GeofencePickerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() value: GeoTarget | null = null;
  @Output() valueChange = new EventEmitter<GeoTarget | null>();

  @ViewChild('mapRef', { static: true }) mapRef!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private marker?: L.Marker;
  private circle?: L.Circle;
  private resizeObserver?: ResizeObserver;

  /** Last known user GPS — used to bias search results toward nearby places. */
  private userPos?: { lat: number; lon: number };

  locating = false;
  locateError = '';

  // ── Search state ─────────────────────────────────────────────────────────
  searchQuery = '';
  searchResults: NominatimResult[] = [];
  searching = false;
  showResults = false;
  readonly search$ = new Subject<string>();

  // CSS-only pin so we don't have to bundle Leaflet's default PNG markers.
  // 26px target = comfortable fingertip drag area on mobile.
  private readonly pinIcon = L.divIcon({
    className: '',
    html:
      '<div style="width:26px;height:26px;background:#2c698d;border:4px solid #fff;' +
      'border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.45);"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Debounced search → Nominatim
    this.search$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        filter((q) => {
          const trimmed = (q ?? '').trim();
          if (trimmed.length < 3) {
            this.searchResults = [];
            this.searching = false;
            return false;
          }
          this.searching = true;
          return true;
        }),
        switchMap((q) => {
          // Bias results toward the user's known position by passing a viewbox
          // (~25 km half-side) and bounded=0 (prefer-but-not-restrict).
          const params: Record<string, string> = {
            q, format: 'json', addressdetails: '0', limit: '5',
          };
          if (this.userPos) {
            const { lat, lon } = this.userPos;
            const dLat = 0.225;                                       // ~25 km
            const dLon = 0.225 / Math.max(Math.cos(lat * Math.PI / 180), 0.1);
            // Nominatim viewbox order: left,top,right,bottom (lon,lat,lon,lat)
            params['viewbox'] = `${lon - dLon},${lat + dLat},${lon + dLon},${lat - dLat}`;
            params['bounded'] = '0';
          }
          return this.http.get<NominatimResult[]>('https://nominatim.openstreetmap.org/search', { params });
        }),
      )
      .subscribe({
        next: (results) => {
          this.searchResults = results ?? [];
          this.searching = false;
          this.showResults = true;
        },
        error: () => {
          this.searchResults = [];
          this.searching = false;
        },
      });
  }

  ngAfterViewInit() {
    // Defer to the next animation frame so the container has fully laid out
    // before Leaflet measures it. Without this, mounting the picker inside an
    // *ngIf can leave the tile layer cached at 0×N until the first user gesture.
    requestAnimationFrame(() => this.initMap());
  }

  private initMap() {
    // Initial centre: saved target if editing, else a reasonable default
    // (Durban, KZN). We'll re-centre to the user's GPS position once we have it.
    const fallback = { lat: -29.8579, lon: 31.0292 };
    const start = this.value ?? { ...fallback, radiusMeters: 50 };

    this.map = L.map(this.mapRef.nativeElement, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([start.lat, start.lon], this.value ? 17 : 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    if (this.value) this.renderTarget(this.value.lat, this.value.lon, this.value.radiusMeters);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const r = this.value?.radiusMeters ?? 50;
      this.renderTarget(e.latlng.lat, e.latlng.lng, r);
      this.emit();
    });

    // Leaflet caches the container size at init. Re-invalidate on every
    // container resize so the tile layer always covers the visible area.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
      this.resizeObserver.observe(this.mapRef.nativeElement);
    }
    // Belt + braces: explicit redraws once the browser has painted
    requestAnimationFrame(() => this.map?.invalidateSize());
    setTimeout(() => this.map?.invalidateSize(), 100);
    setTimeout(() => this.map?.invalidateSize(), 500);

    // Auto-centre on the user's current location for fresh events.
    // We don't drop a pin — the teacher still needs to confirm the centre by
    // clicking, searching, or using the explicit "Use my location" button.
    if (!this.value) this.useMyLocation(false);
  }

  ngOnDestroy() {
    this.search$.complete();
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  /** Re-render marker + circle, creating them if needed. */
  private renderTarget(lat: number, lon: number, radiusMeters: number) {
    const ll = L.latLng(lat, lon);

    if (!this.marker) {
      this.marker = L.marker(ll, { icon: this.pinIcon, draggable: true }).addTo(this.map!);
      this.marker.on('drag', (e: L.LeafletEvent) => {
        const p = (e.target as L.Marker).getLatLng();
        this.circle?.setLatLng(p);
      });
      this.marker.on('dragend', () => this.emit());
    } else {
      this.marker.setLatLng(ll);
    }

    if (!this.circle) {
      this.circle = L.circle(ll, {
        radius: radiusMeters,
        color: '#2c698d',
        weight: 2,
        fillColor: '#2c698d',
        fillOpacity: 0.12,
      }).addTo(this.map!);
    } else {
      this.circle.setLatLng(ll).setRadius(radiusMeters);
    }

    this.value = { lat, lon, radiusMeters };
  }

  onRadiusChange(r: number | string) {
    const radius = +r;
    if (!this.value) return;
    this.value = { ...this.value, radiusMeters: radius };
    this.circle?.setRadius(radius);
    this.emit();
  }

  /**
   * Centre the map on the user's GPS position.
   * @param dropPin When true, also place the pin at that location and emit
   *   a value change. When false (used for auto-centring on mount), only
   *   pans/zooms the map — the teacher still has to confirm the target.
   */
  useMyLocation(dropPin: boolean) {
    if (!('geolocation' in navigator)) {
      if (dropPin) this.locateError = 'Your browser does not support location services.';
      return;
    }
    if (dropPin) this.locateError = '';
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating = false;
        const { latitude, longitude } = pos.coords;
        // Stash for proximity-biased search even when we don't drop a pin
        this.userPos = { lat: latitude, lon: longitude };
        this.map?.setView([latitude, longitude], 17);
        if (dropPin) {
          const r = this.value?.radiusMeters ?? 50;
          this.renderTarget(latitude, longitude, r);
          this.emit();
        }
      },
      (err) => {
        this.locating = false;
        if (dropPin) {
          this.locateError = err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Please allow location access.'
            : 'Couldn\'t get your location.';
        }
        // Silent failure on auto-centre — the map keeps the fallback view.
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  /** A search result was clicked — drop a pin there and centre the map. */
  selectResult(r: NominatimResult) {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return;
    const radius = this.value?.radiusMeters ?? 50;
    this.renderTarget(lat, lon, radius);
    this.map?.setView([lat, lon], 17);
    this.emit();
    this.searchQuery = r.display_name;
    this.showResults = false;
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
    this.showResults = false;
  }

  /** Hide results on blur, with a short delay so click-on-result still fires. */
  onSearchBlur() {
    setTimeout(() => (this.showResults = false), 150);
  }

  clear() {
    if (this.marker) { this.map?.removeLayer(this.marker); this.marker = undefined; }
    if (this.circle) { this.map?.removeLayer(this.circle); this.circle = undefined; }
    this.value = null;
    this.valueChange.emit(null);
  }

  private emit() {
    if (!this.marker || !this.value) {
      this.valueChange.emit(null);
      return;
    }
    const ll = this.marker.getLatLng();
    const next: GeoTarget = {
      lat: ll.lat,
      lon: ll.lng,
      radiusMeters: this.value.radiusMeters,
    };
    this.value = next;
    this.valueChange.emit(next);
  }
}
