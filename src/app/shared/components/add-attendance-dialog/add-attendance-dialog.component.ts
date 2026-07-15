import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IEvent } from '../../../core/services/events.service';
import { ManualAttendancePayload } from '../../../core/services/attendance.service';

export interface AddAttendanceDialogData {
  event: IEvent;
  /** The currently-logged-in teacher email — recorded against the new row. */
  teacherEmail?: string;
  /** Default school id from the URL context. */
  schoolId?: number;
}

export type AddAttendanceDialogResult = ManualAttendancePayload;

/**
 * Dialog for teachers to manually create a complete attendance record
 * (student details + timeIn / timeOut + optional description / reflection
 * / unit amount). Required fields adapt to the event's capture options
 * and tracking modes.
 */
@Component({
  selector: 'app-add-attendance-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title class="!text-base !font-bold">Add Attendance</h2>

    <mat-dialog-content class="!pt-1 !pb-0">
      <p class="text-sm text-gray-500 mb-3">
        Manually record a student's attendance for
        <strong class="text-gray-800">{{ data.event.eventName }}</strong>.
      </p>

      <form [formGroup]="form" novalidate class="space-y-3">

        <!-- ── Student ──────────────────────────────────────── -->
        <p class="form-section-label">Student</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>First name</mat-label>
            <input matInput formControlName="firstName" autocomplete="given-name" />
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Last name</mat-label>
            <input matInput formControlName="lastName" autocomplete="family-name" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
          <mat-label>Email address</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email"
                 placeholder="student@school.co.za" />
          <mat-error *ngIf="form.get('email')?.hasError('required')">Email is required</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">Enter a valid email</mat-error>
        </mat-form-field>

        <div class="grid grid-cols-2 gap-3">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Grade</mat-label>
            <input matInput formControlName="grade" placeholder="10" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Class</mat-label>
            <input matInput formControlName="studentClass" placeholder="10A" />
          </mat-form-field>
        </div>

        <!-- ── Times ────────────────────────────────────────── -->
        <p class="form-section-label mt-2">Time</p>

        <div class="grid grid-cols-1" [class.sm:grid-cols-2]="needsTimeOut" [class.gap-3]="needsTimeOut">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Time in</mat-label>
            <input matInput type="datetime-local" formControlName="timeIn" />
            <mat-error *ngIf="form.get('timeIn')?.hasError('required')">Time in is required</mat-error>
          </mat-form-field>

          <mat-form-field *ngIf="needsTimeOut" appearance="outline" subscriptSizing="dynamic">
            <mat-label>Time out</mat-label>
            <input matInput type="datetime-local" formControlName="timeOut" />
            <mat-error *ngIf="form.get('timeOut')?.hasError('required')">Time out is required</mat-error>
            <mat-error *ngIf="form.get('timeOut')?.hasError('beforeIn')">Time out must be later than time in</mat-error>
          </mat-form-field>
        </div>

        <!-- ── Volume amount ────────────────────────────────── -->
        <mat-form-field *ngIf="needsUnitAmount"
                        appearance="outline" subscriptSizing="dynamic" class="w-full">
          <mat-label>How many {{ data.event.volumeUnitName || 'units' }}?</mat-label>
          <input matInput type="number" formControlName="unitAmount" min="0" step="1" />
          <mat-error *ngIf="form.get('unitAmount')?.hasError('required')">Required</mat-error>
          <mat-error *ngIf="form.get('unitAmount')?.hasError('min')">Must be 0 or more</mat-error>
        </mat-form-field>

        <!-- ── Description / reflection ─────────────────────── -->
        <ng-container *ngIf="needsDescription || needsReflection">
          <p class="form-section-label mt-2">Additional Information</p>

          <mat-form-field *ngIf="needsDescription"
                          appearance="outline" subscriptSizing="dynamic" class="w-full">
            <mat-label>Description</mat-label>
            <textarea matInput rows="3" formControlName="description"
                      placeholder="What did the student do?"></textarea>
            <mat-error *ngIf="form.get('description')?.hasError('required')">Required for this event</mat-error>
          </mat-form-field>

          <mat-form-field *ngIf="needsReflection"
                          appearance="outline" subscriptSizing="dynamic" class="w-full">
            <mat-label>Reflection</mat-label>
            <textarea matInput rows="3" formControlName="reflection"
                      placeholder="Student's reflection on the experience"></textarea>
            <mat-error *ngIf="form.get('reflection')?.hasError('required')">Required for this event</mat-error>
          </mat-form-field>
        </ng-container>
      </form>

      <p *ngIf="errorMsg" class="text-xs text-red-500 mt-3 bg-red-50 rounded-lg p-2">
        {{ errorMsg }}
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="!px-6 !pb-4 !pt-3">
      <button mat-button type="button" (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button type="button"
              [disabled]="form.invalid"
              (click)="save()"
              style="min-width:130px;">
        Add Attendance
      </button>
    </mat-dialog-actions>
  `,
})
export class AddAttendanceDialogComponent implements OnInit {
  form!: FormGroup;
  errorMsg = '';

  constructor(
    public dialogRef: MatDialogRef<AddAttendanceDialogComponent, AddAttendanceDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: AddAttendanceDialogData,
    private fb: FormBuilder,
  ) {}

  /** True when the event uses in/out tracking (and therefore needs both timestamps). */
  get needsTimeOut(): boolean {
    return this.data.event.qrMode === 'in-out';
  }

  get needsDescription(): boolean {
    return !!this.data.event.captureOptions?.hasDescription;
  }
  get needsReflection(): boolean {
    return !!this.data.event.captureOptions?.hasReflection;
  }
  get needsUnitAmount(): boolean {
    return this.data.event.hourMode === 'volume'
        || this.data.event.pointsMode === 'volume';
  }

  ngOnInit() {
    // Default timeIn to "now" rounded down to the nearest minute, formatted
    // for the datetime-local input.
    const now = new Date();
    now.setSeconds(0, 0);
    const localIso = (d: Date) => {
      const tz = d.getTimezoneOffset() * 60_000;
      return new Date(d.getTime() - tz).toISOString().slice(0, 16);
    };

    this.form = this.fb.group({
      firstName:    [''],
      lastName:     [''],
      email:        ['', [Validators.required, Validators.email]],
      grade:        [''],
      studentClass: [''],
      timeIn:       [localIso(now), Validators.required],
      timeOut:      [''],
      unitAmount:   [null as number | null, [Validators.min(0)]],
      description:  [''],
      reflection:   [''],
    }, { validators: this.timeOrderValidator.bind(this) });

    if (this.needsTimeOut) {
      this.form.get('timeOut')?.setValidators(Validators.required);
    }
    if (this.needsDescription) {
      this.form.get('description')?.setValidators(Validators.required);
    }
    if (this.needsReflection) {
      this.form.get('reflection')?.setValidators(Validators.required);
    }
    if (this.needsUnitAmount) {
      this.form.get('unitAmount')?.setValidators([Validators.required, Validators.min(0)]);
    }

    Object.values(this.form.controls).forEach(c => c.updateValueAndValidity());
  }

  /** Cross-field check: timeOut > timeIn when both are present. */
  private timeOrderValidator(g: any) {
    const tIn  = g.get('timeIn')?.value;
    const tOut = g.get('timeOut')?.value;
    if (!tIn || !tOut) return null;
    if (new Date(tOut) <= new Date(tIn)) {
      g.get('timeOut')?.setErrors({ ...(g.get('timeOut')?.errors ?? {}), beforeIn: true });
      return { beforeIn: true };
    }
    // Clear our own error but leave any other validators' errors intact
    const errs = { ...(g.get('timeOut')?.errors ?? {}) };
    delete errs['beforeIn'];
    g.get('timeOut')?.setErrors(Object.keys(errs).length ? errs : null);
    return null;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const toIso = (s: string) => s ? new Date(s).toISOString() : undefined;

    const payload: ManualAttendancePayload = {
      eventId: this.data.event._id,
      studentEmail: (v.email || '').toLowerCase().trim(),
      studentFirstName: v.firstName?.trim() || undefined,
      studentLastName:  v.lastName?.trim()  || undefined,
      studentGrade:     v.grade?.trim()     || undefined,
      studentClass:     v.studentClass?.trim() || undefined,
      schoolId: this.data.schoolId != null ? String(this.data.schoolId) : undefined,
      timeIn: toIso(v.timeIn)!,
      timeOut: this.needsTimeOut ? toIso(v.timeOut) : undefined,
      description: v.description?.trim() || undefined,
      reflection:  v.reflection?.trim()  || undefined,
      unitAmount:  v.unitAmount ?? undefined,
      teacherEmail: this.data.teacherEmail || undefined,
    };

    this.dialogRef.close(payload);
  }
}
