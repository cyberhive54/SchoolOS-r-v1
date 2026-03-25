import type { SubjectType } from './request.dto';

export interface SubjectDto {
  id: string;
  school_id: string;
  name: string;
  code: string;
  type: SubjectType;
  created_at: string;
  updated_at: string;
}
