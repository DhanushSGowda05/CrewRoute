import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  IsEnum,
} from 'class-validator';

/**
 * Supported Nearby Place Types
 * Extend this enum as your app grows
 */
export enum NearbyPlaceType {
  GAS_STATION = 'gas_station',
  RESTAURANT = 'restaurant',
  HOSPITAL = 'hospital',
  CAR_REPAIR = 'car_repair',
  ATM = 'atm',
  PHARMACY = 'pharmacy',
  CAFE = 'cafe',
  LODGING = 'lodging',
  PARKING = 'parking',
  SHOPPING_MALL = 'shopping_mall', // ✅ Added
}

/**
 * DTO for Nearby Search
 */
export class SearchPlacesDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^-?\d+(\.\d+)?$/, {
    message: 'lat must be a valid number',
  })
  lat!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^-?\d+(\.\d+)?$/, {
    message: 'lng must be a valid number',
  })
  lng!: string;

  @IsNotEmpty()
  @IsEnum(NearbyPlaceType, {
    message: `type must be one of: ${Object.values(NearbyPlaceType).join(', ')}`,
  })
  type!: NearbyPlaceType;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, {
    message: 'radius must be a valid number',
  })
  radius?: string; // Default handled in controller/service
}
