import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { StudentDocumentType } from '../../../entities/student-document.entity';

export class CreateStudentDocumentDto {
  @IsEnum(StudentDocumentType)
  document_type!: StudentDocumentType;

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

export class UpdateStudentDocumentDto {
  @IsOptional()
  @IsEnum(StudentDocumentType)
  document_type?: StudentDocumentType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
