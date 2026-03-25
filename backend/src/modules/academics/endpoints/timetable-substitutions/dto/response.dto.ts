export interface TimetableSubstitutionDto {
  id: string;
  school_id: string;
  date: string;
  slot_id: string;
  absent_staff_id: string;
  substitute_staff_id: string | null;
  reason: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
