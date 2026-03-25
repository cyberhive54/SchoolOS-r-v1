import { IsString, IsOptional, IsUUID, IsBoolean, IsInt, MaxLength, MinLength, Min } from 'class-validator';

export class CreateDesignationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsUUID()
  department_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @IsOptional()
  @IsBoolean()
  is_teaching_staff?: boolean;
}

export class UpdateDesignationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUUID()
  department_id?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number | null;

  @IsOptional()
  @IsBoolean()
  is_teaching_staff?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
