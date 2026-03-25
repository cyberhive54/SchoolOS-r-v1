import {
  IsUUID,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTimetableSubstitutionDto {
  @IsDateString()
  date!: string;

  @IsUUID()
  slot_id!: string;

  @IsUUID()
  absent_staff_id!: string;

  @IsOptional()
  @IsUUID()
  substitute_staff_id?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateTimetableSubstitutionDto {
  @IsOptional()
  @IsUUID()
  substitute_staff_id?: string | null;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
