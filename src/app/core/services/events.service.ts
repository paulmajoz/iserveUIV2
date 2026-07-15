import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface IEvent {
  _id: string;
  eventName: string;
  school: string;
  teacher: string;
  teacherEmail: string;
  /** School-defined department (plain string) */
  department?: string;
  /** School-defined category (plain string) */
  category?: string;
  /** Legacy ObjectId refs from migrated V1 events */
  eventTypeId?: string;
  eventCategoryId?: string;
  qrMode: 'in-out' | 'once-off';
  hourMode: 'in-out' | 'fixed' | 'volume' | 'disabled';
  fixedHours?: number;
  volumeUnitName?: string;
  volumeConversion?: number;
  pointsMode: 'disabled' | 'in-out' | 'fixed' | 'volume';
  pointsValue: number;
  pointsConversion: number;
  /** Derived: true when pointsMode !== 'disabled' */
  pointsEnabled: boolean;
  captureOptions: { hasGeolocate: boolean; hasDescription: boolean; hasReflection: boolean };
  geoTarget?: GeoTarget | null;
  qrCodeIn?: string;
  qrCodeOut?: string;
  isActive: boolean;
  createdAt: string;
}

export interface GeoTarget {
  lat: number;
  lon: number;
  radiusMeters: number;
  label?: string;
}

export interface CreateEventPayload {
  eventName: string;
  school: string;
  teacher: string;
  teacherEmail: string;
  department?: string;
  category?: string;
  qrMode: 'in-out' | 'once-off';
  hourMode: 'in-out' | 'fixed' | 'volume' | 'disabled';
  fixedHours?: number;
  volumeUnitName?: string;
  volumeConversion?: number;
  pointsMode: 'disabled' | 'in-out' | 'fixed' | 'volume';
  pointsValue: number;
  pointsConversion?: number;
  pointsEnabled: boolean;
  captureOptions: { hasGeolocate: boolean; hasDescription: boolean; hasReflection: boolean };
  geoTarget?: GeoTarget | null;
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  constructor(private api: ApiService) {}

  createEvent(payload: CreateEventPayload): Observable<IEvent> {
    return this.api.post<IEvent>('events', payload);
  }

  getEventById(id: string): Observable<IEvent> {
    return this.api.get<IEvent>(`events/${id}`);
  }

  getEventsByPerson(schoolId: number, email: string, role: string): Observable<IEvent[]> {
    return this.api.get<IEvent[]>('events/by-person', { schoolId, email, role });
  }

  updateEvent(id: string, payload: Partial<IEvent>): Observable<IEvent> {
    return this.api.patch<IEvent>(`events/${id}`, payload);
  }

  deleteEvent(id: string): Observable<unknown> {
    return this.api.delete(`events/${id}`);
  }

  downloadQrPdf(id: string, direction: 'in' | 'out'): Observable<Blob> {
    return this.api.getBlob(`events/${id}/qr-pdf`, { direction });
  }

  /**
   * Email the event's QR codes.
   * @param recipients Optional list. Omit to fall back to the event teacher.
   */
  sendEmail(id: string, recipients?: string[]): Observable<unknown> {
    return this.api.post(`events/${id}/send-email`, recipients?.length ? { recipients } : {});
  }

  /** Returns the school's departments (with nested subcategories) for the Create Event form */
  getSchoolLookup(schoolId: number): Observable<{ departments: { name: string; subcategories: string[] }[] }> {
    return this.api.get(`schools/id/${schoolId}/lookup`);
  }

  /** Returns distinct people at the school for the email-recipient picker. */
  getSchoolContacts(schoolId: number): Observable<{
    teachers: SchoolContact[];
    students: SchoolContact[];
  }> {
    return this.api.get(`schools/id/${schoolId}/contacts`);
  }
}

export interface SchoolContact {
  email: string;
  name?: string;
  role: 'Staff' | 'Student';
  grade?: string;
  studentClass?: string;
}
