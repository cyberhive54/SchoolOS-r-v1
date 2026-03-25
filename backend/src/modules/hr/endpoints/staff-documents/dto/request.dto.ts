import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';
import { StaffDocumentType } from '../../../entities/staff-document.entity';

export class CreateStaffDocumentDto {
  @IsEnum(StaffDocumentType)
  document_type!: StaffDocumentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  file_url!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  file_name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  file_size_kb?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mime_type?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateStaffDocumentDto {
  @IsOptional()
  @IsEnum(StaffDocumentType)
  document_type?: StaffDocumentType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
