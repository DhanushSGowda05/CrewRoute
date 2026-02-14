import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { MapsService } from '../maps/maps.service';
import { LocationsGateway } from '../locations/locations.gateway';  // ← ADDED
import { CreateRideDto } from './dto/create-ride.dto';
import { generateUniqueRideCode } from './utils/ride-code.generator';

@Injectable()
export class RidesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private mapsService: MapsService,
    private locationsGateway: LocationsGateway,  // ← ADDED
  ) { }

  /**
   * Create a new ride
   */
  async createRide(userId: string, dto: CreateRideDto) {
    // 1. Get route from Ola Maps
    console.log('🗺️  Calculating route...');
    const route = await this.mapsService.getRoute(
      { lat: dto.pickup.lat, lng: dto.pickup.lng },
      { lat: dto.destination.lat, lng: dto.destination.lng },
      dto.waypoints,
    );

    // 2. Generate unique ride code
    const rideCode = await generateUniqueRideCode(this.prisma);
    console.log(`✅ Generated ride code: ${rideCode}`);

    // 3. Create ride in database (with transaction)
    const ride = await this.prisma.$transaction(async (tx) => {
      // Create ride
      const newRide = await tx.ride.create({
        data: {
          rideCode,
          ownerId: userId,
          pickupLat: dto.pickup.lat,
          pickupLng: dto.pickup.lng,
          pickupAddress: dto.pickup.address,
          destinationLat: dto.destination.lat,
          destinationLng: dto.destination.lng,
          destinationAddress: dto.destination.address,
          rideName: dto.rideName,
          routePolyline: route.polyline,
          routeDistance: route.distanceMeters,
          routeDuration: route.durationSeconds,
          status: 'CREATED',
        },
      });

      // Add owner as participant
      await tx.rideParticipant.create({
        data: {
          rideId: newRide.id,
          userId: userId,
          role: 'owner',
        },
      });

      return newRide;
    });

    // 4. Cache ride code in Redis
    await this.redis.cacheRideCode(rideCode, ride.id);

    // 5. Cache ride state in Redis
    await this.redis.setRideState(ride.id, {
      status: 'CREATED',
      ownerId: userId,
      participantIds: [userId],
      rideCode,
      routePolyline: route.polyline,
    });

    // 6. Get participants
    const participants = await this.prisma.rideParticipant.findMany({
      where: { rideId: ride.id },
      include: { user: { select: { id: true, username: true } } },
    });

    console.log(`✅ Ride created: ${rideCode}`);

    return {
      ride: {
        ...ride,
        route: {
          distance: route.distance,
          duration: route.duration,
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          polyline: route.polyline,
        },
      },
      participants: participants.map((p) => ({
        userId: p.user.id,
        username: p.user.username,
        role: p.role,
        joinedAt: p.joinedAt,
      })),
    };
  }

  /**
   * Join a ride by code
   */
  async joinRide(userId: string, rideCode: string) {
    // 1. Check Redis cache first
    let rideId = await this.redis.getRideIdByCode(rideCode);

    // 2. If not in cache, query database
    if (!rideId) {
      const ride = await this.prisma.ride.findUnique({
        where: { rideCode: rideCode.toUpperCase() },
      });

      if (!ride) {
        throw new NotFoundException('Ride not found or code expired');
      }

      rideId = ride.id;
      // Cache it for next time
      await this.redis.cacheRideCode(rideCode, rideId);
    }

    // 3. Get ride details
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // 4. Validate ride status
    if (ride.status === 'COMPLETED') {
      throw new BadRequestException('Ride already completed');
    }

    if (ride.status === 'CANCELLED') {
      throw new BadRequestException('Ride was cancelled');
    }

    // 5. Check if user already in ride
    const existingParticipant = ride.participants.find((p) => p.userId === userId);
    if (existingParticipant) {
      throw new ConflictException('You are already in this ride');
    }

    // 6. Check participant limit (max 20)
    const activeParticipants = ride.participants.filter((p) => !p.leftAt);
    if (activeParticipants.length >= 20) {
      throw new BadRequestException('Ride is full (maximum 20 participants)');
    }

    // 7. Add user to ride
    await this.prisma.rideParticipant.create({
      data: {
        rideId: ride.id,
        userId: userId,
        role: 'participant',
      },
    });

    // 8. Update Redis cache
    const rideState = await this.redis.getRideState(ride.id);
    if (rideState) {
      rideState.participantIds.push(userId);
      await this.redis.setRideState(ride.id, rideState);
    }

    // 9. Get updated participants
    const participants = await this.prisma.rideParticipant.findMany({
      where: { rideId: ride.id, leftAt: null },
      include: { user: { select: { id: true, username: true } } },
    });

    console.log(`✅ User joined ride: ${rideCode}`);

    return {
      ride: {
        id: ride.id,
        rideCode: ride.rideCode,
        rideName: ride.rideName,
        status: ride.status,
        ownerId: ride.ownerId,
        pickup: {
          lat: Number(ride.pickupLat),
          lng: Number(ride.pickupLng),
          address: ride.pickupAddress,
        },
        destination: {
          lat: Number(ride.destinationLat),
          lng: Number(ride.destinationLng),
          address: ride.destinationAddress,
        },
        route: {
          distance: this.mapsService.formatDistance(ride.routeDistance || 0),
          duration: this.mapsService.formatDuration(ride.routeDuration || 0),
          polyline: ride.routePolyline,
        },
        createdAt: ride.createdAt,
      },
      participants: participants.map((p) => ({
        userId: p.user.id,
        username: p.user.username,
        role: p.role,
        joinedAt: p.joinedAt,
      })),
    };
  }

  /**
   * Get ride details
   */
  async getRide(rideId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        participants: {
          where: { leftAt: null },
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Check if user is participant
    const isParticipant = ride.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not part of this ride');
    }

    return {
      ride: {
        id: ride.id,
        rideCode: ride.rideCode,
        rideName: ride.rideName,
        status: ride.status,
        ownerId: ride.ownerId,
        pickup: {
          lat: Number(ride.pickupLat),
          lng: Number(ride.pickupLng),
          address: ride.pickupAddress,
        },
        destination: {
          lat: Number(ride.destinationLat),
          lng: Number(ride.destinationLng),
          address: ride.destinationAddress,
        },
        route: {
          distance: this.mapsService.formatDistance(ride.routeDistance || 0),
          duration: this.mapsService.formatDuration(ride.routeDuration || 0),
          polyline: ride.routePolyline,
        },
        createdAt: ride.createdAt,
        startedAt: ride.startedAt,
        completedAt: ride.completedAt,
      },
      participants: ride.participants.map((p) => ({
        userId: p.user.id,
        username: p.user.username,
        role: p.role,
        joinedAt: p.joinedAt,
      })),
    };
  }

  /**
   * Start ride (owner only)
   */
  async startRide(rideId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Check ownership
    if (ride.ownerId !== userId) {
      throw new ForbiddenException('Only ride owner can start the ride');
    }

    // Check status
    if (ride.status !== 'CREATED') {
      throw new BadRequestException('Ride already started or completed');
    }

    // Update ride status
    const updatedRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });

    // Update Redis cache
    const rideState = await this.redis.getRideState(rideId);
    if (rideState) {
      rideState.status = 'ACTIVE';
      rideState.startedAt = updatedRide.startedAt;
      await this.redis.setRideState(rideId, rideState);
    }


    // ← ADDED: Broadcast to WebSocket clients
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.locationsGateway.broadcastRideStarted(rideId, userId, user.username);
    }

    console.log(`✅ Ride started: ${ride.rideCode}`);

    return {
      ride: {
        id: updatedRide.id,
        status: updatedRide.status,
        startedAt: updatedRide.startedAt,
      },
      message: 'Ride started successfully',
    };
  }

  /**
   * Complete ride (owner only)
   */
  async completeRide(rideId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Check ownership
    if (ride.ownerId !== userId) {
      throw new ForbiddenException('Only ride owner can complete the ride');
    }

    // Check status
    if (ride.status !== 'ACTIVE') {
      throw new BadRequestException('Ride is not active');
    }

    // Calculate statistics (simplified for now)
    const completedAt = new Date();
    const actualDuration = ride.startedAt
      ? Math.floor((completedAt.getTime() - ride.startedAt.getTime()) / 1000)
      : null;

    // Update ride
    const updatedRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'COMPLETED',
        completedAt,
        actualDuration,
        // TODO: Calculate actual distance and speeds from location updates
      },
    });

    // Clear Redis cache
    await this.redis.deleteRideState(rideId);
    await this.redis.deleteRideCode(ride.rideCode);

    // ← ADDED: Broadcast to WebSocket clients
    // Broadcast to WebSocket clients
    await this.locationsGateway.broadcastRideCompleted(rideId, {
      actualDuration: this.mapsService.formatDuration(actualDuration || 0),
    });

    // ← ADD THIS: Force all participants out of WebSocket room
    const participants = await this.prisma.rideParticipant.findMany({
      where: { rideId },
      select: { userId: true },
    });

    for (const participant of participants) {
      await this.locationsGateway.forceLeaveRoom(participant.userId, rideId);
    }

    console.log(`✅ Ride completed: ${ride.rideCode}`);

    return {
      ride: {
        id: updatedRide.id,
        status: updatedRide.status,
        completedAt: updatedRide.completedAt,
      },
      statistics: {
        actualDuration: this.mapsService.formatDuration(actualDuration || 0),
      },
      message: 'Ride completed successfully',
    };
  }

  /**
   * Cancel ride (owner only)
   */
  async cancelRide(rideId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Check ownership
    if (ride.ownerId !== userId) {
      throw new ForbiddenException('Only ride owner can cancel the ride');
    }

    // Check status
    if (ride.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel completed ride');
    }

    if (ride.status === 'CANCELLED') {
      throw new BadRequestException('Ride already cancelled');
    }

    // Update ride
    const updatedRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    // Clear Redis cache
    await this.redis.deleteRideState(rideId);
    await this.redis.deleteRideCode(ride.rideCode);

    // ← ADD THIS: Force all participants out of WebSocket room
    const participants = await this.prisma.rideParticipant.findMany({
      where: { rideId },
      select: { userId: true },
    });

    for (const participant of participants) {
      await this.locationsGateway.forceLeaveRoom(participant.userId, rideId);
    }

    console.log(`✅ Ride cancelled: ${ride.rideCode}`);

    return {
      ride: {
        id: updatedRide.id,
        status: updatedRide.status,
      },
      message: 'Ride cancelled successfully',
    };
  }

  /**
   * Leave ride (participant only, not owner)
   */
  async leaveRide(rideId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Cannot leave completed or cancelled rides
    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot leave a ${ride.status.toLowerCase()} ride`);
    }

    // Owner cannot leave (must cancel instead)
    if (ride.ownerId === userId) {
      throw new BadRequestException('Ride owner cannot leave. Use cancel instead.');
    }

    // Find participant
    const participant = await this.prisma.rideParticipant.findUnique({
      where: {
        rideId_userId: {
          rideId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('You are not part of this ride');
    }

    if (participant.leftAt) {
      throw new BadRequestException('You have already left this ride');
    }

    // Mark as left
    await this.prisma.rideParticipant.update({
      where: {
        rideId_userId: {
          rideId,
          userId,
        },
      },
      data: {
        leftAt: new Date(),
      },
    });

    // Update Redis cache
    const rideState = await this.redis.getRideState(rideId);
    if (rideState) {
      rideState.participantIds = rideState.participantIds.filter((id) => id !== userId);
      await this.redis.setRideState(rideId, rideState);
    }

    // Force disconnect user from WebSocket room
    await this.locationsGateway.forceLeaveRoom(userId, rideId);

    // ← ADDED: Check if this was the last participant
    const remainingParticipants = await this.prisma.rideParticipant.count({
      where: {
        rideId,
        leftAt: null,
      },
    });

    // If only owner remains and ride is ACTIVE, auto-complete it
    if (remainingParticipants === 1 && ride.status === 'ACTIVE') {
      console.log(`⚠️  Last participant left active ride ${rideId}, auto-completing`);

      const completedAt = new Date();
      const actualDuration = ride.startedAt
        ? Math.floor((completedAt.getTime() - ride.startedAt.getTime()) / 1000)
        : null;

      await this.prisma.ride.update({
        where: { id: rideId },
        data: {
          status: 'COMPLETED',
          completedAt,
          actualDuration,
        },
      });

      // Clear Redis cache
      await this.redis.deleteRideState(rideId);
      await this.redis.deleteRideCode(ride.rideCode);

      // Broadcast completion
      await this.locationsGateway.broadcastRideCompleted(rideId, {
        actualDuration: this.mapsService.formatDuration(actualDuration || 0),
        reason: 'Last participant left',
      });
    }

    console.log(`✅ User left ride: ${ride.rideCode}`);

    return {
      message: 'You have left the ride',
    };
  }

  /**
   * List user's rides
   */
  async listMyRides(userId: string, status?: string) {
    const whereClause: any = {
      participants: {
        some: {
          userId,
          leftAt: null,
        },
      },
    };

    if (status) {
      whereClause.status = status.toUpperCase();
    }

    const rides = await this.prisma.ride.findMany({
      where: whereClause,
      include: {
        participants: {
          where: { leftAt: null },
          include: { user: { select: { id: true, username: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to 50 rides
    });

    return rides.map((ride) => ({
      id: ride.id,
      rideCode: ride.rideCode,
      rideName: ride.rideName,
      status: ride.status,
      isOwner: ride.ownerId === userId,
      participantCount: ride.participants.length,
      route: {
        distance: this.mapsService.formatDistance(ride.routeDistance || 0),
        duration: this.mapsService.formatDuration(ride.routeDuration || 0),
      },
      createdAt: ride.createdAt,
      startedAt: ride.startedAt,
      completedAt: ride.completedAt,
    }));
  }
}