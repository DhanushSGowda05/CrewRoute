import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RidesService } from './rides.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateRideDto } from './dto/create-ride.dto';
import { JoinRideDto } from './dto/join-ride.dto';

@Controller('rides')
@UseGuards(ClerkAuthGuard)
export class RidesController {
  constructor(private ridesService: RidesService) { }

  /**
   * Create a new ride
   * POST /api/rides
   */
  @Post()
  async createRide(@CurrentUser('id') userId: string, @Body() dto: CreateRideDto) {
    return this.ridesService.createRide(userId, dto);
  }

  /**
   * Join a ride by code
   * POST /api/rides/join
   */
  @Post('join')
  async joinRide(@CurrentUser('id') userId: string, @Body() dto: JoinRideDto) {
    return this.ridesService.joinRide(userId, dto.rideCode);
  }

  /**
   * Get ride details
   * GET /api/rides/:id
   */
  @Get(':id')
  async getRide(@Param('id') rideId: string, @CurrentUser('id') userId: string) {
    return this.ridesService.getRide(rideId, userId);
  }

  /**
   * List my rides
   * GET /api/rides?status=ACTIVE
   */
  @Get()
  async listMyRides(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    console.log("🚀 /api/rides HIT by user:", userId);
    console.log("🔎 Status filter:", status);

    return this.ridesService.listMyRides(userId, status);
  }

  /**
   * Start ride (owner only)
   * POST /api/rides/:id/start
   */
  @Post(':id/start')
  async startRide(@Param('id') rideId: string, @CurrentUser('id') userId: string) {
    return this.ridesService.startRide(rideId, userId);
  }

  /**
   * Complete ride (owner only)
   * POST /api/rides/:id/complete
   */
  @Post(':id/complete')
  async completeRide(@Param('id') rideId: string, @CurrentUser('id') userId: string) {
    return this.ridesService.completeRide(rideId, userId);
  }

  /**
   * Cancel ride (owner only)
   * POST /api/rides/:id/cancel
   */
  @Post(':id/cancel')
  async cancelRide(@Param('id') rideId: string, @CurrentUser('id') userId: string) {
    return this.ridesService.cancelRide(rideId, userId);
  }

  /**
   * Leave ride (participant only)
   * DELETE /api/rides/:id/leave
   */
  @Delete(':id/leave')
  async leaveRide(@Param('id') rideId: string, @CurrentUser('id') userId: string) {
    return this.ridesService.leaveRide(rideId, userId);
  }
}