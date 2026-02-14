import { Controller, Post, Body, Headers, BadRequestException, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ClerkService } from '../clerk/clerk.service';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';

@Controller('webhooks')
export class ClerkWebhookController {
  private mockMode: boolean;

  constructor(
    private clerkService: ClerkService,
    private configService: ConfigService,
  ) {
    this.mockMode = this.configService.get('CLERK_MOCK_MODE') === 'true';
  }

  @Post('clerk')
  async handleClerkWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: any,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    // Verify webhook in production
    if (!this.mockMode) {
      const webhookSecret = this.configService.get('CLERK_WEBHOOK_SECRET');
      
      if (!webhookSecret) {
        throw new BadRequestException('Webhook secret not configured');
      }

      try {
        const wh = new Webhook(webhookSecret);
        
        // Get raw body for verification
        const body = request.rawBody?.toString() || JSON.stringify(payload);
        
        wh.verify(body, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Webhook verification failed:', errorMessage);
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const { type, data } = payload;

    console.log(`📥 Clerk webhook received: ${type}`);

    switch (type) {
      case 'user.created':
        await this.clerkService.syncUserFromClerk(data);
        break;

      case 'user.updated':
        await this.clerkService.syncUserFromClerk(data);
        break;

      case 'user.deleted':
        await this.clerkService.softDeleteUser(data.id);
        break;

      default:
        console.log(`⚠️  Unhandled webhook type: ${type}`);
    }

    return { received: true };
  }
}