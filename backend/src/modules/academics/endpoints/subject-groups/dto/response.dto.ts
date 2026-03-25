import type { SubjectDto } from '../../subjects/dto/response.dto';

export interface SubjectGroupDto {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  subjects?: SubjectDto[];
  created_at: string;
  updated_at: string;
}
