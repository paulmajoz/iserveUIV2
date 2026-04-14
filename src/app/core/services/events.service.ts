import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface IEvent {
  _id: string;
  eventName: string;
  school: string;
  teacher: string;
  teacherEmail: string;
  eventTypeId?: string;
  eventCategoryId?: string;
  qrMode: 'in-out' | 'once-off';
  hourMode: 'in-out' | 'fixed' | 'volume' | 'disabled';
  fixedHours?: number;
  volumeUnitName?: string;
  volumeConversion?: number;
  pointsEnabled: boolean;
  pointsValue: number;
  captureOptions: { hasGeolocate: boolean; hasDescription: boolean; hasReflection: boolean };
  qrCodeIn?: string;
  qrCodeOut?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateEventPayload {
  eventName: string;
  school: string;
  teacher: string;
  teacherEmail: string;
  eventTypeId?: string;
  eventCategoryId?: string;
  qrMode: 'in-out' | 'once-off';
  hourMode: 'in-out' | 'fixed' | 'volume' | 'disabled';
  fixedHours?: number;
  volumeUnitName?: string;
  volumeConversion?: number;
  pointsEnabled: boolean;
  pointsValue: number;
  captureOptions: { hasGeolocate: boolean; hasDescription: boolean; hasReflection: boolean };
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

  sendEmail(id: string): Observable<unknown> {
    return this.api.post(`events/${id}/send-email`, {});
  }

  getEventTypes(schoolId?: number): Observable<{ _id: string; name: string }[]> {
    return this.api.get('event-types', schoolId ? { schoolId } : {});
  }

  getEventCategories(schoolId?: number): Observable<{ _id: string; name: string }[]> {
    return this.api.get('event-categories', schoolId ? { schoolId } : {});
  }
}
