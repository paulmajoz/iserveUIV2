import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface UserContext {
  email: string;
  role: 'Staff' | 'Student' | 'ServiceAdmin' | '';
  schoolId: number;
  firstName?: string;
  lastName?: string;
  grade?: string;
  studentClass?: string;
  studentId?: string;
  studentHouse?: string;
  studentTutor?: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
}

const CONTEXT_KEY = 'iserve_user_context';

@Injectable({ providedIn: 'root' })
export class UrlContextService {
  private _context: UserContext | null = null;

  constructor(private route: ActivatedRoute, private router: Router) {}

  /** Call once from AppComponent to capture URL params and persist them */
  captureFromUrl(params: Record<string, string>): void {
    const email = params['email'] ?? '';
    const role = (params['role'] ?? params['type'] ?? '') as UserContext['role'];
    const schoolId = params['schoolId'] ? +params['schoolId'] : environment.defaultSchoolId;

    if (email) {
      const ctx: UserContext = {
        email,
        role,
        schoolId,
        firstName: params['first'] ?? params['firstName'],
        lastName: params['last'] ?? params['lastName'],
        grade: params['grade'],
        studentClass: params['class'],
        studentId: params['studentId'],
        studentHouse: params['house'],
        studentTutor: params['tutor'],
        customField1: params['customField1'],
        customField2: params['customField2'],
        customField3: params['customField3'],
      };
      sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
      this._context = ctx;
    }
  }

  get context(): UserContext | null {
    if (this._context) return this._context;
    const stored = sessionStorage.getItem(CONTEXT_KEY);
    if (stored) {
      this._context = JSON.parse(stored);
      return this._context;
    }
    return null;
  }

  get schoolId(): number {
    return this.context?.schoolId ?? environment.defaultSchoolId;
  }

  get email(): string {
    return this.context?.email ?? '';
  }

  get role(): UserContext['role'] {
    return this.context?.role ?? '';
  }

  isTeacher(): boolean {
    return this.role === 'Staff' || this.role === 'ServiceAdmin';
  }

  isStudent(): boolean {
    return this.role === 'Student';
  }

  clear(): void {
    this._context = null;
    sessionStorage.removeItem(CONTEXT_KEY);
  }
}
