import {
  IsUUID,
  IsInt,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class CreateTimetableSlotDto {
  @IsUUID()
  academic_year_id!: string;

  @IsUUID()
  class_section_id!: string;

  @IsUUID()
  timetable_period_id!: string;

  /** 1 = Monday, 2 = Tuesday, ..., 5 = Friday, 6 = Saturday, 7 = Sunday */
  @IsInt()
  @Min(1)
  @Max(7)
  day_of_week!: number;

  @IsOptional()
  @IsUUID()
  subject_id?: string;

  @IsOptional()
  @IsUUID()
  staff_id?: string;

  @IsOptional()
  @IsBoolean()
  is_free_period?: boolean;

  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @IsOptional()
  @IsDateString()
  effective_to?: string;
}

export class UpdateTimetableSlotDto {
  @IsOptional()
  @IsUUID()
  subject_id?: string | null;

  @IsOptional()
  @IsUUID()
  staff_id?: string | null;

  @IsOptional()
  @IsBoolean()
  is_free_period?: boolean;

  @IsOptional()
  @IsDateString()
  effective_from?: string | null;

  @IsOptional()
  @IsDateString()
  effective_to?: string | null;
}
