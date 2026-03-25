export interface TimetablePeriodDto {
  id: string;
  school_id: string;
  academic_year_id: string;
  name: string;
  period_number: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
