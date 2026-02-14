import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { AlertType } from '@prisma/client';  // ← Import from Prisma instead

export { AlertType };  // ← Re-export so others can use it

export class TriggerAlertDto {
  @IsNotEmpty()
  @IsEnum(AlertType)
  alertType!: AlertType;

  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}