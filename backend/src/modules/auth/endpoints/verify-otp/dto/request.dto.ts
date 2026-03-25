import { IsString, IsUUID, IsNotEmpty, Matches, IsEnum } from 'class-validator';

export class VerifyOtpRequestDto {
  @IsUUID(4)
  user_id!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit number.' })
  otp!: string;

  @IsEnum(['2fa_login', 'password_reset', 'email_verify'])
  purpose!: '2fa_login' | 'password_reset' | 'email_verify';
}
