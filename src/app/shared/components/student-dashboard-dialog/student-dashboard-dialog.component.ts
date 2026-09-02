import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { EventsService, SchoolContact } from '../../../core/services/events.service';
import { UrlContextService } from '../../../core/services/url-context.service';

type Mode = 'search' | 'preview';

/**
 * Teacher-facing "look up a student's dashboard" dialog.
 *
 *  • Type-ahead search over school contacts (students only), with a
 *    free-form email fallback for students not yet in the contact list.
 *  • On selection, switches (in place — no second dialog) to a
 *    phone-width preview of the real /student/dashboard page, since that
 *    page's UI is mobile-first and would look wrong as a full desktop view.
 */
@Component({
  selector: 'app-student-dashboard-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
  ],
  template: `
    <ng-container *ngIf="mode === 'search'; else preview">
      <h2 mat-dialog-title class="!text-base !font-bold">View Student Dashboard</h2>

      <mat-dialog-content class="!pt-1 !pb-0">
        <p class="text-sm text-gray-500 mb-3">
          Search for a student, or type their email directly.
        </p>

        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <mat-label>Student</mat-label>
          <input matInput
                 placeholder="Name or email…"
                 [(ngModel)]="inputValue"
                 [matAutocomplete]="auto"
                 (keydown.enter)="tryOpenFreeform()"
                 autocomplete="off" />
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onSelect($event)">
            <mat-option *ngFor="let s of filtered" [value]="s.email">
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm">
                  <span *ngIf="s.name" class="font-medium text-gray-800">{{ s.name }}</span>
                  <span *ngIf="!s.name" class="text-gray-500">{{ s.email }}</span>
                  <span class="text-xs text-gray-400 ml-2">{{ s.email }}</span>
                </span>
                <span *ngIf="s.grade" class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                  Gr {{ s.grade }}
                </span>
              </div>
            </mat-option>
          </mat-autocomplete>
          <mat-hint>Press Enter to open a typed email directly.</mat-hint>
        </mat-form-field>

        <div class="mt-2 flex items-center gap-1 text-xs text-gray-500" *ngIf="loadingContacts">
          <mat-spinner diameter="14"></mat-spinner>
          Loading students…
        </div>

        <p *ngIf="errorMsg" class="text-xs text-red-500 mt-3 bg-red-50 rounded-lg p-2">
          {{ errorMsg }}
        </p>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="!px-6 !pb-4 !pt-3">
        <button mat-button type="button" (click)="dialogRef.close()">Cancel</button>
      </mat-dialog-actions>
    </ng-container>

    <ng-template #preview>
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div class="min-w-0">
          <p class="text-sm font-bold text-gray-900 truncate">{{ selectedName || selectedEmail }}</p>
          <p *ngIf="selectedName" class="text-xs text-gray-500 truncate">{{ selectedEmail }}</p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <a [href]="rawUrl" target="_blank" rel="noopener" class="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mr-1">
            Open in new tab <mat-icon style="font-size:14px;width:14px;height:14px;">open_in_new</mat-icon>
          </a>
          <button mat-icon-button (click)="dialogRef.close()" aria-label="Close">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <div class="flex justify-center bg-gray-100 p-4">
        <iframe [src]="safeUrl"
                style="width:390px;max-width:100%;height:730px;border:none;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.15);background:#fff;">
        </iframe>
      </div>
    </ng-template>
  `,
})
export class StudentDashboardDialogComponent implements OnInit {
  mode: Mode = 'search';

  contacts: SchoolContact[] = [];
  loadingContacts = false;
  inputValue = '';
  errorMsg = '';

  selectedEmail = '';
  selectedName = '';
  safeUrl: SafeResourceUrl = '';
  rawUrl = '';

  constructor(
    public dialogRef: MatDialogRef<StudentDashboardDialogComponent>,
    private events: EventsService,
    private ctx: UrlContextService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    const schoolId = this.ctx.schoolId;
    if (!schoolId) return;
    this.loadingContacts = true;
    this.events.getSchoolContacts(schoolId).subscribe({
      next: ({ students }) => {
        this.contacts = students;
        this.loadingContacts = false;
      },
      error: () => (this.loadingContacts = false),
    });
  }

  get filtered(): SchoolContact[] {
    const q = this.inputValue.toLowerCase().trim();
    if (!q) return this.contacts.slice(0, 50);
    return this.contacts
      .filter((c) => c.email.includes(q) || (c.name?.toLowerCase().includes(q) ?? false))
      .slice(0, 50);
  }

  onSelect(event: MatAutocompleteSelectedEvent) {
    const email = event.option.value as string;
    const match = this.contacts.find((c) => c.email === email);
    this.openPreview(email, match?.name);
  }

  /** Enter pressed with no autocomplete option chosen — try the typed value as a free email. */
  tryOpenFreeform() {
    const raw = this.inputValue.trim();
    if (!raw) return;
    const match = this.contacts.find((c) => c.email.toLowerCase() === raw.toLowerCase());
    if (match) {
      this.openPreview(match.email, match.name);
      return;
    }
    if (!this.isValidEmail(raw)) {
      this.errorMsg = `"${raw}" doesn't look like a valid email.`;
      return;
    }
    this.openPreview(raw.toLowerCase());
  }

  private openPreview(email: string, name?: string) {
    this.errorMsg = '';
    this.selectedEmail = email;
    this.selectedName = name ?? '';
    const schoolId = this.ctx.schoolId;
    this.rawUrl = `/student/dashboard?email=${encodeURIComponent(email)}&schoolId=${schoolId}`;
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.rawUrl);
    this.mode = 'preview';
  }

  private isValidEmail(s: string): boolean {
    return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
      .test(s.trim());
  }
}
