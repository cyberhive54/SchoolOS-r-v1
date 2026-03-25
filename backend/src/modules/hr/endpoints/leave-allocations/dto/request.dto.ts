import { IsUUID, IsInt, IsOptional, Min } from 'class-validator';

export class BulkAllocateDto {
  @IsUUID()
  academic_year_id!: string;
}

export class UpdateAllocationDto {
  @IsInt()
  @Min(0)
  allocated_days!: number;
}

export class ListAllocationsQueryDto {
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;
}
