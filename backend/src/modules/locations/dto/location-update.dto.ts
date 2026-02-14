import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class LocationUpdateDto {
  @IsNotEmpty()
  @IsString()
  rideId!: string;

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
  @IsNumber()
  @Min(0)
  speed?: number; // meters per second

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number; // degrees (0-360)

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number; // meters

  @IsOptional()
  @IsNumber()
  timestamp?: number; // Unix timestamp
}