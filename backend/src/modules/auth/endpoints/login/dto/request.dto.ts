import { IsString, IsNotEmpty, IsEnum, MinLength, MaxLength } from 'class-validator';
import type { IdentifierType } from '@schoolos/types';

export class LoginRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier!: string;

  @IsEnum(['email', 'phone', 'student_id', 'admission_no', 'staff_id', 'staff_no', 'parent_id'])
  identifier_type!: IdentifierType;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}
