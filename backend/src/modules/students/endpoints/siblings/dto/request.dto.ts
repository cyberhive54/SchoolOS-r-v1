import { IsUUID } from 'class-validator';

export class LinkSiblingDto {
  @IsUUID()
  sibling_id!: string;
}
