import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { ClerkModule } from './modules/clerk/clerk.module';
import { UsersModule } from './modules/users/users.module';
import { MapsModule } from './modules/maps/maps.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import clerkConfig from './config/clerk.config';
import mapsConfig from './config/maps.config';
import { envValidationSchema } from './config/env.validation';
import { RidesModule } from './modules/rides/rides.module';
import { LocationsModule } from './modules/locations/locations.module';
import { EmergencyModule } from './modules/emergency/emergency.module';
import { RegroupModule } from './modules/regroup/regroup.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      load: [
        databaseConfig,
        redisConfig,
        clerkConfig,
        mapsConfig,
      ],
    }),
    PrismaModule,
    RedisModule,
    ClerkModule,
    UsersModule,
    MapsModule,
    WebhooksModule,
    RidesModule,
    LocationsModule, 
    EmergencyModule,
    RegroupModule,
  ],
})
export class AppModule { }