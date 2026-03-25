'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Step = 1 | 2 | 3;

interface ImportState {
  file: File | null;
  preview: string[][];
  jobId: string | null;
  jobStatus: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  result: { created: number; errors: { row: number; error: string }[] } | null;
}

interface BulkImportStartData {
  job_id: string;
}

interface JobStatusData {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result?: { created: number; errors: { row: number; error: string }[] };
}

export default function BulkImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<ImportState>({
    file: null,
    preview: [],
    jobId: null,
    jobStatus: 'idle',
    result: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadTemplate = async () => {
    try {
      const url = '/v1/students/bulk-import/template';
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Failed to download template');
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are accepted');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must not exceed 2MB');
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n').filter(Boolean);
      const preview = lines.slice(0, 6).map((l) => l.split(',').map((v) => v.trim().replace(/"/g, '')));
      setState((s) => ({ ...s, file, preview }));
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!state.file) return;
    setIsSubmitting(true);
    setError(null);

    const idempotencyKey = crypto.randomUUID();
    const formData = new FormData();
    formData.append('file', state.file);

    try {
      const resp = await apiClient.postForm<BulkImportStartData>('/students/bulk-import', formData, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      const jobId = resp.data?.job_id;
      if (!jobId) {
        throw new Error('Bulk import job id missing in response');
      }
      setState((s) => ({ ...s, jobId, jobStatus: 'queued' }));
      setStep(3);
      pollJobStatus(jobId);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Import failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollJobStatus = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const resp = await apiClient.get<JobStatusData>(`/jobs/${jobId}`);
        const status = resp.data?.status;
        if (!status) {
          throw new Error('Job status missing in response');
        }
        if (status === 'completed') {
          clearInterval(interval);
          setState((s) => ({ ...s, jobStatus: 'completed', result: resp.data?.result ?? null }));
        } else if (status === 'failed') {
          clearInterval(interval);
          setState((s) => ({ ...s, jobStatus: 'failed' }));
        } else {
          setState((s) => ({ ...s, jobStatus: 'processing' }));
        }
      } catch {
        clearInterval(interval);
        setState((s) => ({ ...s, jobStatus: 'failed' }));
      }
    }, 2000);

    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/students')} className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to Students
        </button>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Bulk Import Students</h1>
        <p className="text-sm text-slate-500 mt-0.5">Import up to 500 students at once using a CSV file</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              step >= s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {s}
            </div>
            <span className={`text-sm ${step >= s ? 'text-slate-800' : 'text-slate-400'}`}>
              {s === 1 ? 'Download Template' : s === 2 ? 'Upload File' : 'Processing'}
            </span>
            {s < 3 && <div className={`h-px w-12 ${step > s ? 'bg-blue-600' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Template */}
      {step === 1 && (
        <Card className="p-6 space-y-4">
          <h2 className="font-medium text-slate-900">Step 1: Download the CSV Template</h2>
          <p className="text-sm text-slate-500">
            Download and fill in the template CSV. Required columns: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">admission_no</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">first_name</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">last_name</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">date_of_birth</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">gender</code>.
          </p>
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-1">
            <p><strong>Required:</strong> admission_no, first_name, last_name, date_of_birth (YYYY-MM-DD), gender (male/female/other)</p>
            <p><strong>Optional:</strong> middle_name, blood_group, religion, category_code, house_name, academic_year_id, class_section_id, roll_number</p>
            <p><strong>Limits:</strong> Max 500 rows, max 2MB file size</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              ⬇ Download Template
            </Button>
            <Button onClick={() => setStep(2)}>
              Continue →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Upload */}
      {step === 2 && (
        <Card className="p-6 space-y-4">
          <h2 className="font-medium text-slate-900">Step 2: Upload your CSV file</h2>

          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFileChange(e.dataTransfer.files[0] ?? null); }}
          >
            <div className="text-3xl mb-2">📎</div>
            <p className="font-medium text-slate-700">
              {state.file ? state.file.name : 'Drag & drop or click to upload CSV'}
            </p>
            <p className="text-xs text-slate-400 mt-1">CSV only · Max 2MB · Max 500 rows</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {state.preview.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Preview (first 5 rows):</p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="text-xs text-slate-700 w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      {state.preview[0]?.map((h, i) => (
                        <th key={i} className="px-2 py-1.5 text-left text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.preview.slice(1).map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {row.map((cell, j) => (
                          <td key={j} className="px-2 py-1">{cell || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={!state.file || isSubmitting}
            >
              {isSubmitting ? 'Starting import...' : 'Start Import →'}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Processing */}
      {step === 3 && (
        <Card className="p-8 text-center space-y-4">
          {state.jobStatus === 'queued' || state.jobStatus === 'processing' ? (
            <>
              <div className="text-4xl animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto" />
              <h2 className="font-medium text-slate-900">Processing your import...</h2>
              <p className="text-sm text-slate-500">
                Job ID: <span className="font-mono text-xs">{state.jobId}</span>
              </p>
              <p className="text-xs text-slate-400">This may take a moment. You can leave this page — the import will continue.</p>
            </>
          ) : state.jobStatus === 'completed' ? (
            <>
              <div className="text-5xl">✅</div>
              <h2 className="font-medium text-slate-900">Import complete!</h2>
              {state.result && (
                <div className="text-sm text-slate-600 space-y-1">
                  <p>✓ <strong>{state.result.created}</strong> students created</p>
                  {state.result.errors.length > 0 && (
                    <p className="text-orange-600">⚠ <strong>{state.result.errors.length}</strong> rows had errors</p>
                  )}
                </div>
              )}
              <Button onClick={() => router.push('/students')}>Go to Students →</Button>
            </>
          ) : (
            <>
              <div className="text-5xl">❌</div>
              <h2 className="font-medium text-slate-900">Import failed</h2>
              <p className="text-sm text-slate-500">Something went wrong. Please try again.</p>
              <Button variant="outline" onClick={() => setStep(2)}>Try Again</Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
