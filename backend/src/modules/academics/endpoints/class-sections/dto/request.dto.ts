import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateClassSectionDto {
  @IsUUID()
  class_id!: string;

  @IsUUID()
  section_id!: string;

  @IsUUID()
  academic_year_id!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  room_no?: string;
}

export class UpdateClassSectionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  room_no?: string;
}
