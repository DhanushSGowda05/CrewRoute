import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { ClerkService } from '../clerk/clerk.service';
import { LocationsService } from './locations.service';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LocationUpdateDto } from './dto/location-update.dto';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly in production
    credentials: true,
  },
})
export class LocationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private clerkService: ClerkService,
    private locationsService: LocationsService,
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization;

      if (!token) {
        console.log('❌ WebSocket connection rejected: No token');
        client.disconnect();
        return;
      }

      // Verify token with Clerk
      const { userId: clerkUserId } = await this.clerkService.verifyToken(
        token.replace('Bearer ', ''),
      );

      // Get user from database
      const user = await this.clerkService.getOrCreateUser(clerkUserId);

      if (!user) {
        console.log('❌ WebSocket connection rejected: User not found');
        client.disconnect();
        return;
      }

      // Attach user info to socket
      client.data.userId = user.id;
      client.data.username = user.username;

      // Store socket connection in Redis
      await this.redis.addSocketSession(user.id, client.id);

      // Set user as online
      await this.redis.setUserOnline(user.id);

      console.log(`✅ WebSocket connected: ${user.username} (${client.id})`);

      // Acknowledge connection
      client.emit('connected', {
        userId: user.id,
        username: user.username,
        socketId: client.id,
      });
    } catch (error) {
      let errormessage= error instanceof Error ? error.message : 'Unknown error';
      console.error('WebSocket connection error:', errormessage);
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const username = client.data.username;

    if (userId) {
      // Remove socket session from Redis
      await this.redis.removeSocketSession(userId, client.id);

      console.log(`❌ WebSocket disconnected: ${username} (${client.id})`);
    }
  }

  /**
   * Join a ride room
   */
  @SubscribeMessage('joinRide')
  async handleJoinRide(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: string },
  ) {
    const userId = client.data.userId;
    const username = client.data.username;
    const { rideId } = data;

    try {
      // Verify user is participant in this ride
      const participant = await this.prisma.rideParticipant.findUnique({
        where: {
          rideId_userId: {
            rideId,
            userId,
          },
        },
      });

      if (!participant || participant.leftAt) {
        client.emit('error', { message: 'You are not part of this ride' });
        return;
      }

      // Join the Socket.IO room
      client.join(rideId);

      console.log(`📍 ${username} joined ride room: ${rideId}`);

      // Notify others in the room
      client.to(rideId).emit('userJoined', {
        userId,
        username,
        joinedAt: new Date().toISOString(),
      });

      // Send acknowledgment
      client.emit('joinedRide', {
        rideId,
        message: 'Successfully joined ride',
      });
    } catch (error) {
      let errormessage= error instanceof Error ? error.message : 'Unknown error';
      console.error('Error joining ride:', errormessage);
      client.emit('error', { message: 'Failed to join ride' });
    }
  }

  /**
   * Leave a ride room
   */
  @SubscribeMessage('leaveRide')
  async handleLeaveRide(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: string },
  ) {
    const userId = client.data.userId;
    const username = client.data.username;
    const { rideId } = data;

    // Leave the Socket.IO room
    client.leave(rideId);

    console.log(`📍 ${username} left ride room: ${rideId}`);

    // Notify others
    client.to(rideId).emit('userLeft', {
      userId,
      username,
    });

    client.emit('leftRide', {
      rideId,
      message: 'Left ride room',
    });
  }

  /**
   * Handle location update
   */
  @SubscribeMessage('locationUpdate')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LocationUpdateDto,
  ) {
    const userId = client.data.userId;
    const username = client.data.username;

    try {
      // Process location update
      const locationData = await this.locationsService.processLocationUpdate(userId, data);

      // Broadcast to all other riders in the room (except sender)
      client.to(data.rideId).emit('riderLocation', {
        userId,
        username,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        speed: locationData.speed,
        heading: locationData.heading,
        accuracy: locationData.accuracy,
        timestamp: locationData.timestamp,
      });

      // Acknowledge to sender
      client.emit('locationUpdateAck', {
        success: true,
        timestamp: locationData.timestamp,
      });
    } catch (error) {
      let errormessage= error instanceof Error ? error.message : 'Unknown error';
      console.error('Location update error:', errormessage);
      client.emit('error', { message: errormessage });
    }
  }

  /**
   * Broadcast ride started event
   */
  async broadcastRideStarted(rideId: string, ownerId: string, ownerUsername: string) {
    this.server.to(rideId).emit('rideStarted', {
      rideId,
      startedBy: ownerId,
      username: ownerUsername,
      startedAt: new Date().toISOString(),
    });

    console.log(`📢 Broadcasted ride started: ${rideId}`);
  }

  /**
   * Broadcast ride completed event
   */
  async broadcastRideCompleted(rideId: string, statistics: any) {
    this.server.to(rideId).emit('rideCompleted', {
      rideId,
      completedAt: new Date().toISOString(),
      statistics,
    });

    console.log(`📢 Broadcasted ride completed: ${rideId}`);
  }

  /**
   * Broadcast SOS alert
   */
  async broadcastSOS(rideId: string, alert: any) {
    this.server.to(rideId).emit('sosTriggered', {
      alertId: alert.id,
      userId: alert.userId,
      username: alert.username,
      alertType: alert.alertType,
      location: {
        latitude: alert.latitude,
        longitude: alert.longitude,
      },
      message: alert.message,
      triggeredAt: alert.triggeredAt,
    });

    console.log(`🚨 Broadcasted SOS alert in ride: ${rideId}`);
  }
  /**
   * Force user to leave ride room (when they leave via REST API)
   */
  async forceLeaveRoom(userId: string, rideId: string) {
    // Get all socket connections for this user
    const socketIds = await this.redis.getUserSockets(userId);
    
    if (socketIds.length === 0) {
      console.log(`⚠️  No active WebSocket connections for user ${userId}`);
      return;
    }

    // Force each socket to leave the room
    for (const socketId of socketIds) {
      const socket = this.server.sockets.sockets.get(socketId);
      
      if (socket) {
        // Leave the room
        socket.leave(rideId);
        
        // Notify the client they were removed
        socket.emit('forcedLeaveRide', {
          rideId,
          reason: 'You have left this ride',
        });
        
        console.log(`🚪 Forced socket ${socketId} to leave ride ${rideId}`);
      }
    }
  }
}