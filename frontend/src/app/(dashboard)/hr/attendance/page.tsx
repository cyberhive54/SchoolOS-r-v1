'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth.store';
import type { PaginatedResponse } from '@/types';

interface Staff {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
}

interface AttendanceRecord {
  staff_id: string;
  status: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday';
}

type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'holiday', label: 'Holiday' },
];

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'success',
  absent: 'danger',
  half_day: 'warning',
  on_leave: 'info',
  holiday: 'default',
};

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function StaffAttendancePage() {
  const { user } = useAuthStore();
  const [date, setDate] = useState(today());
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);

  const canMark = user && ['super_admin', 'admin'].includes(user.role);

  const { data: staffResp, isLoading: staffLoading } = useQuery<PaginatedResponse<Staff>>({
    queryKey: ['hr-staff-active'],
    queryFn: () => apiClient.getPaginated<Staff>('/hr/staff?filter[status]=active&per_page=100'),
  });

  const { data: existingResp, isLoading: attLoading } = useQuery<PaginatedResponse<AttendanceRecord>>({
    queryKey: ['hr-attendance', date],
    queryFn: () => apiClient.getPaginated<AttendanceRecord>(`/hr/attendance?filter[date]=${date}&per_page=200`),
  });

  useEffect(() => {
    if (existingResp?.data) {
      const map: Record<string, AttendanceStatus> = {};
      existingResp.data.forEach((r) => {
        map[r.staff_id] = r.status;
      });
      setRecords(map);
    }
  }, [existingResp]);

  const bulkMarkMutation = useMutation({
    mutationFn: (payload: { date: string; records: { staff_id: string; status: string }[] }) =>
      apiClient.post('/hr/attendance/bulk-mark', payload),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const staff = staffResp?.data ?? [];

  function setAll(status: AttendanceStatus) {
    const map: Record<string, AttendanceStatus> = {};
    staff.forEach((s) => { map[s.id] = status; });
    setRecords(map);
  }

  function handleSubmit() {
    const payload = {
      date,
      records: staff.map((s) => ({
        staff_id: s.id,
        status: records[s.id] ?? 'present',
      })),
    };
    bulkMarkMutation.mutate(payload);
  }

  const isLoading = staffLoading || attLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Staff Attendance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Mark daily attendance for all staff</p>
        </div>
        {saved && (
          <div className="bg-green-50 text-green-700 text-sm px-4 py-2 rounded-lg border border-green-200">
            Attendance saved successfully!
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-4">
        <label className="text-sm text-slate-600 font-medium whitespace-nowrap">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {canMark && (
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" size="sm" onClick={() => setAll('present')}>Mark All Present</Button>
            <Button variant="ghost" size="sm" onClick={() => setAll('holiday')}>Mark Holiday</Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Staff Member</th>
              <th className="px-4 py-3 text-left font-medium">Employee ID</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
              : staff.length === 0
              ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No active staff members found.
                  </td>
                </tr>
              )
              : staff.map((s) => {
                const currentStatus = records[s.id] ?? 'present';
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-medium">
                          {s.first_name[0]}{s.last_name[0]}
                        </div>
                        <span className="font-medium text-slate-900">{s.first_name} {s.last_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.employee_id}</td>
                    <td className="px-4 py-3">
                      {canMark ? (
                        <select
                          value={currentStatus}
                          onChange={(e) => setRecords(prev => ({ ...prev, [s.id]: e.target.value as AttendanceStatus }))}
                          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge variant={STATUS_COLORS[currentStatus] as 'success' | 'danger' | 'warning' | 'info' | 'default'}>
                          {STATUS_OPTIONS.find(o => o.value === currentStatus)?.label ?? currentStatus}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>

        {canMark && staff.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={bulkMarkMutation.isPending}
            >
              {bulkMarkMutation.isPending ? 'Saving…' : 'Save Attendance'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
