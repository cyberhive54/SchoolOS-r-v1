export interface StudentSiblingDto {
  id: string;
  school_id: string;
  student_id: string;
  sibling_id: string;
  created_at: string;
}

/** Sibling with basic student info for display */
export interface StudentSiblingDetailDto {
  id: string;
  sibling_id: string;
  first_name: string;
  last_name: string;
  admission_no: string;
  created_at: string;
}
