export interface ClassSectionDto {
  id: string;
  school_id: string;
  class_id: string;
  section_id: string;
  academic_year_id: string;
  capacity: number | null;
  room_no: string | null;
  class_name?: string;
  section_name?: string;
  academic_year_name?: string;
  class_teacher?: {
    user_id: string;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}
