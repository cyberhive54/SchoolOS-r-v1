import { IsUUID, IsArray, ArrayMinSize, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PromotionItemDto {
  @IsUUID()
  student_id!: string;

  @IsUUID()
  from_class_section_id!: string;

  @IsUUID()
  to_class_section_id!: string;

  @IsIn(['promoted', 'detained', 'transferred_out'])
  status!: 'promoted' | 'detained' | 'transferred_out';
}

export class BulkPromoteDto {
  @IsUUID()
  from_academic_year_id!: string;

  @IsUUID()
  to_academic_year_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PromotionItemDto)
  promotions!: PromotionItemDto[];
}
