import { IsUUID, IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  class_section_id!: string;

  @IsUUID()
  academic_year_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  roll_number?: string;
}

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  roll_number?: string;

  @IsOptional()
  @IsUUID()
  class_section_id?: string;

  @IsOptional()
  @IsEnum(['active', 'transferred', 'promoted', 'detained'])
  status?: 'active' | 'transferred' | 'promoted' | 'detained';
}
