'use client';

import { useRouter } from 'next/navigation';
import { BookOpen, Calendar, Layout, Users, BookMarked, Layers, GraduationCap, UserCheck } from 'lucide-react';

const ACADEMIC_MODULES = [
  { label: 'Academic Years', desc: 'Manage sessions (2025-26, 2026-27)', href: '/academics/years', icon: Calendar, color: 'bg-blue-50 text-blue-600' },
  { label: 'Classes', desc: 'Grade levels and class names', href: '/academics/classes', icon: Layers, color: 'bg-violet-50 text-violet-600' },
  { label: 'Sections', desc: 'Section labels (A, B, C)', href: '/academics/sections', icon: Layout, color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Class-Sections', desc: 'Assign classes to sections per year', href: '/academics/class-sections', icon: Users, color: 'bg-orange-50 text-orange-600' },
  { label: 'Subjects', desc: 'Manage school subjects', href: '/academics/subjects', icon: BookOpen, color: 'bg-pink-50 text-pink-600' },
  { label: 'Subject Groups', desc: 'Science, Commerce, Arts streams', href: '/academics/subject-groups', icon: BookMarked, color: 'bg-amber-50 text-amber-600' },
  { label: 'Teacher Assignments', desc: 'Assign subject teachers to class-sections', href: '/academics/assignments', icon: UserCheck, color: 'bg-teal-50 text-teal-600' },
  { label: 'Student Promotion', desc: 'Bulk promote or detain students at year-end', href: '/academics/promotion', icon: GraduationCap, color: 'bg-rose-50 text-rose-600' },
];

export default function AcademicsPage() {
  const router = useRouter();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Academics</h1>
        <p className="text-slate-500 mt-1">Manage academic structure — years, classes, sections, subjects</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACADEMIC_MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.href}
              onClick={() => router.push(mod.href)}
              className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all text-left group"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${mod.color}`}>
                <Icon size={20} />
              </div>
              <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{mod.label}</p>
              <p className="text-sm text-slate-500 mt-0.5">{mod.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
