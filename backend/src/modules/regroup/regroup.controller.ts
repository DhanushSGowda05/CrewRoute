import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RegroupService } from './regroup.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateRegroupDto } from './dto/create-regroup.dto';

@Controller()
@UseGuards(ClerkAuthGuard)
export class RegroupController {
  constructor(private regroupService: RegroupService) {}

  /**
   * Create regroup point
   * POST /api/rides/:rideId/regroup
   */
  @Post('rides/:rideId/regroup')
  async createRegroupPoint(
    @Param('rideId') rideId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRegroupDto,
  ) {
    return this.regroupService.createRegroupPoint(userId, rideId, dto);
  }

  /**
   * Get all regroup points for a ride
   * GET /api/rides/:rideId/regroup
   */
  @Get('rides/:rideId/regroup')
  async getRegroupPoints(
    @Param('rideId') rideId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.regroupService.getRegroupPoints(rideId, userId);
  }

  /**
   * Mark yourself as arrived
   * PATCH /api/regroup/:regroupId/arrive
   */
  @Patch('regroup/:regroupId/arrive')
  async markArrived(
    @Param('regroupId') regroupId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.regroupService.markArrived(regroupId, userId);
  }

  /**
   * Complete regroup point (owner only)
   * PATCH /api/regroup/:regroupId/complete
   */
  @Patch('regroup/:regroupId/complete')
  async completeRegroupPoint(
    @Param('regroupId') regroupId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.regroupService.completeRegroupPoint(regroupId, userId);
  }
}