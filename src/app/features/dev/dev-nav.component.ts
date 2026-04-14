import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceService } from '../../core/services/attendance.service';
import { EventsService } from '../../core/services/events.service';

// ─── Seed constants ────────────────────────────────────────────────────────────
const SCHOOL   = 11338;
const TEACHER1 = 'snaidoo@kingsmead.co.za';
const TEACHER2 = 'jpillay@kingsmead.co.za';
const STUDENT1 = { email: 'alice.smith@student.kingsmead.co.za', first: 'Alice',  last: 'Smith',  grade: '10', cls: '10A' };
const STUDENT2 = { email: 'bob.jones@student.kingsmead.co.za',   first: 'Bob',    last: 'Jones',  grade: '10', cls: '10B' };
const STUDENT3 = { email: 'chloe.nkosi@student.kingsmead.co.za', first: 'Chloe',  last: 'Nkosi',  grade: '11', cls: '11A' };

function teacherQp(email: string) {
  return `email=${email}&role=Staff&schoolId=${SCHOOL}`;
}
function studentQp(s: typeof STUDENT1) {
  return `email=${s.email}&role=Student&schoolId=${SCHOOL}&first=${s.first}&last=${s.last}&grade=${s.grade}&class=${s.cls}`;
}

interface NavLink { label: string; url: string; desc?: string; badge?: string; }
interface NavSection { title: string; color: string; links: NavLink[]; }

@Component({
  selector: 'app-dev-nav',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-100">

      <!-- Header -->
      <div class="bg-gray-900 text-white px-6 py-5">
        <h1 class="text-2xl font-bold">iServe V2 — Component Navigator</h1>
        <p class="text-gray-400 text-sm mt-1">Quick-access links for every page. Use during development/testing.</p>
        <p class="text-xs text-gray-500 mt-1">School: <strong class="text-gray-300">Kingsmead College</strong> · ID {{ schoolId }} · API: {{ apiUrl }}</p>
      </div>

      <!-- Live events banner -->
      <div *ngIf="events.length > 0" class="bg-blue-50 border-b border-blue-200 px-6 py-3">
        <p class="text-sm text-blue-700 font-medium">
          {{ events.length }} live events found — links below include real event IDs.
        </p>
      </div>
      <div *ngIf="loadingEvents" class="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <p class="text-sm text-gray-500">Loading live event IDs…</p>
      </div>

      <main class="max-w-4xl mx-auto px-4 py-8 space-y-8">

        <div *ngFor="let section of sections" class="bg-white rounded-2xl shadow-sm overflow-hidden">

          <!-- Section header -->
          <div class="px-5 py-3 flex items-center gap-3"
               [style.background-color]="section.color">
            <h2 class="font-bold text-white text-sm uppercase tracking-wider">{{ section.title }}</h2>
          </div>

          <!-- Links -->
          <div class="divide-y divide-gray-50">
            <a *ngFor="let link of section.links"
               [href]="link.url"
               target="_blank"
               class="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {{ link.label }}
                  </span>
                  <span *ngIf="link.badge"
                        class="text-xs px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700">
                    {{ link.badge }}
                  </span>
                </div>
                <p *ngIf="link.desc" class="text-xs text-gray-400 mt-0.5 truncate">{{ link.url }}</p>
                <p *ngIf="link.desc" class="text-xs text-gray-500 mt-0.5">{{ link.desc }}</p>
              </div>
              <span class="text-gray-300 group-hover:text-blue-400 text-lg shrink-0">↗</span>
            </a>
          </div>

        </div>

        <!-- Seed users quick-ref -->
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-3 bg-gray-700">
            <h2 class="font-bold text-white text-sm uppercase tracking-wider">Seed Users</h2>
          </div>
          <div class="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="font-semibold text-gray-700 mb-2">Teachers</p>
              <div *ngFor="let t of teachers" class="text-gray-600 text-xs py-1 border-b border-gray-50">{{ t }}</div>
            </div>
            <div>
              <p class="font-semibold text-gray-700 mb-2">Students</p>
              <div *ngFor="let s of students" class="text-gray-600 text-xs py-1 border-b border-gray-50">{{ s }}</div>
            </div>
          </div>
        </div>

      </main>
    </div>
  `,
})
export class DevNavComponent implements OnInit {

  readonly schoolId = SCHOOL;
  readonly apiUrl   = 'http://localhost:3000/api';

  readonly teachers = [TEACHER1, TEACHER2];
  readonly students = [STUDENT1, STUDENT2, STUDENT3].map(
    s => `${s.first} ${s.last} (${s.email})`
  );

  loadingEvents = true;
  events: Array<{ _id: string; eventName: string }> = [];

  sections: NavSection[] = [];

  constructor(
    private eventsService: EventsService,
    private attendanceService: AttendanceService,
  ) {}

  ngOnInit() {
    this.eventsService.getEventsByPerson(SCHOOL, TEACHER1, 'Staff').subscribe({
      next: evs => {
        this.events = evs;
        this.loadingEvents = false;
        this.buildSections();
      },
      error: () => {
        this.loadingEvents = false;
        this.buildSections();
      },
    });
  }

  private buildSections() {
    const base = window.location.origin;
    const firstId  = this.events[0]?._id ?? 'PASTE_EVENT_ID_HERE';
    const secondId = this.events[1]?._id ?? firstId;

    this.sections = [

      {
        title: '🏠  Home / Landing',
        color: '#374151',
        links: [
          { label: 'Home — no context',   url: `${base}/`,                                     desc: 'Shows "no school link" guidance' },
          { label: 'Home — as teacher',   url: `${base}/?${teacherQp(TEACHER1)}`,              desc: 'Redirects to teacher view' },
          { label: 'Home — as student',   url: `${base}/?${studentQp(STUDENT1)}`,              desc: 'Redirects to student view' },
        ],
      },

      {
        title: '👩‍🏫  Teacher — Events',
        color: '#1a3a5c',
        links: [
          {
            label: `Event List (${TEACHER1.split('@')[0]})`,
            url:   `${base}/teacher/events?${teacherQp(TEACHER1)}`,
            desc:  'Full AG Grid list of events for Ms Naidoo',
            badge: this.events.length ? `${this.events.length} events` : undefined,
          },
          {
            label: `Event List (${TEACHER2.split('@')[0]})`,
            url:   `${base}/teacher/events?${teacherQp(TEACHER2)}`,
            desc:  'Events for Mr Pillay',
          },
          {
            label: 'Create Event',
            url:   `${base}/teacher/events/create?${teacherQp(TEACHER1)}`,
            desc:  'Full create form — event details, hours mode, points, capture options',
          },
        ],
      },

      {
        title: '📋  Teacher — Event Detail & QR',
        color: '#1a3a5c',
        links: [
          ...this.events.slice(0, 5).map((ev, i) => ({
            label:  `${i + 1}. ${ev.eventName}`,
            url:    `${base}/teacher/events/${ev._id}?${teacherQp(TEACHER1)}`,
            desc:   `Attendance grid + scanner  (ID: ${ev._id})`,
            badge:  i === 0 ? 'live' : undefined,
          })),
          ...(this.events.length === 0 ? [{
            label: 'Event Detail (needs real ID)',
            url:   `${base}/teacher/events/${firstId}?${teacherQp(TEACHER1)}`,
            desc:  'Replace PASTE_EVENT_ID_HERE with a real MongoDB ObjectId',
          }] : []),
          {
            label: `QR Codes — ${this.events[0]?.eventName ?? 'first event'}`,
            url:   `${base}/teacher/events/${firstId}/qr?${teacherQp(TEACHER1)}`,
            desc:  'QR code display + print / PDF / email actions',
          },
          {
            label: `QR Codes — ${this.events[1]?.eventName ?? 'second event'}`,
            url:   `${base}/teacher/events/${secondId}/qr?${teacherQp(TEACHER1)}`,
            desc:  'Second event QR page',
          },
        ],
      },

      {
        title: '🎓  Student — Dashboard',
        color: '#0d2137',
        links: [
          {
            label: `Dashboard — ${STUDENT1.first} ${STUDENT1.last} (Grade ${STUDENT1.grade})`,
            url:   `${base}/student/dashboard?${studentQp(STUDENT1)}`,
            desc:  'Progress bars, hours breakdown, attendance grid',
            badge: 'has data',
          },
          {
            label: `Dashboard — ${STUDENT2.first} ${STUDENT2.last} (Grade ${STUDENT2.grade})`,
            url:   `${base}/student/dashboard?${studentQp(STUDENT2)}`,
            desc:  'Progress bars, hours breakdown, attendance grid',
          },
          {
            label: `Dashboard — ${STUDENT3.first} ${STUDENT3.last} (Grade ${STUDENT3.grade})`,
            url:   `${base}/student/dashboard?${studentQp(STUDENT3)}`,
            desc:  'Progress bars, hours breakdown, attendance grid',
          },
        ],
      },

      {
        title: '📱  Student — Submit (QR scan landing)',
        color: '#0d2137',
        links: [
          {
            label: `Submit — Sign In  (${this.events[0]?.eventName ?? 'first event'})`,
            url:   `${base}/submit/${firstId}?direction=in&${studentQp(STUDENT1)}`,
            desc:  'QR scan landing page — sign-in flow',
            badge: 'sign in',
          },
          {
            label: `Submit — Sign Out  (${this.events[0]?.eventName ?? 'first event'})`,
            url:   `${base}/submit/${firstId}?direction=out&${studentQp(STUDENT1)}`,
            desc:  'QR scan landing page — sign-out flow',
            badge: 'sign out',
          },
          {
            label: 'Submit — invalid event ID (error state)',
            url:   `${base}/submit/not-a-valid-id?direction=in&${studentQp(STUDENT1)}`,
            desc:  'Tests ObjectId validation error banner',
          },
        ],
      },

    ];
  }
}
