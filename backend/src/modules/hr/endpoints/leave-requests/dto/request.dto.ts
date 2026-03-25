import { IsString, IsUUID, IsDateString, IsOptional, MinLength } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsUUID()
  leave_type_id!: string;

  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;

  @IsString()
  @MinLength(5)
  reason!: string;

  @IsOptional()
  @IsUUID()
  staff_id?: string;
}

export class ReviewLeaveRequestDto {
  @IsOptional()
  @IsString()
  note?: string;
}

export class ListLeaveRequestsQueryDto {
  page?: number;
  per_page?: number;
  filter?: {
    staff_id?: string;
    status?: string;
    leave_type_id?: string;
    date_from?: string;
    date_to?: string;
  };
}
