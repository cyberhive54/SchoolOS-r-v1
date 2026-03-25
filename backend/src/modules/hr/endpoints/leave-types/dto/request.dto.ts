import { IsString, IsOptional, IsBoolean, IsInt, IsIn, MaxLength, MinLength, Min } from 'class-validator';

export class CreateLeaveTypeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(10)
  code!: string;

  @IsInt()
  @Min(0)
  max_days_per_year!: number;

  @IsOptional()
  @IsBoolean()
  is_paid?: boolean;

  @IsOptional()
  @IsBoolean()
  carry_forward?: boolean;

  @IsOptional()
  @IsIn(['all', 'teaching', 'non_teaching'])
  applicable_to?: string;
}

export class UpdateLeaveTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  max_days_per_year?: number;

  @IsOptional()
  @IsBoolean()
  is_paid?: boolean;

  @IsOptional()
  @IsBoolean()
  carry_forward?: boolean;

  @IsOptional()
  @IsIn(['all', 'teaching', 'non_teaching'])
  applicable_to?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
