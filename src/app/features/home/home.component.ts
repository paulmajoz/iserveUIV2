import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { UrlContextService } from '../../core/services/url-context.service';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center p-6"
         style="background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)">
      <div class="text-center text-white space-y-4 max-w-md">
        <h1 class="text-4xl font-bold">iServe</h1>
        <p class="text-lg opacity-80">Attendance & Community Service Tracking</p>

        <div *ngIf="!ctx.context" class="mt-8 space-y-4">
          <p class="text-sm opacity-60">Access this application via a link provided by your school.</p>
        </div>

        <div *ngIf="ctx.isTeacher()" class="mt-8 space-y-3">
          <button (click)="goToEvents()"
                  class="w-full bg-white font-semibold py-3 px-6 rounded-xl text-lg"
                  style="color: var(--color-secondary)">
            View Events
          </button>
          <button (click)="goToCreate()"
                  class="w-full border-2 border-white text-white font-semibold py-3 px-6 rounded-xl text-lg hover:bg-white hover:text-secondary transition-colors">
            + New Event
          </button>
        </div>

        <div *ngIf="ctx.isStudent()" class="mt-8">
          <button (click)="goToDashboard()"
                  class="w-full bg-white font-semibold py-3 px-6 rounded-xl text-lg"
                  style="color: var(--color-secondary)">
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
