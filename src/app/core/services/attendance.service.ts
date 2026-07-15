import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface IAttendance {
  _id: string;
  eventId: string;
  studentEmail: string;
  studentFirstName?: string;
  studentLastName?: string;
  studentGrade?: string;
  studentClass?: string;
  studentHouse?: string;
  studentTutor?: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  studentId?: string;
  schoolId?: string;
  timeIn: string;
  timeOut?: string;
  hours?: number | null;
  source: 'self' | 'assisted';
  pointsAwarded: number;
  description?: string;
  reflection?: string;
  scannedAt: string;
  distanceMeters?: number | null;
  withinPerimeter?: boolean | null;
  locationIn?: string;
  locationOut?: string;
  unitAmount?: number;

  // Populated by the API (via $lookup) so the UI doesn't need to join.
  eventName?: string;
  eventDepartment?: string;
  eventCategory?: string;
  eventQrMode?: 'in-out' | 'once-off';
  eventHourMode?: 'in-out' | 'fixed' | 'volume' | 'disabled';
  eventPointsEnabled?: boolean;
}

export interface AttendanceSummary {
  studentEmail: string;
  totalHours: number;
  totalPoints: number;
  totalRecords: number;
  uniqueEvents?: number;
  firstActivity?: string;
  lastActivity?: string;

  // V2 grouping (preferred)
  hoursByDepartment?: Record<string, number>;
  hoursByCategory?: Record<string, number>;
  pointsByDepartment?: Record<string, number>;
  pointsByCategory?: Record<string, number>;
  eventsByDepartment?: Record<string, number>;

  // Targets
  gradeTargetHours: Record<string, number>;
  honoursTargetHours: Record<string, number>;

  // Legacy
  hoursByType: Record<string, number>;
}

export interface ManualAttendancePayload {
  eventId: string;
  studentEmail: string;
  studentFirstName?: string;
  studentLastName?: string;
  studentGrade?: string;
  studentClass?: string;
  studentHouse?: string;
  studentTutor?: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  studentId?: string;
  schoolId?: string;
  /** ISO date-time the student arrived. */
  timeIn: string;
  /** ISO date-time the student left — only for in-out events. */
  timeOut?: string;
  description?: string;
  reflection?: string;
  unitAmount?: number;
  locationIn?: string;
  locationOut?: string;
  teacherEmail?: string;
}

export interface SubmitAttendancePayload {
  eventId: string;
  studentEmail: string;
  direction: 'in' | 'out';
  studentFirstName?: string;
  studentLastName?: string;
  studentGrade?: string;
  studentClass?: string;
  studentHouse?: string;
  studentTutor?: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  studentId?: string;
  schoolId?: string;
  description?: string;
  reflection?: string;
  locationIn?: string;
  locationOut?: string;
  unitAmount?: number;
  teacherEmail?: string;
}

export interface UpdateAttendancePayload {
  timeIn?: string;
  timeOut?: string;
  hours?: number | null;
  pointsAwarded?: number;
  unitAmount?: number;
  description?: string;
  reflection?: string;
  locationIn?: string;
  locationOut?: string;
  distanceMeters?: number | null;
  withinPerimeter?: boolean | null;
  teacherEmail?: string;
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  constructor(private api: ApiService) {}

  submit(payload: SubmitAttendancePayload): Observable<IAttendance> {
    return this.api.post<IAttendance>('attendance/submit', payload);
  }

  assistedScan(payload: SubmitAttendancePayload): Observable<IAttendance> {
    return this.api.post<IAttendance>('attendance/scan', payload);
  }

  /**
   * Teacher manually adding a complete attendance record (with custom
   * timeIn / optional timeOut and full student/event details).
   */
  createManual(payload: ManualAttendancePayload): Observable<IAttendance> {
    return this.api.post<IAttendance>('attendance/manual', payload);
  }

  getState(eventId: string, email: string): Observable<{
    status: 'fresh' | 'open' | 'closed';
    direction: 'in' | 'out' | null;
    qrMode: string;
    timeIn?: string;
    timeOut?: string;
  }> {
    return this.api.get('attendance/state', { eventId, email });
  }

  getByEvent(eventId: string): Observable<IAttendance[]> {
    return this.api.get<IAttendance[]>(`attendance/event/${eventId}`);
  }

  getByStudent(email: string): Observable<IAttendance[]> {
    return this.api.get<IAttendance[]>(`attendance/student/${encodeURIComponent(email)}`);
  }

  /** Teacher updating an existing attendance record. */
  update(id: string, payload: UpdateAttendancePayload): Observable<IAttendance> {
    return this.api.patch<IAttendance>(`attendance/${id}`, payload);
  }

  getSummary(email: string, schoolId?: number): Observable<AttendanceSummary> {
    return this.api.get<AttendanceSummary>(
      `attendance/summary/${encodeURIComponent(email)}`,
      schoolId ? { schoolId } : {}
    );
  }
}
