import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UrlContextService } from '../../core/services/url-context.service';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center p-6"
         style="background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)">
      <div class="text-center text-white space-y-4 max-w-md w-full">
        <mat-icon style="font-size: 64px; width: 64px; height: 64px; opacity: 0.9">volunteer_activism</mat-icon>
        <h1 class="text-4xl font-bold">iServe</h1>
        <p class="text-lg opacity-80">Attendance &amp; Community Service Tracking</p>

        <!-- No context — show guidance -->
        <div *ngIf="!ctx.context" class="mt-8 bg-white/10 rounded-xl p-6 space-y-2">
          <mat-icon style="font-size: 36px; width: 36px; height: 36px; opacity: 0.7">link_off</mat-icon>
          <p class="font-semibold">No school link detected</p>
          <p class="text-sm opacity-70">
            Access this app via the link provided by your school. The link includes your email,
            role, and school details.
          </p>
        </div>

        <!-- Teacher actions -->
        <div *ngIf="ctx.isTeacher()" class="mt-8 space-y-3">
          <button type="button" (click)="goToEvents()"
                  class="w-full py-3 text-base font-semibold rounded-lg transition-opacity hover:opacity-90 cursor-pointer"
                  style="background: white; color: var(--color-secondary);">
            View Events
          </button>
          <button type="button" (click)="goToCreate()"
                  class="w-full py-3 text-base font-semibold rounded-lg text-white border-2 border-white transition-colors hover:bg-white/10 cursor-pointer">
            New Event
          </button>
        </div>

        <!-- Student actions -->
        <div *ngIf="ctx.isStudent()" class="mt-8">
          <button type="button" (click)="goToDashboard()"
                  class="w-full py-3 text-base font-semibold rounded-lg transition-opacity hover:opacity-90 cursor-pointer"
                  style="background: white; color: var(--color-secondary);">
            My Dashboard
          </button>
        </div>
      </div>
    </div>
  `,
})
export class HomeComponent implements OnInit {
  constructor(
    public ctx: UrlContextService,
    private router: Router,
    private route: ActivatedRoute,
    private theme: ThemeService,
  ) {}

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    this.ctx.captureFromUrl(params);
    this.theme.loadAndApply(this.ctx.schoolId);
  }

  get qp() {
    const c = this.ctx.context;
    return c ? { email: c.email, role: c.role, schoolId: c.schoolId } : {};
  }

  goToEvents() {
    this.router.navigate(['/teacher/events'], { queryParams: this.qp });
  }

  goToCreate() {
    this.router.navigate(['/teacher/events/create'], { queryParams: this.qp });
  }

  goToDashboard() {
    this.router.navigate(['/student/dashboard'], { queryParams: this.qp });
  }
}
