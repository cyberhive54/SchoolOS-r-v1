import { IsString, IsNotEmpty, IsOptional, MaxLength, IsBoolean, Matches } from 'class-validator';

export class CreateHouseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color_hex must be a valid hex color e.g. #FF0000' })
  color_hex?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateHouseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color_hex must be a valid hex color e.g. #FF0000' })
  color_hex?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
