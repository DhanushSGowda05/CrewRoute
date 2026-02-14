import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class CoordinatesDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsString()
  address?: string;
}

class WaypointDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

export class CreateRideDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  pickup!: CoordinatesDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  destination!: CoordinatesDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaypointDto)
  waypoints?: WaypointDto[];

  @IsOptional()
  @IsString()
  rideName?: string;
}