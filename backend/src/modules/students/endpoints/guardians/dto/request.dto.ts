import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsEnum,
  IsEmail,
  IsBoolean,
} from 'class-validator';

export class CreateGuardianDto {
  @IsEnum(['father', 'mother', 'guardian', 'other'])
  relation!: 'father' | 'mother' | 'guardian' | 'other';

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  aadhaar_no?: string;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @IsOptional()
  @IsBoolean()
  emergency_contact?: boolean;

  @IsOptional()
  @IsBoolean()
  create_portal_account?: boolean;
}

export class UpdateGuardianDto {
  @IsOptional()
  @IsEnum(['father', 'mother', 'guardian', 'other'])
  relation?: 'father' | 'mother' | 'guardian' | 'other';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  occupation?: string;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @IsOptional()
  @IsBoolean()
  emergency_contact?: boolean;
}
