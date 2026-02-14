import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TriggerAlertDto, AlertType } from './dto/trigger-alert.dto';

@Injectable()
export class EmergencyService {
  constructor(private prisma: PrismaService) { }

  /**
   * Trigger emergency alert
   */
  async triggerAlert(userId: string, rideId: string, dto: TriggerAlertDto) {
    // 1. Verify ride exists
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // 2. Verify user is participant
    const participant = await this.prisma.rideParticipant.findUnique({
      where: {
        rideId_userId: {
          rideId,
          userId,
        },
      },
    });

    if (!participant || participant.leftAt) {
      throw new ForbiddenException('You are not part of this ride');
    }

    // 3. Check ride is active
    if (ride.status !== 'ACTIVE') {
      throw new BadRequestException('Can only trigger alerts during active rides');
    }

    // 4. Get user details
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // 5. Create alert in database
    const alert = await this.prisma.emergencyAlert.create({
      data: {
        rideId,
        userId,
        alertType: dto.alertType,
        latitude: dto.latitude,
        longitude: dto.longitude,
        message: dto.message,
        status: 'ACTIVE',
      },
    });

    console.log(`🚨 Emergency alert triggered: ${dto.alertType} by ${user?.username || 'Unknown'}`);

    return {
      alert: {
        id: alert.id,
        alertType: alert.alertType,
        userId: alert.userId,
        username: user?.username || 'Unknown',
        location: {
          latitude: Number(alert.latitude),
          longitude: Number(alert.longitude),
        },
        message: alert.message,
        status: alert.status,
        triggeredAt: alert.triggeredAt,
      },
    };
  }

  /**
   * Get all alerts for a ride
   */
  async getRideAlerts(rideId: string, userId: string) {
    // 1. Verify user is participant
    const participant = await this.prisma.rideParticipant.findUnique({
      where: {
        rideId_userId: {
          rideId,
          userId,
        },
      },
    });

    if (!participant || participant.leftAt) {
      throw new ForbiddenException('You are not part of this ride');
    }

    // 2. Get all alerts for this ride
    const alerts = await this.prisma.emergencyAlert.findMany({
      where: { rideId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { triggeredAt: 'desc' },
    });

    return alerts.map((alert) => ({
      id: alert.id,
      alertType: alert.alertType,
      userId: alert.user.id,
      username: alert.user.username,
      location: {
        latitude: Number(alert.latitude),
        longitude: Number(alert.longitude),
      },
      message: alert.message,
      status: alert.status,
      triggeredAt: alert.triggeredAt,
      resolvedAt: alert.resolvedAt,
      resolvedBy: alert.resolvedBy,
    }));
  }

  /**
   * Resolve emergency alert
   */
  async resolveAlert(alertId: string, userId: string) {
    // 1. Get alert
    const alert = await this.prisma.emergencyAlert.findUnique({
      where: { id: alertId },
      include: {
        ride: {
          include: {
            participants: {
              where: { leftAt: null },
            },
          },
        },
      },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    // 2. Check user is participant in this ride
    const isParticipant = alert.ride.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not part of this ride');
    }

    // 3. Check alert is not already resolved
    if (alert.status === 'RESOLVED') {
      throw new BadRequestException('Alert already resolved');
    }

    // 4. Resolve alert
    const resolvedAlert = await this.prisma.emergencyAlert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });

    const resolver = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    console.log(`✅ Alert ${alertId} resolved by ${resolver?.username || 'Unknown'}`);
    return {
      alert: {
        id: resolvedAlert.id,
        status: resolvedAlert.status,
        resolvedAt: resolvedAlert.resolvedAt,
        resolvedBy: resolver?.username || 'Unknown',
      },
      message: 'Alert resolved successfully',
    };
  }

  /**
   * Get alert by ID (for WebSocket broadcasting)
   */
  async getAlertById(alertId: string) {
    const alert = await this.prisma.emergencyAlert.findUnique({
      where: { id: alertId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!alert) {
      return null;
    }

    return {
      id: alert.id,
      alertType: alert.alertType,
      userId: alert.user.id,
      username: alert.user.username,
      latitude: Number(alert.latitude),
      longitude: Number(alert.longitude),
      message: alert.message,
      triggeredAt: alert.triggeredAt,
    };
  }
}