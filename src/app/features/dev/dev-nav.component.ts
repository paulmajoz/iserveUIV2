import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventsService } from '../../core/services/events.service';

// ─── Seed presets ─────────────────────────────────────────────────────────────

interface Preset {
  label: string;
  role: 'Staff' | 'Student';
  email: string;
  firstName: string;
  lastName: string;
  grade: string;
  studentClass: string;
  schoolId: number;
  house?: string;
  tutor?: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
}

const PRESETS: Preset[] = [
  { label: 'Ms Naidoo',    role: 'Staff',   email: 'snaidoo@kingsmead.co.za',              firstName: 'Sarah',  lastName: 'Naidoo',  grade: '',   studentClass: '',    schoolId: 11338 },
  { label: 'Mr Pillay',    role: 'Staff',   email: 'jpillay@kingsmead.co.za',              firstName: 'John',   lastName: 'Pillay',  grade: '',   studentClass: '',    schoolId: 11338 },
  { label: 'Mr Coetzee',   role: 'Staff',   email: 'jcoetzee@kingsmead.co.za',             firstName: 'James',  lastName: 'Coetzee', grade: '',   studentClass: '',    schoolId: 11338 },
  { label: 'Alice Gr10',   role: 'Student', email: 'alice.smith@student.kingsmead.co.za',  firstName: 'Alice',  lastName: 'Smith',   grade: '10', studentClass: '10A', schoolId: 11338, house: 'Kingsley',  tutor: 'Ms Smith',   customField1: 'Hockey',   customField2: 'Choir',  customField3: '' },
  { label: 'Bob Gr10',     role: 'Student', email: 'bob.jones@student.kingsmead.co.za',    firstName: 'Bob',    lastName: 'Jones',   grade: '10', studentClass: '10B', schoolId: 11338, house: 'Founders',  tutor: 'Mr Pillay',  customField1: 'Rugby',    customField2: '',       customField3: '' },
  { label: 'Chloe Gr11',   role: 'Student', email: 'chloe.nkosi@student.kingsmead.co.za',  firstName: 'Chloe',  lastName: 'Nkosi',   grade: '11', studentClass: '11A', schoolId: 11338, house: 'Kingsley',  tutor: 'Ms Naidoo',  customField1: 'Netball',  customField2: 'Drama',  customField3: '' },
  { label: 'David Gr11',   role: 'Student', email: 'david.patel@student.kingsmead.co.za',  firstName: 'David',  lastName: 'Patel',   grade: '11', studentClass: '11B', schoolId: 11338, house: 'Founders',  tutor: 'Mr Coetzee', customField1: 'Cricket',  customField2: '',       customField3: '' },
  { label: 'Emma Gr9',     role: 'Student', email: 'emma.coetzee@student.kingsmead.co.za', firstName: 'Emma',   lastName: 'Coetzee', grade: '9',  studentClass: '9A',  schoolId: 11338, house: 'Beaumont',  tutor: 'Mr Pillay',  customField1: 'Swimming', customField2: 'Art',    customField3: '' },
];

interface NavLink    { label: string; url: string; desc?: string; badge?: string; tag?: string; }
interface NavSection { title: string; emoji: string; color: string; links: NavLink[]; }

@Component({
  selector: 'app-dev-nav',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `

    <div class="min-h-screen bg-gray-100">

      <!-- ── Page header ──────────────────────────────────── -->
      <div class="bg-gray-900 text-white px-6 py-5">
        <h1 class="text-xl font-bold tracking-tight">iServe V2 — Component Navigator</h1>
        <p class="text-gray-400 text-xs mt-1">API: <code class="text-gray-300">http://localhost:3000/api</code></p>
      </div>

      <main class="max-w-3xl mx-auto px-4 py-6 space-y-6">

        <!-- ── Context panel ─────────────────────────────── -->
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">

          <div class="px-5 pt-4 pb-2 border-b border-gray-100">
            <p class="text-xs font-bold uppercase tracking-wider text-gray-500">Active User Context</p>
            <p class="text-xs text-gray-400 mt-0.5">Edit any field — all links below update instantly.</p>
          </div>

          <!-- Quick-select presets -->
          <div class="px-5 pt-3 pb-2">
            <p class="text-xs text-gray-400 mb-2 font-medium">Quick select:</p>
            <div class="flex flex-wrap gap-2">
              <button *ngFor="let p of presets"
                      type="button"
                      (click)="applyPreset(p)"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                      [class.border-gray-200]="!isActive(p)"
                      [class.text-gray-600]="!isActive(p)"
                      [class.bg-white]="!isActive(p)"
                      [class.text-white]="isActive(p)"
                      [class.border-transparent]="isActive(p)"
                      [style.background-color]="isActive(p) ? (p.role === 'Staff' ? '#1a3a5c' : '#0d2137') : null">
                {{ p.label }}
                <span class="ml-1 opacity-60 text-xs">{{ p.role === 'Staff' ? '👨‍🏫' : '🎓' }}</span>
              </button>
            </div>
          </div>

          <!-- Fields grid -->
          <div class="px-5 pt-2 pb-5 grid grid-cols-2 sm:grid-cols-3 gap-3">

            <div class="col-span-2 sm:col-span-2">
              <label class="field-label">Email</label>
              <input type="email" [(ngModel)]="ctx.email" class="field-input text-sm" />
            </div>

            <div>
              <label class="field-label">Role</label>
              <select [(ngModel)]="ctx.role" class="field-input text-sm">
                <option value="Staff">Staff (Teacher)</option>
                <option value="Student">Student</option>
              </select>
            </div>

            <div>
              <label class="field-label">First Name</label>
              <input type="text" [(ngModel)]="ctx.firstName" class="field-input text-sm" />
            </div>

            <div>
              <label class="field-label">Last Name</label>
              <input type="text" [(ngModel)]="ctx.lastName" class="field-input text-sm" />
            </div>

            <div>
              <label class="field-label">School ID</label>
              <input type="number" [(ngModel)]="ctx.schoolId" class="field-input text-sm" />
            </div>

            <div>
              <label class="field-label">Grade</label>
              <input type="text" [(ngModel)]="ctx.grade" placeholder="e.g. 10" class="field-input text-sm" />
            </div>

            <div>
              <label class="field-label">Class</label>
              <input type="text" [(ngModel)]="ctx.studentClass" placeholder="e.g. 10A" class="field-input text-sm" />
            </div>

            <div>
              <label class="field-label">House</label>
              <input type="text" [(ngModel)]="ctx.house" placeholder="e.g. Kingsley" class="field-input text-sm" />
            </div>

            <div>
              <label class="field-label">Tutor</label>
              <input type="text" [(ngModel)]="ctx.tutor" placeholder="e.g. Ms Smith" class="field-input text-sm" />
            </div>

            <div>
              <label class="field-label">Custom 1</label>
              <input type="text" [(ngModel)]="ctx.customField1" placeholder="e.g. Hockey" class="field-input text-sm" />
            </div>

            <div>
              <label class="field-label">Custom 2</label>
              <input type="text" [(ngModel)]="ctx.customField2" placeholder="e.g. Choir" class="field-input text-sm" />
            </div>

            <div>
              <label class="field-label">Custom 3</label>
              <input type="text" [(ngModel)]="ctx.customField3" placeholder="" class="field-input text-sm" />
            </div>

          </div>

          <!-- Live query string preview -->
          <div class="mx-5 mb-4 bg-gray-50 rounded-xl px-4 py-3">
            <p class="text-xs text-gray-400 font-medium mb-1">Query string preview:</p>
            <code class="text-xs text-gray-600 break-all">{{ '?' + queryString }}</code>
          </div>

        </div>

        <!-- ── Event ID status ────────────────────────────── -->
        <div *ngIf="loadingEvents" class="text-xs text-gray-400 text-center py-2">
          Loading live event IDs from API…
        </div>
        <div *ngIf="!loadingEvents && events.length > 0"
             class="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-xs text-green-700">
          ✓ {{ events.length }} live events loaded — event links use real IDs.
        </div>
        <div *ngIf="!loadingEvents && events.length === 0"
             class="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-xs text-yellow-700">
          ⚠ No events found for current teacher email. Switch to a teacher preset or check the API.
        </div>

        <!-- ── Nav sections ───────────────────────────────── -->
        <div *ngFor="let section of sections"
             class="bg-white rounded-2xl shadow-sm overflow-hidden">

          <div class="px-5 py-3 flex items-center gap-2"
               [style.background-color]="section.color">
            <span class="text-base">{{ section.emoji }}</span>
            <h2 class="font-bold text-white text-sm uppercase tracking-wider">{{ section.title }}</h2>
          </div>

          <div class="divide-y divide-gray-50">
            <a *ngFor="let link of section.links"
               [href]="link.url"
               class="flex items-start justify-between gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group cursor-pointer">

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {{ link.label }}
                  </span>
                  <span *ngIf="link.badge"
                        class="text-xs px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-700">
                    {{ link.badge }}
                  </span>
                  <span *ngIf="link.tag"
                        class="text-xs px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700">
                    {{ link.tag }}
                  </span>
                </div>
                <p *ngIf="link.desc" class="text-xs text-gray-400 mt-0.5">{{ link.desc }}</p>
                <p class="text-xs text-gray-300 mt-0.5 truncate font-mono">{{ link.url }}</p>
              </div>

              <span class="text-gray-300 group-hover:text-blue-400 text-lg shrink-0 mt-0.5">↗</span>
            </a>
          </div>

        </div>

      </main>
    </div>
  `,
})
export class DevNavComponent implements OnInit {

  // ── User context (all links derive from this) ──────────────────────────────
  ctx = { ...PRESETS[0] };      // default: Ms Naidoo (Staff)

  readonly presets = PRESETS;

  // ── Live events from API ───────────────────────────────────────────────────
  loadingEvents = true;
  events: Array<{ _id: string; eventName: string }> = [];

  sections: NavSection[] = [];

  constructor(private eventsService: EventsService) {}

  ngOnInit() {
    this.loadEvents();
  }

  // ── Context helpers ────────────────────────────────────────────────────────

  applyPreset(p: Preset) {
    this.ctx = { ...p };
    // If switching to a teacher, reload events for that email
    if (p.role === 'Staff') this.loadEvents();
    else this.buildSections();   // rebuild with updated context
  }

  isActive(p: Preset): boolean {
    return p.email === this.ctx.email && p.role === this.ctx.role;
  }

  get queryString(): string {
    const p = new URLSearchParams({
      email:    this.ctx.email,
      role:     this.ctx.role,
      schoolId: String(this.ctx.schoolId),
    });
    if (this.ctx.firstName)    p.set('first',        this.ctx.firstName);
    if (this.ctx.lastName)     p.set('last',         this.ctx.lastName);
    if (this.ctx.grade)        p.set('grade',        this.ctx.grade);
    if (this.ctx.studentClass) p.set('class',        this.ctx.studentClass);
    if (this.ctx.house)        p.set('house',        this.ctx.house);
    if (this.ctx.tutor)        p.set('tutor',        this.ctx.tutor);
    if (this.ctx.customField1) p.set('customField1', this.ctx.customField1);
    if (this.ctx.customField2) p.set('customField2', this.ctx.customField2);
    if (this.ctx.customField3) p.set('customField3', this.ctx.customField3);
    return p.toString();
  }

  private get base(): string { return window.location.origin; }

  private url(path: string): string {
    return `${this.base}${path}?${this.queryString}`;
  }

  // ── Event loading ──────────────────────────────────────────────────────────

  private loadEvents() {
    this.loadingEvents = true;
    const teacherEmail = this.ctx.role === 'Staff'
      ? this.ctx.email
      : PRESETS.find(p => p.role === 'Staff')!.email;

    this.eventsService.getEventsByPerson(this.ctx.schoolId, teacherEmail, 'Staff').subscribe({
      next: evs => {
        this.events = evs;
        this.loadingEvents = false;
        this.buildSections();
      },
      error: () => {
        this.events = [];
        this.loadingEvents = false;
        this.buildSections();
      },
    });
  }

  // ── Section builder ────────────────────────────────────────────────────────

  buildSections() {
    const firstId  = this.events[0]?._id ?? '';
    const b = this.base;

    // Helper: build a URL with specific role override
    const urlAs = (path: string, role: 'Staff' | 'Student') => {
      const saved = this.ctx.role;
      this.ctx.role = role;
      const result = this.url(path);
      this.ctx.role = saved;
      return result;
    };

    this.sections = [

      {
        title: 'Home / Landing',
        emoji: '🏠',
        color: '#374151',
        links: [
          { label: 'Home — current context',  url: this.url('/'),         desc: 'Redirects based on role' },
          { label: 'Home — no context',       url: `${b}/`,               desc: 'Shows "no school link" guidance banner' },
        ],
      },

      {
        title: 'Teacher — Events',
        emoji: '👩‍🏫',
        color: '#1a3a5c',
        links: [
          {
            label: 'Event List',
            url:   urlAs('/teacher/events', 'Staff'),
            desc:  'AG Grid list of all events for this teacher',
            badge: this.events.length ? `${this.events.length} events` : undefined,
          },
          {
            label: 'Create Event',
            url:   urlAs('/teacher/events/create', 'Staff'),
            desc:  'Form — event details, hours mode, points, capture options',
          },
        ],
      },

      {
        title: 'Teacher — Event Detail & QR',
        emoji: '📋',
        color: '#1a3a5c',
        links: this.events.length
          ? [
              ...this.events.slice(0, 6).map((ev, i) => ({
                label: ev.eventName,
                url:   `${b}/teacher/events/${ev._id}?${this.withRole('Staff')}`,
                desc:  `Attendance grid + scanner`,
                badge: `event ${i + 1}`,
              })),
              ...this.events.slice(0, 6).map(ev => ({
                label: `QR — ${ev.eventName}`,
                url:   `${b}/teacher/events/${ev._id}/qr?${this.withRole('Staff')}`,
                desc:  'QR code cards · print / PDF / email',
                tag:   'qr',
              })),
            ]
          : [{ label: 'No events found', url: urlAs('/teacher/events', 'Staff'), desc: 'Run npm run seed in iserveAPIV2' }],
      },

      {
        title: 'Student — Dashboard',
        emoji: '🎓',
        color: '#0d2137',
        links: PRESETS.filter(p => p.role === 'Student').map(p => ({
          label: `${p.firstName} ${p.lastName} — Grade ${p.grade}`,
          url:   `${b}/student/dashboard?${this.presetQp(p)}`,
          desc:  `${p.email}`,
        })),
      },

      {
        title: 'Student — Submit (QR scan)',
        emoji: '📱',
        color: '#0d2137',
        links: firstId
          ? [
              ...PRESETS.filter(p => p.role === 'Student').slice(0, 3).map(p => ({
                label: `Sign In — ${p.firstName} ${p.lastName}`,
                url:   `${b}/submit/${firstId}?direction=in&${this.presetQp(p)}`,
                desc:  `${this.events[0]?.eventName ?? ''}`,
                badge: 'sign in',
              })),
              {
                label: 'Sign Out — Alice Smith',
                url:   `${b}/submit/${firstId}?direction=out&${this.presetQp(PRESETS[3])}`,
                desc:  `${this.events[0]?.eventName ?? ''}`,
                badge: 'sign out',
              },
              {
                label: 'Invalid event ID (error state)',
                url:   `${b}/submit/not-a-valid-id?direction=in&${this.presetQp(PRESETS[3])}`,
                desc:  'Tests ObjectId validation error banner',
              },
            ]
          : [{ label: 'No events loaded yet', url: `${b}/nav`, desc: 'Ensure the API is running' }],
      },

    ];
  }

  // ── Private query-string helpers ───────────────────────────────────────────

  private withRole(role: 'Staff' | 'Student'): string {
    const p = new URLSearchParams({
      email:    this.ctx.email,
      role,
      schoolId: String(this.ctx.schoolId),
    });
    if (this.ctx.firstName)    p.set('first',        this.ctx.firstName);
    if (this.ctx.lastName)     p.set('last',         this.ctx.lastName);
    if (this.ctx.grade)        p.set('grade',        this.ctx.grade);
    if (this.ctx.studentClass) p.set('class',        this.ctx.studentClass);
    if (this.ctx.house)        p.set('house',        this.ctx.house);
    if (this.ctx.tutor)        p.set('tutor',        this.ctx.tutor);
    if (this.ctx.customField1) p.set('customField1', this.ctx.customField1);
    if (this.ctx.customField2) p.set('customField2', this.ctx.customField2);
    if (this.ctx.customField3) p.set('customField3', this.ctx.customField3);
    return p.toString();
  }

  private presetQp(p: Preset): string {
    const params = new URLSearchParams({
      email:    p.email,
      role:     p.role,
      schoolId: String(p.schoolId),
    });
    if (p.firstName)    params.set('first',        p.firstName);
    if (p.lastName)     params.set('last',         p.lastName);
    if (p.grade)        params.set('grade',        p.grade);
    if (p.studentClass) params.set('class',        p.studentClass);
    if (p.house)        params.set('house',        p.house);
    if (p.tutor)        params.set('tutor',        p.tutor);
    if (p.customField1) params.set('customField1', p.customField1);
    if (p.customField2) params.set('customField2', p.customField2);
    if (p.customField3) params.set('customField3', p.customField3);
    return params.toString();
  }
}
