'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight, CheckCircle, ChevronDown, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

type AcademicYear = { id: string; name: string; is_current: boolean };
type ClassSection = { id: string; class_id: string; section_id: string; class_name?: string; section_name?: string };
type SchoolMember = { user_id: string; first_name: string; last_name: string; role: string };

type PromotionStatus = 'promoted' | 'detained' | 'not_applicable';
type StudentRow = { student_id: string; name: string; status: PromotionStatus; to_class_section_id: string };
type WizardStep = 1 | 2 | 3 | 4;

type JobState = 'queued' | 'active' | 'completed' | 'failed' | 'unknown';

interface JobPollResult {
  job_id: string;
  status: JobState;
  progress: number;
  total: number;
  result: { promoted: number; detained: number; transferred_out: number; failed: number; errors: Array<{ student_id: string; reason: string }> } | null;
}

const MANAGE_ROLES = ['super_admin', 'admin'];
const POLL_INTERVAL_MS = 3000;

export default function PromotionPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>(1);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [fromClassSections, setFromClassSections] = useState<ClassSection[]>([]);
  const [toClassSections, setToClassSections] = useState<ClassSection[]>([]);
  const [fromYearId, setFromYearId] = useState('');
  const [toYearId, setToYearId] = useState('');
  const [fromClassSectionId, setFromClassSectionId] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobPoll, setJobPoll] = useState<JobPollResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const canManage = user && MANAGE_ROLES.includes(user.role);

  useEffect(() => {
    if (!canManage) {
      toast.error('You do not have permission to manage student promotions.');
      router.replace('/academics');
    }
  }, [canManage, router]);

  const loadYears = useCallback(async () => {
    try {
      const data = await apiClient.get<AcademicYear[]>('/academics/years');
      const list = data.data ?? [];
      setYears(list);
      const current = list.find((y) => y.is_current);
      if (current) setFromYearId(current.id);
    } catch {
      toast.error('Failed to load academic years.');
    }
  }, []);

  useEffect(() => { void loadYears(); }, [loadYears]);

  const loadFromClassSections = useCallback(async () => {
    if (!fromYearId) return;
    setLoading(true);
    try {
      const data = await apiClient.get<ClassSection[]>(`/academics/class-sections?academic_year_id=${fromYearId}`);
      setFromClassSections(data.data ?? []);
    } catch {
      toast.error('Failed to load class-sections.');
    } finally {
      setLoading(false);
    }
  }, [fromYearId]);

  const loadToClassSections = useCallback(async () => {
    if (!toYearId) return;
    try {
      const data = await apiClient.get<ClassSection[]>(`/academics/class-sections?academic_year_id=${toYearId}`);
      setToClassSections(data.data ?? []);
    } catch {
      toast.error('Failed to load destination class-sections.');
    }
  }, [toYearId]);

  useEffect(() => {
    if (step === 2) {
      void loadFromClassSections();
      void loadToClassSections();
    }
  }, [step, loadFromClassSections, loadToClassSections]);

  const loadStudents = useCallback(async () => {
    if (!fromClassSectionId) return;
    setLoading(true);
    try {
      const res = await apiClient.get<SchoolMember[]>('/users/school-members?role=student');
      const members = res.data ?? [];
      setStudents(
        members.map((m) => ({
          student_id: m.user_id,
          name: `${m.first_name} ${m.last_name}`.trim() || m.user_id,
          status: 'promoted',
          to_class_section_id: '',
        })),
      );
    } catch {
      toast.error('Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [fromClassSectionId]);

  useEffect(() => {
    if (step === 3) void loadStudents();
  }, [step, loadStudents]);

  const pollJobStatus = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get<JobPollResult>(`/academics/promotions/jobs/${id}`);
      const data = res.data;
      setJobPoll(data);
      if (data.status === 'completed' || data.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
        if (data.status === 'completed') {
          toast.success(`Promotion complete! ${data.result?.promoted ?? 0} promoted, ${data.result?.detained ?? 0} detained.`);
        } else {
          toast.error('Promotion job failed. Check job details.');
        }
      }
    } catch {
      // silent — keep polling
    }
  }, []);

  useEffect(() => {
    if (step === 4 && jobId) {
      void pollJobStatus(jobId);
      pollRef.current = setInterval(() => void pollJobStatus(jobId), POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, jobId, pollJobStatus]);

  const updateStudentStatus = (studentId: string, status: PromotionStatus) => {
    setStudents((prev) => prev.map((s) => (s.student_id === studentId ? { ...s, status } : s)));
  };

  const updateToClassSection = (studentId: string, csId: string) => {
    setStudents((prev) => prev.map((s) => (s.student_id === studentId ? { ...s, to_class_section_id: csId } : s)));
  };

  const handleSubmit = async () => {
    const applicable = students.filter((s) => s.status !== 'not_applicable');
    if (applicable.length === 0) { toast.error('No students to promote or detain.'); return; }
    const missing = applicable.filter((s) => !s.to_class_section_id);
    if (missing.length > 0) { toast.error(`Select destination for ${missing.length} student(s).`); return; }

    setSubmitting(true);
    try {
      const idempotencyKey = `promo-${fromYearId}-${toYearId}-${fromClassSectionId}-${Date.now()}`;
      const result = await apiClient.post<{ job_id: string; status: string; total: number }>(
        '/academics/promotions',
        {
          from_academic_year_id: fromYearId,
          to_academic_year_id: toYearId,
          promotions: applicable.map((s) => ({
            student_id: s.student_id,
            from_class_section_id: fromClassSectionId,
            to_class_section_id: s.to_class_section_id,
            status: s.status as 'promoted' | 'detained',
          })),
        },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      );
      setJobId(result.data.job_id);
      setStep(4);
      toast.success(`Promotion queued for ${result.data.total} student(s). Tracking progress…`);
    } catch {
      toast.error('Failed to submit promotion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const jobStatusLabel: Record<JobState, string> = {
    queued: 'Queued — waiting to process',
    active: 'Processing…',
    completed: 'Completed',
    failed: 'Failed',
    unknown: 'Unknown',
  };

  const jobStatusColor: Record<JobState, string> = {
    queued: 'text-amber-600',
    active: 'text-blue-600',
    completed: 'text-green-600',
    failed: 'text-red-600',
    unknown: 'text-slate-500',
  };

  if (!canManage) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Student Promotion</h1>
        <p className="text-slate-500 mt-1">Bulk promote or detain students at year-end</p>
      </div>

      <div className="mb-8 flex items-center gap-2">
        {([1, 2, 3, 4] as WizardStep[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${step >= s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {step > s ? <CheckCircle className="h-4 w-4" /> : s}
            </div>
            {s < 4 && <div className={`w-12 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-slate-200'}`} />}
          </div>
        ))}
        <div className="ml-2 text-sm text-slate-500">
          {step === 1 && 'Select academic years'}
          {step === 2 && 'Select class-section'}
          {step === 3 && 'Review students'}
          {step === 4 && 'Processing'}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Step 1: Select Academic Years</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Year</label>
                <div className="relative">
                  <select value={fromYearId} onChange={(e) => setFromYearId(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select year…</option>
                    {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To Year</label>
                <div className="relative">
                  <select value={toYearId} onChange={(e) => setToYearId(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select year…</option>
                    {years.filter((y) => y.id !== fromYearId).map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setStep(2)} disabled={!fromYearId || !toYearId || fromYearId === toYearId} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Step 2: Select Class-Section to Promote</h2>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}</div>
            ) : fromClassSections.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p>No class-sections found for the selected year. Create them first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {fromClassSections.map((cs) => (
                  <button
                    key={cs.id}
                    onClick={() => setFromClassSectionId(cs.id)}
                    className={`text-left px-4 py-3 rounded-lg border transition-colors ${fromClassSectionId === cs.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-blue-300'}`}
                  >
                    <div className="font-medium text-sm">{cs.class_name ?? cs.class_id} — {cs.section_name ?? cs.section_id}</div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Back</button>
              <button onClick={() => setStep(3)} disabled={!fromClassSectionId} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Step 3: Review Students</h2>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div>
            ) : students.length === 0 ? (
              <div className="py-8 text-center">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No students found in this school yet.</p>
                <p className="text-xs text-slate-400 mt-1">Students will appear here once enrolled via the Students module.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-3 text-xs font-semibold text-slate-500 uppercase tracking-wide px-3">
                  <span>Student</span>
                  <span>Action</span>
                  <span className="col-span-2">Move to (class-section)</span>
                </div>
                {students.map((s) => (
                  <div key={s.student_id} className="grid grid-cols-4 gap-3 items-center px-3 py-3 border border-slate-200 rounded-lg hover:border-slate-300">
                    <span className="font-medium text-slate-800 text-sm">{s.name}</span>
                    <div className="relative">
                      <select value={s.status} onChange={(e) => updateStudentStatus(s.student_id, e.target.value as PromotionStatus)} className="w-full appearance-none pl-2 pr-6 py-1.5 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="promoted">Promoted</option>
                        <option value="detained">Detained</option>
                        <option value="not_applicable">Skip</option>
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="col-span-2">
                      {s.status === 'not_applicable' ? (
                        <span className="text-xs text-slate-400 italic">Skipped</span>
                      ) : (
                        <select value={s.to_class_section_id} onChange={(e) => updateToClassSection(s.student_id, e.target.value)} className="w-full appearance-none pl-2 pr-6 py-1.5 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Select destination…</option>
                          {toClassSections.map((cs) => (
                            <option key={cs.id} value={cs.id}>{cs.class_name ?? cs.class_id} — {cs.section_name ?? cs.section_id}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(2)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Back</button>
              <button onClick={() => void handleSubmit()} disabled={submitting || students.length === 0} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <>Confirm &amp; Submit</>}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="py-8 space-y-6">
            <div className="text-center">
              {jobPoll?.status === 'completed' ? (
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              ) : jobPoll?.status === 'failed' ? (
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                  <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
              )}
              <h2 className="text-xl font-semibold text-slate-900">
                {jobPoll?.status === 'completed' ? 'Promotion Complete' : jobPoll?.status === 'failed' ? 'Promotion Failed' : 'Processing…'}
              </h2>
              {jobId && <p className="text-xs text-slate-400 mt-1">Job ID: {jobId}</p>}
            </div>

            {jobPoll && (
              <div className="max-w-sm mx-auto bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Status</span>
                  <span className={`font-medium ${jobStatusColor[jobPoll.status]}`}>{jobStatusLabel[jobPoll.status]}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Progress</span>
                  <span className="font-medium text-slate-800">{Math.round(Number(jobPoll.progress) || 0)}%</span>
                </div>
                {jobPoll.result && (
                  <>
                    <div className="border-t border-slate-200 pt-2 mt-2">
                      <div className="flex justify-between text-sm"><span className="text-slate-600">Promoted</span><span className="text-green-600 font-medium">{jobPoll.result.promoted}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-slate-600">Detained</span><span className="text-amber-600 font-medium">{jobPoll.result.detained}</span></div>
                      {jobPoll.result.failed > 0 && <div className="flex justify-between text-sm"><span className="text-slate-600">Failed</span><span className="text-red-600 font-medium">{jobPoll.result.failed}</span></div>}
                    </div>
                  </>
                )}
                {(jobPoll.status === 'queued' || jobPoll.status === 'active') && (
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${Math.round(Number(jobPoll.progress) || 0)}%` }} />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => { setStep(1); setFromClassSectionId(''); setStudents([]); setJobId(null); setJobPoll(null); }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Promote Another Class
              </button>
              <button onClick={() => router.push('/academics')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Back to Academics
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
