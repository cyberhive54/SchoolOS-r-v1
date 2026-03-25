import { IsString, IsUUID, IsDateString, IsOptional, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceRecordDto {
  @IsUUID()
  staff_id!: string;

  @IsIn(['present', 'absent', 'half_day', 'on_leave', 'holiday'])
  status!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsUUID()
  leave_request_id?: string;
}

export class BulkMarkAttendanceDto {
  @IsDateString()
  date!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records!: AttendanceRecordDto[];
}

export class ListAttendanceQueryDto {
  page?: number;
  per_page?: number;
  filter?: {
    date?: string;
    date_gte?: string;
    date_lte?: string;
    staff_id?: string;
    status?: string;
  };
}

export class AttendanceSummaryQueryDto {
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @IsUUID()
  staff_id?: string;
}
