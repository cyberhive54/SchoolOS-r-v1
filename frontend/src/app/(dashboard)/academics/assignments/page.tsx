'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, ChevronDown, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

type AcademicYear = { id: string; name: string; is_current: boolean };
type ClassSection = { id: string; class_id: string; section_id: string; class_name?: string; section_name?: string };
type Subject = { id: string; name: string; code: string };
type StaffMember = { user_id: string; first_name: string; last_name: string; email: string; role: string };
type Assignment = { id: string; class_section_id: string; subject_id: string; user_id: string };

const MANAGE_ROLES = ['super_admin', 'admin'];

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

interface TeacherCellProps {
  classSectionId: string;
  subject: Subject;
  staff: StaffMember[];
  currentAssignment: Assignment | undefined;
  onAssign: (classSectionId: string, subjectId: string, userId: string) => Promise<void>;
  onRemove: (classSectionId: string, subjectId: string) => Promise<void>;
  saving: boolean;
}

function TeacherCell({ classSectionId, subject, staff, currentAssignment, onAssign, onRemove, saving }: TeacherCellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const assigned = staff.find((s) => s.user_id === currentAssignment?.user_id);

  if (saving) {
    return <span className="text-xs text-slate-400 italic">Saving…</span>;
  }

  if (assigned) {
    return (
      <div className="flex items-center gap-1.5 group/cell">
        <span className="text-xs font-medium text-slate-700">{assigned.first_name} {assigned.last_name}</span>
        <button
          onClick={() => void onRemove(classSectionId, subject.id)}
          className="opacity-0 group-hover/cell:opacity-100 p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
          title="Remove assignment"
        >
          <X size={11} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs px-2 py-1 rounded border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center gap-1"
        title={`Assign teacher for ${subject.name}`}
      >
        + Assign <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-7 left-0 z-20 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[160px] max-h-48 overflow-y-auto py-1">
          {staff.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">No teachers found</p>
          ) : (
            staff.map((s) => (
              <button
                key={s.user_id}
                onClick={() => { setOpen(false); void onAssign(classSectionId, subject.id, s.user_id); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-700 transition-colors"
              >
                {s.first_name} {s.last_name}
                <span className="ml-1 text-slate-400">({s.role})</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function AssignmentsPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [classSections, setClassSections] = useState<ClassSection[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const canManage = user && MANAGE_ROLES.includes(user.role);

  useEffect(() => {
    if (!canManage) {
      toast.error('You do not have permission to manage teacher assignments.');
      router.replace('/academics');
    }
  }, [canManage, router]);

  const loadYears = useCallback(async () => {
    try {
      const data = await apiClient.get<AcademicYear[]>('/academics/years');
      const list = data.data ?? [];
      setYears(list);
      const current = list.find((y) => y.is_current);
      if (current) setSelectedYearId(current.id);
      else if (list.length > 0) setSelectedYearId(list[0].id);
    } catch {
      toast.error('Failed to load academic years.');
    }
  }, []);

  const loadSubjectsAndStaff = useCallback(async () => {
    try {
      const [subjectsRes, staffRes] = await Promise.all([
        apiClient.get<Subject[]>('/academics/subjects'),
        apiClient.get<StaffMember[]>('/users/school-members?role=teacher'),
      ]);
      setSubjects(subjectsRes.data ?? []);
      setStaff(staffRes.data ?? []);
    } catch {
      toast.error('Failed to load subjects or staff.');
    }
  }, []);

  const loadClassSections = useCallback(async (yearId: string) => {
    if (!yearId) return;
    setLoading(true);
    try {
      const data = await apiClient.get<ClassSection[]>(
        `/academics/class-sections?academic_year_id=${yearId}`,
      );
      setClassSections(data.data ?? []);
    } catch {
      toast.error('Failed to load class sections.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async (yearId: string) => {
    if (!yearId) return;
    try {
      const res = await apiClient.get<Assignment[]>(
        `/academics/class-sections/subject-teachers?academic_year_id=${yearId}`,
      );
      setAssignments(res.data ?? []);
    } catch {
      setAssignments([]);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadYears(), loadSubjectsAndStaff()]).finally(() => setLoading(false));
  }, [loadYears, loadSubjectsAndStaff]);

  useEffect(() => {
    if (selectedYearId) {
      Promise.all([loadClassSections(selectedYearId), loadAssignments(selectedYearId)]);
    }
  }, [selectedYearId, loadClassSections, loadAssignments]);

  const handleAssign = async (classSectionId: string, subjectId: string, userId: string) => {
    const key = `${classSectionId}-${subjectId}`;
    setSaving(key);
    try {
      await apiClient.post(
        `/academics/class-sections/${classSectionId}/subject-teachers`,
        { subject_id: subjectId, user_id: userId },
      );
      toast.success('Teacher assigned.');
      if (selectedYearId) await loadAssignments(selectedYearId);
    } catch {
      toast.error('Failed to assign teacher.');
    } finally {
      setSaving(null);
    }
  };

  const handleRemove = async (classSectionId: string, subjectId: string) => {
    const key = `${classSectionId}-${subjectId}`;
    const assignment = assignments.find(
      (a) => a.class_section_id === classSectionId && a.subject_id === subjectId,
    );
    if (!assignment) return;
    setSaving(key);
    try {
      await apiClient.delete(
        `/academics/class-sections/${classSectionId}/subject-teachers/${assignment.id}`,
      );
      toast.success('Assignment removed.');
      setAssignments((prev) =>
        prev.filter((a) => !(a.class_section_id === classSectionId && a.subject_id === subjectId)),
      );
    } catch {
      toast.error('Failed to remove assignment.');
    } finally {
      setSaving(null);
    }
  };

  if (!canManage) return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teacher Assignments</h1>
          <p className="text-slate-500 mt-1">Assign subject teachers to class-sections</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Academic Year</label>
          <div className="relative">
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.name}{y.is_current ? ' (current)' : ''}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {staff.length === 0 && !loading && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          No teachers found in this school. Add teachers via user management to enable assignments.
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-medium text-slate-600">Class-Section</th>
                {Array.from({ length: 5 }).map((_, i) => (
                  <th key={i} className="px-4 py-3 text-left font-medium text-slate-600">
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} cols={6} />
              ))}
            </tbody>
          </table>
        </div>
      ) : classSections.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No class-sections found for this academic year.</p>
          <p className="text-slate-400 text-sm mt-1">Create class-sections first in the Class-Sections page.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10">
                  Class-Section
                </th>
                {subjects.map((s) => (
                  <th key={s.id} className="px-4 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">
                    {s.name}
                    <span className="ml-1 text-xs font-normal text-slate-400">({s.code})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classSections.map((cs) => (
                <tr key={cs.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800 sticky left-0 bg-white">
                    {cs.class_name ?? cs.class_id} — {cs.section_name ?? cs.section_id}
                  </td>
                  {subjects.map((s) => {
                    const key = `${cs.id}-${s.id}`;
                    const isSaving = saving === key;
                    const assignment = assignments.find(
                      (a) => a.class_section_id === cs.id && a.subject_id === s.id,
                    );
                    return (
                      <td key={s.id} className="px-4 py-3">
                        <TeacherCell
                          classSectionId={cs.id}
                          subject={s}
                          staff={staff}
                          currentAssignment={assignment}
                          onAssign={handleAssign}
                          onRemove={handleRemove}
                          saving={isSaving}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
