import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class GetRouteDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^-?\d+(\.\d+)?$/, { message: 'originLat must be a valid number' })
  originLat!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^-?\d+(\.\d+)?$/, { message: 'originLng must be a valid number' })
  originLng!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^-?\d+(\.\d+)?$/, { message: 'destLat must be a valid number' })
  destLat!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^-?\d+(\.\d+)?$/, { message: 'destLng must be a valid number' })
  destLng!: string;

  @IsOptional()
  @IsString()
  waypointsStr?: string; // Format: "lat1,lng1|lat2,lng2"
}