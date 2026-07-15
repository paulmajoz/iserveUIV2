import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { IEvent } from '../../../core/services/events.service';
import { IAttendance, UpdateAttendancePayload } from '../../../core/services/attendance.service';

export interface EditAttendanceDialogData {
  record: IAttendance;
  event: IEvent;
  teacherEmail: string;
}

export interface EditAttendanceDialogResult {
  payload: UpdateAttendancePayload;
}

/** Converts a Date or ISO string to the value expected by datetime-local inputs (YYYY-MM-DDTHH:mm) */
function toDatetimeLocal(val: string | Date | undefined | null): string {
  if (!val) return '';
  const d = new Date(val as string);
  if (isNaN(d.getTime())) return '';
  // Format to local time for the input
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

@Component({
  selector: 'app-edit-attendance-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title class="!text-base !font-bold">Edit Attendance</h2>

    <mat-dialog-content class="!pt-1 !pb-2" style="min-width: min(500px, 90vw)">

      <!-- ── Student identity (read-only) ───────────────────── -->
      <div class="mb-4 p-3 bg-gray-50 rounded-xl flex items-center gap-3">
        <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
             style="background: linear-gradient(135deg, #2c698d, #272643)">
          {{ initials }}
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-gray-900 truncate">{{ displayName }}</p>
          <p class="text-xs text-gray-500 truncate">{{ data.record.studentEmail }}</p>
          <p *ngIf="data.record.studentGrade" class="text-xs text-gray-400">
            Grade {{ data.record.studentGrade }}<span *ngIf="data.record.studentClass"> · {{ data.record.studentClass }}</span>
          </p>
        </div>
        <div class="ml-auto shrink-0">
          <span class="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600 font-medium">Read-only</span>
        </div>
      </div>

      <form [formGroup]="form" class="space-y-3" novalidate>

        <!-- ── Timing ─────────────────────────────────────────── -->
        <div class="form-card">
          <p class="card-label">Timing</p>

          <div class="field-wrap">
            <label class="field-label">Time In</label>
            <input type="datetime-local" formControlName="timeIn" class="field-input"
                   (change)="recalculateHours()" />
          </div>

          <div *ngIf="data.event.qrMode === 'in-out'" class="field-wrap">
            <label class="field-label">Time Out</label>
            <div class="flex items-center gap-2">
              <input type="datetime-local" formControlName="timeOut" class="field-input flex-1"
                     (change)="recalculateHours()" />
              <button type="button"
                      class="shrink-0 text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                      title="Set time out to now"
                      (click)="setTimeOutNow()">
                Now
              </button>
            </div>
          </div>
        </div>

        <!-- ── Hours ──────────────────────────────────────────── -->
        <div *ngIf="data.event.hourMode !== 'disabled'" class="form-card">
          <p class="card-label">Hours</p>

          <div *ngIf="data.event.hourMode === 'volume'" class="field-wrap">
            <label class="field-label">
              {{ data.event.volumeUnitName || 'Units' }} collected
            </label>
            <input type="number" formControlName="unitAmount" class="field-input"
                   min="0" step="any" placeholder="e.g. 5"
                   (input)="recalculateFromUnits()" />
            <p *ngIf="data.event.volumeConversion" class="field-hint">
              1 {{ data.event.volumeUnitName || 'unit' }} = {{ fmtConv(data.event.volumeConversion) }}
            </p>
          </div>

          <div class="field-wrap" style="max-width:160px">
            <label class="field-label">
              Hours
              <span *ngIf="hoursAutoCalc" class="text-gray-400 font-normal">(auto-calculated)</span>
            </label>
            <input type="number" formControlName="hours" class="field-input"
                   min="0" step="0.01" placeholder="e.g. 1.5" />
            <p class="field-hint">Override if needed</p>
          </div>
        </div>

        <!-- ── Points ─────────────────────────────────────────── -->
        <div *ngIf="data.event.pointsEnabled" class="form-card">
          <p class="card-label">Points</p>
          <div class="field-wrap" style="max-width:160px">
            <label class="field-label">
              Points Awarded
              <span *ngIf="pointsAutoCalc" class="text-gray-400 font-normal">(auto-calculated)</span>
            </label>
            <input type="number" formControlName="pointsAwarded" class="field-input"
                   min="0" step="1" placeholder="e.g. 10" />
          </div>
        </div>

        <!-- ── Capture fields ─────────────────────────────────── -->
        <div *ngIf="hasCaptureFields" class="form-card">
          <p class="card-label">Capture Details</p>

          <div *ngIf="data.event.captureOptions?.hasDescription" class="field-wrap">
            <label class="field-label">Description</label>
            <textarea formControlName="description" class="field-input" rows="3"
                      placeholder="What did the student do?"></textarea>
          </div>

          <div *ngIf="data.event.captureOptions?.hasReflection" class="field-wrap">
            <label class="field-label">Reflection</label>
            <textarea formControlName="reflection" class="field-input" rows="3"
                      placeholder="Student reflection..."></textarea>
          </div>
        </div>

        <!-- ── Geolocation ────────────────────────────────────── -->
        <div *ngIf="data.event.captureOptions?.hasGeolocate" class="form-card">
          <p class="card-label">Geolocation</p>

          <div class="field-wrap">
            <label class="field-label">Location In <span class="text-gray-400 font-normal">(lat, lon)</span></label>
            <input type="text" formControlName="locationIn" class="field-input"
                   placeholder="e.g. -29.856678, 31.021858" />
          </div>

          <div *ngIf="data.event.qrMode === 'in-out'" class="field-wrap">
            <label class="field-label">Location Out <span class="text-gray-400 font-normal">(lat, lon)</span></label>
            <input type="text" formControlName="locationOut" class="field-input"
                   placeholder="e.g. -29.856678, 31.021858" />
          </div>
        </div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="!px-6 !pb-4 gap-2">
      <button mat-stroked-button type="button" (click)="cancel()">Cancel</button>
      <button mat-flat-button type="button" (click)="save()" [disabled]="form.invalid">
        Save Changes
      </button>
    </mat-dialog-actions>
  `,
})
export class EditAttendanceDialogComponent implements OnInit {

  form!: FormGroup;

  /** True when hours were auto-calculated (informational label only) */
  hoursAutoCalc = false;
  pointsAutoCalc = false;

  get hasCaptureFields(): boolean {
    const o = this.data.event.captureOptions;
    return !!(o?.hasDescription || o?.hasReflection);
  }

  get displayName(): string {
    return [this.data.record.studentFirstName, this.data.record.studentLastName]
      .filter(Boolean).join(' ') || this.data.record.studentEmail;
  }

  get initials(): string {
    const fn = this.data.record.studentFirstName ?? '';
    const ln = this.data.record.studentLastName ?? '';
    return ((fn[0] ?? '') + (ln[0] ?? '')).toUpperCase()
      || this.data.record.studentEmail[0]?.toUpperCase() || '?';
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditAttendanceDialogComponent, EditAttendanceDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: EditAttendanceDialogData,
  ) {}

  ngOnInit() {
    const r = this.data.record;
    const e = this.data.event;

    this.form = this.fb.group({
      timeIn:        [toDatetimeLocal(r.timeIn)],
      timeOut:       [toDatetimeLocal(r.timeOut)],
      hours:         [r.hours ?? null],
      unitAmount:    [r.unitAmount ?? null],
      pointsAwarded: [r.pointsAwarded ?? 0],
      description:   [r.description  ?? ''],
      reflection:    [r.reflection   ?? ''],
      locationIn:    [r.locationIn   ?? ''],
      locationOut:   [r.locationOut  ?? ''],
    });

    // If in-out event and both times exist, show auto-calc label
    if (e.hourMode === 'in-out' && r.timeIn && r.timeOut) this.hoursAutoCalc = true;
    if (e.hourMode === 'volume') this.hoursAutoCalc = true;
    if (e.pointsMode === 'volume') this.pointsAutoCalc = true;
  }

  /** Stamp the current local time into the Time Out field. */
  setTimeOutNow() {
    const now = toDatetimeLocal(new Date());
    this.form.get('timeOut')?.setValue(now);
    this.recalculateHours();
  }

  /** Recalculate hours from timeIn / timeOut (in-out mode). */
  recalculateHours() {
    if (this.data.event.hourMode !== 'in-out') return;
    const t1 = this.form.get('timeIn')?.value;
    const t2 = this.form.get('timeOut')?.value;
    if (!t1 || !t2) return;
    const diff = (new Date(t2).getTime() - new Date(t1).getTime()) / 3_600_000;
    if (diff > 0) {
      this.form.get('hours')?.setValue(Math.round(diff * 100) / 100);
      this.hoursAutoCalc = true;
    }
  }

  /** Recalculate hours and/or points from unit amount (volume mode). */
  recalculateFromUnits() {
    const units = +(this.form.get('unitAmount')?.value ?? 0);
    if (!units) return;

    if (this.data.event.hourMode === 'volume' && this.data.event.volumeConversion) {
      const hrs = Math.round(units * this.data.event.volumeConversion * 100) / 100;
      this.form.get('hours')?.setValue(hrs);
      this.hoursAutoCalc = true;
    }
    if (this.data.event.pointsMode === 'volume' && this.data.event.pointsConversion) {
      const pts = Math.round(units * this.data.event.pointsConversion);
      this.form.get('pointsAwarded')?.setValue(pts);
      this.pointsAutoCalc = true;
    }
  }

  /** Format a conversion rate for display (e.g. 0.5 → "30 min", 2 → "2 h") */
  fmtConv(conv: number): string {
    if (conv >= 1) return `${Math.round(conv * 100) / 100}h`;
    return `${Math.round(conv * 60)} min`;
  }

  cancel() {
    this.dialogRef.close();
  }

  save() {
    const v = this.form.value;

    // Convert datetime-local strings back to ISO
    const toIso = (val: string | null): string | undefined => {
      if (!val) return undefined;
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    };

    const payload: UpdateAttendancePayload = {
      timeIn:        toIso(v.timeIn),
      timeOut:       toIso(v.timeOut) ?? undefined,
      hours:         v.hours != null ? +v.hours : null,
      pointsAwarded: v.pointsAwarded != null ? +v.pointsAwarded : undefined,
      unitAmount:    v.unitAmount != null ? +v.unitAmount : undefined,
      description:   v.description  || undefined,
      reflection:    v.reflection   || undefined,
      locationIn:    v.locationIn   || undefined,
      locationOut:   v.locationOut  || undefined,
      teacherEmail:  this.data.teacherEmail || undefined,
    };

    // Strip undefined keys so we don't overwrite existing values with nulls
    (Object.keys(payload) as (keyof UpdateAttendancePayload)[]).forEach(k => {
      if (payload[k] === undefined) delete payload[k];
    });

    this.dialogRef.close({ payload });
  }
}
