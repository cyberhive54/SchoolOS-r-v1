export interface TimetableSlotDto {
  id: string;
  school_id: string;
  academic_year_id: string;
  class_section_id: string;
  timetable_period_id: string;
  day_of_week: number;
  subject_id: string | null;
  staff_id: string | null;
  is_free_period: boolean;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}
