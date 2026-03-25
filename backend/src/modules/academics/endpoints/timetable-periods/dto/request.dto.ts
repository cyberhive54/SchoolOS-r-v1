import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { IsUUID } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateTimetablePeriodDto {
  @IsUUID()
  academic_year_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  period_number!: number;

  @IsString()
  @Matches(TIME_REGEX, { message: 'start_time must be HH:MM (24-hr format)' })
  start_time!: string;

  @IsString()
  @Matches(TIME_REGEX, { message: 'end_time must be HH:MM (24-hr format)' })
  end_time!: string;

  @IsOptional()
  @IsBoolean()
  is_break?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateTimetablePeriodDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  period_number?: number;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'start_time must be HH:MM (24-hr format)' })
  start_time?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'end_time must be HH:MM (24-hr format)' })
  end_time?: string;

  @IsOptional()
  @IsBoolean()
  is_break?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
