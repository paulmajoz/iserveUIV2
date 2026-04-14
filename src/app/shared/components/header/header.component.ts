import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UrlContextService } from '../../../core/services/url-context.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  styles: [`
    :host { display: block; }

    header {
      background-color: var(--color-secondary);
      color: white;
    }

    /* ── Top row: always present ── */
    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1rem;
      min-height: 56px;
    }

    /* ── Nav row: shown on wider screens inline; on mobile as a second row ── */
    .header-nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .nav-link {
      opacity: 0.85;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
      white-space: nowrap;
      transition: opacity 0.15s, background 0.15s;
      text-decoration: none;
      color: white;
    }
    .nav-link:hover { opacity: 1; background: rgba(255,255,255,0.12); }

    .nav-btn {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.25);
      color: white;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
      text-decoration: none;
    }
    .nav-btn:hover { background: rgba(255,255,255,0.25); }

    /* Email badge */
    .email-badge {
      font-size: 0.7rem;
      opacity: 0.55;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Mobile second row for nav */
    .header-nav-row {
      display: none;
      padding: 0 1rem 0.5rem;
      gap: 0.5rem;
      flex-wrap: wrap;
      align-items: center;
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    /* ── Responsive breakpoints ── */

    /* ≤ 480px : compact mode */
    @media (max-width: 480px) {
      /* Hide nav from top row */
      .header-top .header-nav { display: none; }
      /* Show nav as second row */
      .header-nav-row { display: flex; }
      /* School name smaller */
      .school-name { font-size: 0.95rem; }
      .school-sub  { display: none; }
      /* Logo smaller */
      .school-logo { height: 28px; }
    }

    /* 481–767px : mid-size, keep inline but hide email */
    @media (min-width: 481px) and (max-width: 767px) {
      .email-badge { display: none; }
      .school-name { font-size: 1rem; }
    }
  `],
  template: `
    <header>
      <!-- ── Top row ── -->
      <div class="header-top">

        <!-- Left: logo + name -->
        <div class="flex items-center gap-2 min-w-0">
          <img *ngIf="logoPath" [src]="logoPath" alt="School logo" class="school-logo h-9 w-auto flex-shrink-0" />
          <div class="min-w-0">
            <p class="school-name font-bold leading-tight truncate text-xl">{{ schoolName || 'iServe' }}</p>
            <p class="school-sub text-xs opacity-70 truncate">Attendance &amp; Community Service</p>
          </div>
        </div>

        <!-- Right: nav (hidden on mobile — shown in second row instead) -->
        <nav class="header-nav" *ngIf="ctx.context" aria-label="Main navigation">
          <ng-container *ngIf="ctx.isTeacher()">
            <a routerLink="/teacher/events" [queryParams]="queryParams" class="nav-link">Events</a>
            <a routerLink="/teacher/events/create" [queryParams]="queryParams" class="nav-btn">
              <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px">add</mat-icon>
              New Event
            </a>
          </ng-container>
          <ng-container *ngIf="ctx.isStudent()">
            <a routerLink="/student/dashboard" [queryParams]="queryParams" class="nav-link">My Dashboard</a>
          </ng-container>
          <span class="email-badge">{{ ctx.email }}</span>
        </nav>
      </div>

      <!-- ── Mobile nav row (shown only on ≤480px) ── -->
      <div class="header-nav-row" *ngIf="ctx.context">
        <ng-container *ngIf="ctx.isTeacher()">
          <a routerLink="/teacher/events" [queryParams]="queryParams" class="nav-link">
            <mat-icon style="font-size:15px;width:15px;height:15px;vertical-align:-3px;margin-right:3px">event</mat-icon>
            Events
          </a>
          <a routerLink="/teacher/events/create" [queryParams]="queryParams" class="nav-btn">
            <mat-icon style="font-size:15px;width:15px;height:15px;line-height:15px">add</mat-icon>
            New Event
          </a>
        </ng-container>
        <ng-container *ngIf="ctx.isStudent()">
          <a routerLink="/student/dashboard" [queryParams]="queryParams" class="nav-link">
            <mat-icon style="font-size:15px;width:15px;height:15px;vertical-align:-3px;margin-right:3px">dashboard</mat-icon>
            My Dashboard
          </a>
        </ng-container>
        <!-- Email always visible in mobile row, but truncated -->
        <span class="text-xs opacity-50 truncate ml-auto" style="max-width:160px">{{ ctx.email }}</span>
      </div>
    </header>
  `,
})
export class HeaderComponent implements OnInit {
  schoolName = '';
  logoPath = '';

  constructor(public ctx: UrlContextService, private api: ApiService) {}

  get queryParams() {
    const c = this.ctx.context;
    if (!c) return {};
    return { email: c.email, role: c.role, schoolId: c.schoolId };
  }

  ngOnInit() {
    if (this.ctx.schoolId) {
      this.api.get<{ name: string; logoPath?: string }>(`schools/id/${this.ctx.schoolId}`)
        .subscribe({ next: s => { this.schoolName = s.name; this.logoPath = s.logoPath ?? ''; }, error: () => {} });
    }
  }
}
