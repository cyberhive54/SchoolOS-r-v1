import { IsString, IsOptional, IsUUID, IsEmail, IsIn, IsDateString, MaxLength, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name!: string;

  @IsString()
  @MaxLength(50)
  employee_id!: string;

  @IsString()
  @MaxLength(15)
  phone!: string;

  @IsDateString()
  join_date!: string;

  @IsIn(['permanent', 'contractual', 'part_time', 'probation'])
  employment_type!: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  blood_group?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  alternate_phone?: string;

  @IsOptional()
  @IsEmail()
  personal_email?: string;

  @IsOptional()
  @IsUUID()
  department_id?: string;

  @IsOptional()
  @IsUUID()
  designation_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  salary_grade?: string;

  @IsOptional()
  @IsEmail()
  login_email?: string;

  @IsOptional()
  @IsIn(['teacher', 'admin', 'accountant', 'receptionist'])
  login_role?: string;
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  alternate_phone?: string;

  @IsOptional()
  @IsEmail()
  personal_email?: string;

  @IsOptional()
  @IsUUID()
  department_id?: string | null;

  @IsOptional()
  @IsUUID()
  designation_id?: string | null;

  @IsOptional()
  @IsDateString()
  join_date?: string;

  @IsOptional()
  @IsIn(['permanent', 'contractual', 'part_time', 'probation'])
  employment_type?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'resigned', 'terminated'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  salary_grade?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  blood_group?: string;
}

export class ListStaffQueryDto {
  page?: number;
  per_page?: number;
  q?: string;
  filter?: {
    department_id?: string;
    designation_id?: string;
    status?: string;
    employment_type?: string;
  };
  sort?: string;
  order?: 'ASC' | 'DESC';
}
