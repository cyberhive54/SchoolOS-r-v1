import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsEnum,
  IsDateString,
  IsUUID,
  IsObject,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class EnrollmentDto {
  @IsUUID()
  academic_year_id!: string;

  @IsUUID()
  class_section_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  roll_number?: string;
}

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  admission_no!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middle_name?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name!: string;

  @IsDateString()
  date_of_birth!: string;

  @IsEnum(['male', 'female', 'other'])
  gender!: 'male' | 'female' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(5)
  blood_group?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  religion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  caste?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  aadhaar_no?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsUUID()
  house_id?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EnrollmentDto)
  enrollment?: EnrollmentDto;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middle_name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(5)
  blood_group?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  religion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  caste?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  aadhaar_no?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsUUID()
  house_id?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'transferred_out', 'alumni'])
  status?: 'active' | 'inactive' | 'transferred_out' | 'alumni';
}

export class ListStudentsQueryDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  per_page?: number;

  @IsOptional()
  q?: string;

  @IsOptional()
  sort?: string;

  @IsOptional()
  order?: 'ASC' | 'DESC';

  @IsOptional()
  filter?: {
    class_section_id?: string;
    academic_year_id?: string;
    category_id?: string;
    gender?: string;
    status?: string;
  };
}
