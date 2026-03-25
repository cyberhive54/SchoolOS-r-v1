'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';

interface Category {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
}

interface House {
  id: string;
  name: string;
  color_hex: string | null;
  description: string | null;
  is_active: boolean;
}

function SectionSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function StudentsSettingsPage() {
  const queryClient = useQueryClient();
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showHouseForm, setShowHouseForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', code: '', description: '' });
  const [houseForm, setHouseForm] = useState({ name: '', color_hex: '', description: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: categoriesResp, isLoading: catLoading } = useQuery<{ data: Category[] }>({
    queryKey: ['student-categories'],
    queryFn: () => apiClient.get('/students/categories'),
  });

  const { data: housesResp, isLoading: houseLoading } = useQuery<{ data: House[] }>({
    queryKey: ['student-houses'],
    queryFn: () => apiClient.get('/students/houses'),
  });

  const createCategory = useMutation({
    mutationFn: (data: typeof categoryForm) => apiClient.post('/students/categories', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student-categories'] });
      setShowCategoryForm(false);
      setCategoryForm({ name: '', code: '', description: '' });
      setFormError(null);
    },
    onError: (err: unknown) => {
      setFormError((err as Error).message ?? 'Failed to create category');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/students/categories/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['student-categories'] }),
  });

  const createHouse = useMutation({
    mutationFn: (data: typeof houseForm) => apiClient.post('/students/houses', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student-houses'] });
      setShowHouseForm(false);
      setHouseForm({ name: '', color_hex: '', description: '' });
      setFormError(null);
    },
    onError: (err: unknown) => {
      setFormError((err as Error).message ?? 'Failed to create house');
    },
  });

  const deleteHouse = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/students/houses/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['student-houses'] }),
  });

  const categories = categoriesResp?.data ?? [];
  const houses = housesResp?.data ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Student Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage student categories and house groups</p>
      </div>

      {/* Categories */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium text-slate-900">Student Categories</h2>
            <p className="text-xs text-slate-400 mt-0.5">General, SC, ST, OBC, EWS, etc.</p>
          </div>
          <Button size="sm" onClick={() => { setShowCategoryForm(true); setFormError(null); }}>
            + Add Category
          </Button>
        </div>

        {catLoading ? (
          <SectionSkeleton />
        ) : categories.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No categories yet. Add one to get started.</p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                <div>
                  <span className="text-sm font-medium text-slate-800">{cat.name}</span>
                  <span className="ml-2 text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{cat.code}</span>
                  {cat.description && <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>}
                </div>
                <button
                  onClick={() => deleteCategory.mutate(cat.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                  disabled={deleteCategory.isPending}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Houses */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium text-slate-900">Student Houses</h2>
            <p className="text-xs text-slate-400 mt-0.5">Red House, Blue House, etc.</p>
          </div>
          <Button size="sm" onClick={() => { setShowHouseForm(true); setFormError(null); }}>
            + Add House
          </Button>
        </div>

        {houseLoading ? (
          <SectionSkeleton />
        ) : houses.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No houses yet. Add one to get started.</p>
        ) : (
          <div className="space-y-2">
            {houses.map((house) => (
              <div key={house.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  {house.color_hex && (
                    <div className="w-4 h-4 rounded-full border border-slate-200 flex-shrink-0" style={{ backgroundColor: house.color_hex }} />
                  )}
                  <div>
                    <span className="text-sm font-medium text-slate-800">{house.name}</span>
                    {house.description && <p className="text-xs text-slate-400 mt-0.5">{house.description}</p>}
                  </div>
                </div>
                <button
                  onClick={() => deleteHouse.mutate(house.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                  disabled={deleteHouse.isPending}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Category Form Dialog */}
      <Dialog open={showCategoryForm} onClose={() => setShowCategoryForm(false)}>
          <div className="p-6 w-full max-w-sm">
            <h3 className="font-semibold text-slate-900 mb-4">Add Category</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 font-medium">Name *</label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. General"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">Code *</label>
                <Input
                  value={categoryForm.code}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. GEN"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">Description</label>
                <Input
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCategoryForm(false)}>Cancel</Button>
                <Button
                  className="flex-1"
                  onClick={() => createCategory.mutate(categoryForm)}
                  disabled={!categoryForm.name || !categoryForm.code || createCategory.isPending}
                >
                  {createCategory.isPending ? 'Saving...' : 'Add Category'}
                </Button>
              </div>
            </div>
          </div>
      </Dialog>

      {/* House Form Dialog */}
      <Dialog open={showHouseForm} onClose={() => setShowHouseForm(false)}>
          <div className="p-6 w-full max-w-sm">
            <h3 className="font-semibold text-slate-900 mb-4">Add House</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 font-medium">Name *</label>
                <Input
                  value={houseForm.name}
                  onChange={(e) => setHouseForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Red House"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">Color</label>
                <div className="flex gap-2">
                  <Input
                    value={houseForm.color_hex}
                    onChange={(e) => setHouseForm((f) => ({ ...f, color_hex: e.target.value }))}
                    placeholder="#FF0000"
                    maxLength={7}
                  />
                  {houseForm.color_hex && (
                    <div className="w-10 h-10 rounded-lg border border-slate-200 flex-shrink-0" style={{ backgroundColor: houseForm.color_hex }} />
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">Description</label>
                <Input
                  value={houseForm.description}
                  onChange={(e) => setHouseForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowHouseForm(false)}>Cancel</Button>
                <Button
                  className="flex-1"
                  onClick={() => createHouse.mutate(houseForm)}
                  disabled={!houseForm.name || createHouse.isPending}
                >
                  {createHouse.isPending ? 'Saving...' : 'Add House'}
                </Button>
              </div>
            </div>
          </div>
      </Dialog>
    </div>
  );
}
