import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { UrlContextService } from '../../../core/services/url-context.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="page-header flex items-center justify-between">
      <div class="flex items-center gap-4">
        <img *ngIf="logoPath" [src]="logoPath" alt="School logo" class="h-10 w-auto" />
        <div>
          <h1 class="text-xl font-bold leading-tight">{{ schoolName || 'iServe' }}</h1>
          <p class="text-xs opacity-75">Attendance & Community Service</p>
        </div>
      </div>
      <nav class="flex items-center gap-4 text-sm font-medium" *ngIf="ctx.context">
        <ng-container *ngIf="ctx.isTeacher()">
          <a routerLink="/teacher/events" [queryParams]="queryParams"
             class="hover:opacity-80 transition-opacity">Events</a>
          <a routerLink="/teacher/events/create" [queryParams]="queryParams"
             class="bg-white text-secondary px-3 py-1 rounded-md hover:opacity-90 transition-opacity">
            + New Event
          </a>
        </ng-container>
        <ng-container *ngIf="ctx.isStudent()">
          <a routerLink="/student/dashboard" [queryParams]="queryParams"
             class="hover:opacity-80 transition-opacity">My Dashboard</a>
        </ng-container>
        <span class="opacity-60 text-xs">{{ ctx.email }}</span>
      </nav>
    </header>
  `,
})
export class HeaderComponent implements OnInit {
  @Input() schoolName = '';
  @Input() logoPath = '';

  constructor(public ctx: UrlContextService, private api: ApiService) {}

  get queryParams() {
    const c = this.ctx.context;
    if (!c) return {};
    return { email: c.email, role: c.role, schoolId: c.schoolId };
  }

  ngOnInit() {
    if (!this.schoolName && this.ctx.schoolId) {
      this.api.get<{ name: string; logoPath?: string }>(`schools/id/${this.ctx.schoolId}`)
        .subscribe(s => {
          this.schoolName = s.name;
          this.logoPath = s.logoPath ?? '';
        });
    }
  }
}
