import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';

export type SubjectType = 'core' | 'elective' | 'activity';

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;

  @IsOptional()
  @IsEnum(['core', 'elective', 'activity'])
  type?: SubjectType;
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code?: string;

  @IsOptional()
  @IsEnum(['core', 'elective', 'activity'])
  type?: SubjectType;
}
