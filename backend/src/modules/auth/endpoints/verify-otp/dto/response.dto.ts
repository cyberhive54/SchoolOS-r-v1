import type { UserRole } from '@schoolos/types';

export interface VerifyOtpUserDto {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

export interface VerifyOtpResponseDto {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: VerifyOtpUserDto;
}
