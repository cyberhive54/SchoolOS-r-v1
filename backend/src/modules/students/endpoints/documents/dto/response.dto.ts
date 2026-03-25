import type { StudentDocumentType } from '../../../entities/student-document.entity';

export interface StudentDocumentDto {
  id: string;
  school_id: string;
  student_id: string;
  document_type: StudentDocumentType;
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
