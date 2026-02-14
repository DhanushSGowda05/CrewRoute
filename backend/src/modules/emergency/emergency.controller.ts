import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EmergencyService } from './emergency.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TriggerAlertDto } from './dto/trigger-alert.dto';
import { LocationsGateway } from '../locations/locations.gateway';

@Controller()
@UseGuards(ClerkAuthGuard)
export class EmergencyController {
  constructor(
    private emergencyService: EmergencyService,
    private locationsGateway: LocationsGateway,
  ) {}

  /**
   * Trigger emergency alert
   * POST /api/rides/:rideId/emergency
   */
  @Post('rides/:rideId/emergency')
  async triggerAlert(
    @Param('rideId') rideId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: TriggerAlertDto,
  ) {
    const result = await this.emergencyService.triggerAlert(userId, rideId, dto);

    // Broadcast SOS to all riders in the ride via WebSocket
    await this.locationsGateway.broadcastSOS(rideId, result.alert);

    return result;
  }

  /**
   * Get all alerts for a ride
   * GET /api/rides/:rideId/emergency
   */
  @Get('rides/:rideId/emergency')
  async getRideAlerts(
    @Param('rideId') rideId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.emergencyService.getRideAlerts(rideId, userId);
  }

  /**
   * Resolve emergency alert
   * PATCH /api/emergency/:alertId/resolve
   */
  @Patch('emergency/:alertId/resolve')
  async resolveAlert(
    @Param('alertId') alertId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.emergencyService.resolveAlert(alertId, userId);
  }
}