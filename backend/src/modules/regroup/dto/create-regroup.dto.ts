import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateRegroupDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

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
}