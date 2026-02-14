import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRegroupDto } from './dto/create-regroup.dto';

@Injectable()
export class RegroupService {
  constructor(private prisma: PrismaService) { }

  /**
 * Create regroup point (owner only)
 */
  async createRegroupPoint(userId: string, rideId: string, dto: CreateRegroupDto) {
    // 1. Verify ride exists
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // 2. Verify user is owner
    if (ride.ownerId !== userId) {
      throw new ForbiddenException('Only ride owner can create regroup points');
    }

    // 3. Check ride is active
    if (ride.status !== 'ACTIVE') {
      throw new BadRequestException('Can only create regroup points during active rides');
    }

    // 4. Create regroup point
    const regroupPoint = await this.prisma.regroupPoint.create({
      data: {
        rideId,
        name: dto.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        createdBy: userId,
        isActive: true,
      },
    });

    console.log(`📍 Regroup point created: ${dto.name} for ride ${rideId}`);

    return {
      regroupPoint: {
        id: regroupPoint.id,
        name: regroupPoint.name,
        location: {
          latitude: Number(regroupPoint.latitude),
          longitude: Number(regroupPoint.longitude),
        },
        isActive: regroupPoint.isActive,
        waitUntilAll: regroupPoint.waitUntilAll,
        arrivedCount: 0,
        createdAt: regroupPoint.createdAt,
      },
    };
  }
  /**
 * Get all regroup points for a ride
 */
  async getRegroupPoints(rideId: string, userId: string) {
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

    // 2. Get all regroup points
    const regroupPoints = await this.prisma.regroupPoint.findMany({
      where: { rideId },
      orderBy: { createdAt: 'desc' },
    });

    return regroupPoints.map((point) => ({
      id: point.id,
      name: point.name,
      location: {
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
      },
      isActive: point.isActive,
      waitUntilAll: point.waitUntilAll,
      arrivedRiders: (point.arrivedRiders as string[]) || [],
      createdAt: point.createdAt,
      completedAt: point.completedAt,
    }));
  }
  /**
   * Mark rider as arrived at regroup point
   */
  /**
 * Mark rider as arrived at regroup point
 */
  async markArrived(regroupId: string, userId: string) {
    // 1. Get regroup point
    const regroupPoint = await this.prisma.regroupPoint.findUnique({
      where: { id: regroupId },
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

    if (!regroupPoint) {
      throw new NotFoundException('Regroup point not found');
    }

    // 2. Verify user is participant
    const isParticipant = regroupPoint.ride.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not part of this ride');
    }

    // 3. Check if active
    if (!regroupPoint.isActive) {
      throw new BadRequestException('Regroup point already completed');
    }

    // 4. Add user to arrivedRiders if not already there
    const arrivedRiders = (regroupPoint.arrivedRiders as string[]) || [];
    if (arrivedRiders.includes(userId)) {
      throw new BadRequestException('You have already marked arrival');
    }

    arrivedRiders.push(userId);

    const updatedPoint = await this.prisma.regroupPoint.update({
      where: { id: regroupId },
      data: {
        arrivedRiders,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    console.log(`✅ ${user?.username || 'User'} arrived at regroup point: ${regroupPoint.name}`);

    // Get total participant count
    const totalParticipants = regroupPoint.ride.participants.length;
    const arrivedCount = arrivedRiders.length;

    return {
      regroupPoint: {
        id: updatedPoint.id,
        name: updatedPoint.name,
        arrivedRiders: arrivedRiders,
        arrivedCount,
        totalParticipants,
        allArrived: arrivedCount === totalParticipants,
      },
      message: 'Arrival marked successfully',
    };
  }

  /**
 * Mark regroup point as complete (owner only)
 */
  async completeRegroupPoint(regroupId: string, userId: string) {
    // 1. Get regroup point
    const regroupPoint = await this.prisma.regroupPoint.findUnique({
      where: { id: regroupId },
      include: {
        ride: true,
      },
    });

    if (!regroupPoint) {
      throw new NotFoundException('Regroup point not found');
    }

    // 2. Verify user is owner
    if (regroupPoint.ride.ownerId !== userId) {
      throw new ForbiddenException('Only ride owner can complete regroup points');
    }

    // 3. Check if active
    if (!regroupPoint.isActive) {
      throw new BadRequestException('Regroup point already completed');
    }

    // 4. Mark as completed
    const updatedPoint = await this.prisma.regroupPoint.update({
      where: { id: regroupId },
      data: {
        isActive: false,
        completedAt: new Date(),
      },
    });

    console.log(`✅ Regroup point completed: ${regroupPoint.name}`);

    return {
      regroupPoint: {
        id: updatedPoint.id,
        isActive: updatedPoint.isActive,
        completedAt: updatedPoint.completedAt,
      },
      message: 'Regroup point completed successfully',
    };
  }
}