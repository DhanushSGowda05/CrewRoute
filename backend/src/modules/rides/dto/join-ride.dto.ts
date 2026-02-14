import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class JoinRideDto {
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'Ride code must be exactly 6 characters' })
  @Matches(/^[BCDFGHJKLMNPQRSTVWXYZ23456789]+$/, {
    message: 'Invalid ride code format',
  })
  rideCode!: string;
}