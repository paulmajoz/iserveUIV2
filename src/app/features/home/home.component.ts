import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UrlContextService } from '../../core/services/url-context.service';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <!-- Redirecting — show a brief centred spinner -->
    <div *ngIf="ctx.context"
         class="min-h-screen flex items-center justify-center"
         style="background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)">
      <mat-spinner diameter="40" style="--mdc-circular-progress-active-indicator-color:#ffffff"></mat-spinner>
    </div>

    <!-- No context — access via school link -->
    <div *ngIf="!ctx.context"
         class="min-h-screen flex flex-col items-center justify-center p-6"
         style="background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)">
      <div class="text-center text-white space-y-4 max-w-sm w-full">
        <mat-icon style="font-size: 56px; width: 56px; height: 56px; opacity: 0.9">volunteer_activism</mat-icon>
        <h1 class="text-3xl font-bold">iServe</h1>
        <p class="text-base opacity-80">Attendance &amp; Community Service Tracking</p>

        <div class="mt-8 bg-white/10 rounded-lg p-5 space-y-2">
          <mat-icon style="font-size: 32px; width: 32px; height: 32px; opacity: 0.7">link_off</mat-icon>
          <p class="font-semibold">No school link detected</p>
          <p class="text-sm opacity-70">
            Access this app via the link provided by your school.
            The link includes your email, role, and school details.
          </p>
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

    const c = this.ctx.context;
    const qp = c ? { email: c.email, role: c.role, schoolId: c.schoolId } : {};

    if (this.ctx.isTeacher()) {
      this.router.navigate(['/teacher/events'], { queryParams: qp, replaceUrl: true });
    } else if (this.ctx.isStudent()) {
      this.router.navigate(['/student/dashboard'], { queryParams: qp, replaceUrl: true });
    }
  }
}
