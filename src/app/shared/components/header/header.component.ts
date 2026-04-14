import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UrlContextService } from '../../../core/services/url-context.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <header class="page-header">
      <div class="h-inner">

        <!-- Left: logo + school name -->
        <div class="h-brand">
          <img *ngIf="logoPath" [src]="logoPath" alt="School logo" class="h-logo" />
          <div class="h-name-wrap">
            <span class="h-name">{{ schoolName || 'iServe' }}</span>
            <span class="h-sub">Attendance &amp; Community Service</span>
          </div>
        </div>

        <!-- Right: nav links + email -->
        <nav class="h-nav" *ngIf="ctx.context">
          <a *ngIf="ctx.isTeacher()"
             routerLink="/teacher/events"
             [queryParams]="queryParams"
             class="h-link">
            Events
          </a>
          <a *ngIf="ctx.isStudent()"
             routerLink="/student/dashboard"
             [queryParams]="queryParams"
             class="h-link">
            Dashboard
          </a>
          <span class="h-email">{{ ctx.email }}</span>
        </nav>

      </div>
    </header>
  `,
  styles: [`
    :host { display: block; }

    header {
      background-color: var(--color-secondary);
      color: #fff;
    }

    /* Single centred row, max 1200px, 16px side padding */
    .h-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 16px;
      min-height: 56px;
      gap: 12px;
    }

    /* ── Brand (logo + name) ── */
    .h-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex-shrink: 1;
    }
    .h-logo { height: 36px; width: auto; flex-shrink: 0; }
    .h-name-wrap { min-width: 0; }
    .h-name {
      display: block;
      font-weight: 700;
      font-size: 1.05rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .h-sub {
      display: block;
      font-size: 0.68rem;
      opacity: 0.65;
      white-space: nowrap;
    }

    /* ── Nav ── */
    .h-nav {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .h-link {
      color: #fff;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 500;
      padding: 6px 10px;
      border-radius: 6px;
      white-space: nowrap;
      transition: background 0.15s;
    }
    .h-link:hover { background: rgba(255,255,255,0.15); }

    .h-email {
      font-size: 0.72rem;
      opacity: 0.55;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    }

    /* ── Mobile: hide subtitle + email, shrink name ── */
    @media (max-width: 480px) {
      .h-sub   { display: none; }
      .h-email { display: none; }
      .h-name  { font-size: 0.9rem; }
      .h-logo  { height: 28px; }
    }
  `],
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
