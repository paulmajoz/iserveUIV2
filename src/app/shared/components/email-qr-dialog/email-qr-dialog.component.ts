import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { COMMA, ENTER, SEMICOLON, SPACE } from '@angular/cdk/keycodes';
import { EventsService, SchoolContact } from '../../../core/services/events.service';
import { UrlContextService } from '../../../core/services/url-context.service';

export interface EmailQrDialogData {
  eventName: string;
  /** Pre-filled recipient (typically the teacher's own email). */
  defaultRecipient?: string;
}

export interface EmailQrDialogResult {
  recipients: string[];
}

/**
 * Dialog for picking who an event's QR-code PDFs are emailed to.
 *
 *  • Chip-based recipient list (Gmail/Outlook style)
 *  • Type-ahead autocomplete from school contacts (teachers from past
 *    events, students from past attendance)
 *  • Free-form email entry — anything that matches a basic email regex
 *    can be added as a chip
 *  • Group filtering toggle (All / Teachers / Students)
 *
 * The component does *not* perform the API call itself — it just returns
 * the chosen list so the caller can surface errors in its own context.
 */
@Component({
  selector: 'app-email-qr-dialog',
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
    MatChipsModule,
    MatAutocompleteModule,
  ],
  template: `
    <h2 mat-dialog-title class="!text-base !font-bold">Email QR Codes</h2>

    <mat-dialog-content class="!pt-1 !pb-0">
      <p class="text-sm text-gray-500 mb-3">
        Send the QR code PDFs for
        <strong class="text-gray-800">{{ data.eventName }}</strong>
        to one or more people.
      </p>

      <!-- Recipient chip input -->
      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
        <mat-label>Recipients</mat-label>
        <mat-chip-grid #chipGrid aria-label="Recipient selection">
          <mat-chip-row *ngFor="let r of recipients; let i = index"
                        (removed)="removeRecipient(i)"
                        [removable]="true">
            <span class="text-xs">
              <strong *ngIf="r.name">{{ r.name }}</strong>
              <span *ngIf="r.name" class="text-gray-400">&nbsp;·&nbsp;</span>{{ r.email }}
            </span>
            <button matChipRemove [attr.aria-label]="'Remove ' + r.email">
              <mat-icon>cancel</mat-icon>
            </button>
          </mat-chip-row>
          <input #chipInput
                 placeholder="Type a name or email…"
                 [matChipInputFor]="chipGrid"
                 [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
                 [matChipInputAddOnBlur]="true"
                 [matAutocomplete]="auto"
                 [(ngModel)]="inputValue"
                 (matChipInputTokenEnd)="addFromFreeform($event)"
                 style="font-size:16px;" />
        </mat-chip-grid>
        <mat-autocomplete #auto="matAutocomplete"
                          (optionSelected)="addFromContact($event)">
          <ng-container *ngIf="filtered.length > 0; else noMatches">
            <mat-option *ngFor="let c of filtered" [value]="c.email">
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm">
                  <span *ngIf="c.name" class="font-medium text-gray-800">{{ c.name }}</span>
                  <span *ngIf="!c.name" class="text-gray-500">{{ c.email }}</span>
                  <span class="text-xs text-gray-400 ml-2">{{ c.email }}</span>
                </span>
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      [class.bg-blue-100]="c.role === 'Staff'"
                      [class.text-blue-700]="c.role === 'Staff'"
                      [class.bg-emerald-100]="c.role === 'Student'"
                      [class.text-emerald-700]="c.role === 'Student'">
                  {{ c.role === 'Staff' ? 'Teacher' : 'Student' }}
                  <span *ngIf="c.grade">&nbsp;Gr {{ c.grade }}</span>
                </span>
              </div>
            </mat-option>
          </ng-container>
          <ng-template #noMatches>
            <mat-option *ngIf="inputValue && isValidEmail(inputValue)"
                        [value]="inputValue.toLowerCase().trim()">
              <span class="text-sm text-gray-700">Add <strong>{{ inputValue }}</strong></span>
            </mat-option>
          </ng-template>
        </mat-autocomplete>
        <mat-hint>Press Enter, comma or semicolon to add. Suggestions come from past events at this school.</mat-hint>
      </mat-form-field>

      <!-- Group filter chips -->
      <div class="mt-4 flex flex-wrap gap-2">
        <button type="button"
                class="filter-chip"
                [class.filter-chip--active]="groupFilter === 'all'"
                (click)="setGroup('all')">
          All <span class="opacity-60">({{ contacts.length }})</span>
        </button>
        <button type="button"
                class="filter-chip"
                [class.filter-chip--active]="groupFilter === 'staff'"
                (click)="setGroup('staff')">
          Teachers <span class="opacity-60">({{ teacherCount }})</span>
        </button>
        <button type="button"
                class="filter-chip"
                [class.filter-chip--active]="groupFilter === 'student'"
                (click)="setGroup('student')">
          Students <span class="opacity-60">({{ studentCount }})</span>
        </button>

        <div class="ml-auto flex items-center gap-1 text-xs text-gray-500"
             *ngIf="loadingContacts">
          <mat-spinner diameter="14"></mat-spinner>
          Loading…
        </div>
      </div>

      <p *ngIf="errorMsg" class="text-xs text-red-500 mt-3 bg-red-50 rounded-lg p-2">
        {{ errorMsg }}
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="!px-6 !pb-4 !pt-3">
      <button mat-button type="button" (click)="dialogRef.close()"
              [disabled]="sending">Cancel</button>
      <button mat-flat-button type="button"
              [disabled]="recipients.length === 0 || sending"
              (click)="send()"
              style="min-width:140px;">
        <span class="flex items-center gap-2">
          <mat-spinner *ngIf="sending" diameter="16"></mat-spinner>
          {{ sending ? 'Sending…' : ('Send (' + recipients.length + ')') }}
        </span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .filter-chip {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 9999px;
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #4b5563;
      transition: all .15s ease;
    }
    .filter-chip:hover { border-color: #cbd5e1; color: #1f2937; }
    .filter-chip--active {
      background: var(--color-primary, #2c698d);
      border-color: var(--color-primary, #2c698d);
      color: #fff;
    }
  `],
})
export class EmailQrDialogComponent implements OnInit {
  readonly separatorKeysCodes = [ENTER, COMMA, SEMICOLON, SPACE] as const;

  @ViewChild('chipInput') chipInputRef!: ElementRef<HTMLInputElement>;

  recipients: SchoolContact[] = [];
  contacts: SchoolContact[] = [];
  loadingContacts = false;
  groupFilter: 'all' | 'staff' | 'student' = 'all';

  inputValue = '';
  sending = false;
  errorMsg = '';

  constructor(
    public dialogRef: MatDialogRef<EmailQrDialogComponent, EmailQrDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: EmailQrDialogData,
    private events: EventsService,
    private ctx: UrlContextService,
  ) {}

  ngOnInit() {
    // Pre-fill the default recipient as the first chip
    const def = (this.data.defaultRecipient ?? '').trim().toLowerCase();
    if (def && this.isValidEmail(def)) {
      this.recipients.push({ email: def, role: 'Staff' });
    }

    // Load contact suggestions for the school
    const schoolId = this.ctx.schoolId;
    if (schoolId) {
      this.loadingContacts = true;
      this.events.getSchoolContacts(schoolId).subscribe({
        next: ({ teachers, students }) => {
          this.contacts = [...teachers, ...students];
          // Try to back-fill the default recipient's name if we know it
          if (def) {
            const match = this.contacts.find((c) => c.email === def);
            if (match && this.recipients[0]) {
              this.recipients[0] = { ...match };
            }
          }
          this.loadingContacts = false;
        },
        error: () => (this.loadingContacts = false),
      });
    }
  }

  get teacherCount() { return this.contacts.filter((c) => c.role === 'Staff').length; }
  get studentCount() { return this.contacts.filter((c) => c.role === 'Student').length; }

  get filtered(): SchoolContact[] {
    const q = this.inputValue.toLowerCase().trim();
    const chosen = new Set(this.recipients.map((r) => r.email));
    return this.contacts
      .filter((c) => !chosen.has(c.email))
      .filter((c) =>
        this.groupFilter === 'all' ||
        (this.groupFilter === 'staff' && c.role === 'Staff') ||
        (this.groupFilter === 'student' && c.role === 'Student'),
      )
      .filter((c) =>
        !q ||
        c.email.includes(q) ||
        (c.name?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 50);
  }

  setGroup(g: 'all' | 'staff' | 'student') {
    this.groupFilter = g;
    // Refocus the input so suggestions reopen immediately
    setTimeout(() => this.chipInputRef?.nativeElement?.focus(), 0);
  }

  /** User pressed Enter / comma / semicolon — accept whatever's typed. */
  addFromFreeform(event: MatChipInputEvent) {
    const raw = (event.value ?? '').trim();
    this.tryAdd(raw);
    event.chipInput?.clear();
    this.inputValue = '';
  }

  /** User selected an autocomplete option. */
  addFromContact(event: MatAutocompleteSelectedEvent) {
    const email = event.option.value as string;
    this.tryAdd(email);
    this.chipInputRef.nativeElement.value = '';
    this.inputValue = '';
  }

  private tryAdd(raw: string) {
    if (!raw) return;
    const email = raw.toLowerCase();
    if (!this.isValidEmail(email)) {
      this.errorMsg = `"${raw}" doesn't look like a valid email.`;
      return;
    }
    if (this.recipients.some((r) => r.email === email)) return;
    const match = this.contacts.find((c) => c.email === email);
    this.recipients.push(match ?? { email, role: 'Staff' });
    this.errorMsg = '';
  }

  removeRecipient(i: number) {
    this.recipients.splice(i, 1);
  }

  /** Basic email check — same regex Angular's Validators.email uses. */
  isValidEmail(s: string): boolean {
    return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
      .test(s.trim());
  }

  send() {
    // Last-chance accept of whatever's still in the input box.
    if (this.inputValue.trim()) this.tryAdd(this.inputValue);
    this.inputValue = '';
    if (this.chipInputRef) this.chipInputRef.nativeElement.value = '';

    if (this.recipients.length === 0) {
      this.errorMsg = 'Add at least one recipient.';
      return;
    }
    this.dialogRef.close({ recipients: this.recipients.map((r) => r.email) });
  }
}
