'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  type: string;
}

interface SubjectGroup {
  id: string;
  name: string;
  description: string | null;
  subjects?: SubjectItem[];
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
      <div className="h-5 bg-slate-100 rounded w-32 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-48" />
    </div>
  );
}

export default function SubjectGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<SubjectGroup[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<SubjectGroup | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addingSubject, setAddingSubject] = useState<Record<string, boolean>>({});
  const [selectedSubjectToAdd, setSelectedSubjectToAdd] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, subjectsRes] = await Promise.all([
        apiClient.get<SubjectGroup[]>('/academics/subject-groups'),
        apiClient.get<SubjectItem[]>('/academics/subjects'),
      ]);
      setGroups(groupsRes.data ?? []);
      setAllSubjects(subjectsRes.data ?? []);
    } catch {
      toast.error('Failed to load subject groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() { setEditItem(null); setForm({ name: '', description: '' }); setShowForm(true); }
  function openEdit(g: SubjectGroup) { setEditItem(g); setForm({ name: g.name, description: g.description ?? '' }); setShowForm(true); }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Group name is required'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await apiClient.patch(`/academics/subject-groups/${editItem.id}`, form);
        toast.success('Subject group updated');
      } else {
        await apiClient.post('/academics/subject-groups', form);
        toast.success('Subject group created');
      }
      setShowForm(false);
      void load();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiClient.delete(`/academics/subject-groups/${id}`);
      toast.success('Subject group deleted');
      setDeleteId(null);
      void load();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Delete failed');
    }
  }

  async function handleAddSubject(groupId: string) {
    const subjectId = selectedSubjectToAdd[groupId];
    if (!subjectId) { toast.error('Select a subject to add'); return; }
    setAddingSubject((s) => ({ ...s, [groupId]: true }));
    try {
      await apiClient.post(`/academics/subject-groups/${groupId}/subjects`, { subject_id: subjectId });
      toast.success('Subject added to group');
      setSelectedSubjectToAdd((s) => ({ ...s, [groupId]: '' }));
      void load();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Failed to add subject');
    } finally {
      setAddingSubject((s) => ({ ...s, [groupId]: false }));
    }
  }

  async function handleRemoveSubject(groupId: string, subjectId: string) {
    try {
      await apiClient.delete(`/academics/subject-groups/${groupId}/subjects/${subjectId}`);
      toast.success('Subject removed');
      void load();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Failed to remove subject');
    }
  }

  function getAvailableSubjects(group: SubjectGroup) {
    const assignedIds = new Set((group.subjects ?? []).map((s) => s.id));
    return allSubjects.filter((s) => !assignedIds.has(s.id));
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/academics')} className="p-1 rounded hover:bg-slate-100 transition-colors">
          <ChevronLeft size={20} className="text-slate-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Subject Groups</h1>
          <p className="text-slate-500 mt-0.5 text-sm">Science, Commerce, Arts streams</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90" style={{ backgroundColor: 'var(--color-primary)' }}>
          <Plus size={16} /> Add Group
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm max-w-md">
          <h3 className="font-semibold text-slate-900 mb-4">{editItem ? 'Edit Group' : 'New Subject Group'}</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name <span className="text-red-500">*</span></label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Science Group" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Physics, Chemistry, Biology, Mathematics" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => void handleSave()} disabled={saving} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ backgroundColor: 'var(--color-primary)' }}>
              {saving ? 'Saving...' : editItem ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          </div>
        </div>
      )}

      {loading
        ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        : groups.length === 0
        ? (
          <div className="bg-white rounded-xl border border-slate-100 py-12 text-center text-slate-400 shadow-sm">
            <p className="font-medium">No subject groups yet</p>
            <p className="text-xs mt-1">Create groups to organise subjects by stream</p>
          </div>
        )
        : (
          <div className="space-y-3">
            {groups.map((g) => {
              const available = getAvailableSubjects(g);
              const groupSubjects = g.subjects ?? [];
              return (
                <div key={g.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 p-4">
                    <button onClick={() => setExpanded(expanded === g.id ? null : g.id)} className="p-1 rounded hover:bg-slate-100 transition-colors">
                      {expanded === g.id ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{g.name}</p>
                      {g.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{g.description}</p>}
                    </div>
                    <span className="text-xs text-slate-400 mr-2">{(g.subjects ?? []).length} subjects</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(g)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Pencil size={14} /></button>
                      {deleteId === g.id
                        ? <span className="flex gap-1 items-center text-xs">
                            <button onClick={() => void handleDelete(g.id)} className="px-2 py-0.5 bg-red-600 text-white rounded text-xs">Yes</button>
                            <button onClick={() => setDeleteId(null)} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">No</button>
                          </span>
                        : <button onClick={() => setDeleteId(g.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                      }
                    </div>
                  </div>

                  {expanded === g.id && (
                    <div className="border-t border-slate-50 px-4 py-3 bg-slate-50">
                      {groupSubjects.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {groupSubjects.map((s) => (
                            <span
                              key={s.id}
                              className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full group"
                            >
                              <span className="font-mono font-medium text-blue-700">{s.code}</span>
                              <span>{s.name}</span>
                              <button
                                onClick={() => void handleRemoveSubject(g.id, s.id)}
                                className="ml-0.5 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove from group"
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <select
                          value={selectedSubjectToAdd[g.id] ?? ''}
                          onChange={(e) => setSelectedSubjectToAdd((s) => ({ ...s, [g.id]: e.target.value }))}
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          disabled={available.length === 0}
                        >
                          <option value="">
                            {available.length === 0 ? 'All subjects already added' : 'Add a subject…'}
                          </option>
                          {available.map((s) => (
                            <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => void handleAddSubject(g.id)}
                          disabled={!selectedSubjectToAdd[g.id] || addingSubject[g.id]}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white font-medium disabled:opacity-50 hover:opacity-90"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                          <Plus size={12} /> Add
                        </button>
                      </div>

                      {groupSubjects.length === 0 && (
                        <p className="text-xs text-slate-400 mt-2">No subjects in this group yet. Add subjects using the dropdown above.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}
