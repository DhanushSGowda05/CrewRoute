import { Module } from '@nestjs/common';
import { ClerkWebhookController } from './webhooks.controller';

@Module({
  controllers: [ClerkWebhookController],
})
export class WebhooksModule {}