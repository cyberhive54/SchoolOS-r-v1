import type { OtpChannel } from '@schoolos/types';

export interface LoginResponseDto {
  message: string;
  otp_sent: boolean;
  user_id: string;
  channel: OtpChannel;
}
