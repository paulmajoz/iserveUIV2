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
}

export interface AttendanceSummary {
  studentEmail: string;
  totalHours: number;
  totalPoints: number;
  hoursByType: Record<string, number>;
  hoursByCategory: Record<string, number>;
  gradeTargetHours: Record<string, number>;
  honoursTargetHours: Record<string, number>;
  totalRecords: number;
}

export interface SubmitAttendancePayload {
  eventId: string;
  studentEmail: string;
  direction: 'in' | 'out';
  studentFirstName?: string;
  studentLastName?: string;
  studentGrade?: string;
  studentClass?: string;
  studentId?: string;
  schoolId?: string;
  description?: string;
  reflection?: string;
  locationIn?: string;
  locationOut?: string;
  unitAmount?: number;
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

  getByEvent(eventId: string): Observable<IAttendance[]> {
    return this.api.get<IAttendance[]>(`attendance/event/${eventId}`);
  }

  getByStudent(email: string): Observable<IAttendance[]> {
    return this.api.get<IAttendance[]>(`attendance/student/${encodeURIComponent(email)}`);
  }

  getSummary(email: string, schoolId?: number): Observable<AttendanceSummary> {
    return this.api.get<AttendanceSummary>(
      `attendance/summary/${encodeURIComponent(email)}`,
      schoolId ? { schoolId } : {}
    );
  }
}
