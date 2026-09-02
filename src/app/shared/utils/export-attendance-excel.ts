import * as XLSX from 'xlsx';
import { AttendanceSummary, IAttendance } from '../../core/services/attendance.service';

/**
 * Builds and downloads a two-sheet workbook for a student:
 *  - "Breakdown": department/subcategory hours+points (+ limits when set)
 *  - "Records": every individual attendance record
 *
 * Shared by the student's own dashboard export button and the teacher's
 * "View Student Dashboard" lookup dialog, so both stay in sync.
 */
export function exportAttendanceExcel(
  summary: AttendanceSummary | null,
  attendance: IAttendance[],
  studentName: string,
): void {
  const breakdownRows = (summary?.departmentBreakdown ?? []).flatMap(dept =>
    dept.subcategories.map(sub => ({
      'Department': dept.name,
      'Subcategory': sub.name,
      'Hours': sub.hours,
      'Hours Limit': sub.hoursLimit ?? '',
      'Points': sub.points,
      'Points Limit': sub.pointsLimit ?? '',
    })),
  );

  const recordRows = attendance.map(r => ({
    'Event Name': r.eventName ?? '',
    'Department': r.eventDepartment ?? '',
    'Category': r.eventCategory ?? '',
    'Time In': r.timeIn ? new Date(r.timeIn).toLocaleString() : '',
    'Time Out': r.timeOut ? new Date(r.timeOut).toLocaleString() : '',
    'Hours': r.hours ?? '',
    'Points': r.pointsAwarded ?? 0,
    'Description': r.description ?? '',
  }));

  const autoCols = (rows: Record<string, unknown>[]) =>
    Object.keys(rows[0] ?? {}).map(k => ({
      wch: Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length)) + 2,
    }));

  const wb = XLSX.utils.book_new();

  const breakdownWs = XLSX.utils.json_to_sheet(breakdownRows);
  if (breakdownRows.length) breakdownWs['!cols'] = autoCols(breakdownRows);
  XLSX.utils.book_append_sheet(wb, breakdownWs, 'Breakdown');

  const recordsWs = XLSX.utils.json_to_sheet(recordRows);
  if (recordRows.length) recordsWs['!cols'] = autoCols(recordRows);
  XLSX.utils.book_append_sheet(wb, recordsWs, 'Records');

  XLSX.writeFile(wb, `${studentName} - Dashboard.xlsx`);
}
