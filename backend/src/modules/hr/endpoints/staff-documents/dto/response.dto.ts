import type { StaffDocumentType } from '../../../entities/staff-document.entity';

export interface StaffDocumentDto {
  id: string;
  school_id: string;
  staff_id: string;
  document_type: StaffDocumentType;
  title: string;
  file_url: string;
  file_name: string;
  file_size_kb: number | null;
  mime_type: string | null;
  uploaded_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
