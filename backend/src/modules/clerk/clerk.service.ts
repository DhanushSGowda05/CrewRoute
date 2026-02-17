import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Clerk } from '@clerk/clerk-sdk-node';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ClerkService {
  private clerkClient: any;
  private mockMode: boolean;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.mockMode = this.configService.get('CLERK_MOCK_MODE') === 'true';

    if (!this.mockMode) {
      const secretKey = this.configService.get('CLERK_SECRET_KEY');
      if (!secretKey) {
        throw new Error('CLERK_SECRET_KEY is required when CLERK_MOCK_MODE is false');
      }
      this.clerkClient = Clerk({ secretKey });
    } else {
      console.log('⚠️  Clerk running in MOCK MODE');
    }
  }

  // Verify Clerk session token
  async verifyToken(token: string): Promise<{ userId: string }> {
    if (this.mockMode) {
      // Mock mode: token format "mock_user_<clerkUserId>"
      const clerkUserId = token.replace('mock_user_', '');
      return { userId: clerkUserId };
    }

    try {
      // Verify token with Clerk
      const sessionClaims = await this.clerkClient.verifyToken(token);
      return { userId: sessionClaims.sub };
    } catch (error) {
      throw new UnauthorizedException('Invalid session token');
    }
  }

  // Sync user from Clerk webhook
  async syncUserFromClerk(clerkData: any): Promise<any> {
    const {
      id: clerkUserId,
      username,
      email_addresses,
      first_name,
      last_name,
    } = clerkData;

    const email = email_addresses?.[0]?.email_address ?? null;

    // 1️⃣ Try finding by clerkUserId
    let user = await this.prisma.user.findUnique({
      where: { clerkUserId },
    });

    // 2️⃣ Reactivation logic (ONLY if soft deleted)
    if (!user && email) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingByEmail && existingByEmail.deletedAt) {
        console.log(`♻️ Reactivating soft-deleted user: ${existingByEmail.username}`);

        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            clerkUserId,
            deletedAt: null,
            status: 'active',
            username: username || existingByEmail.username,
            firstName: first_name,
            lastName: last_name,
          },
        });

        return user;
      }
    }

    // 3️⃣ Create new user
    if (!user) {
      const generatedUsername =
        username || `user_${clerkUserId.slice(-8)}`;

      user = await this.prisma.user.create({
        data: {
          clerkUserId,
          username: generatedUsername,
          email,
          firstName: first_name,
          lastName: last_name,
          status: 'active',
        },
      });

      console.log(`✅ User created from Clerk: ${user.username}`);
      return user;
    }

    // 4️⃣ Update existing user safely
    user = await this.prisma.user.update({
      where: { clerkUserId },
      data: {
        username: username || user.username,
        ...(email && { email }),
        firstName: first_name,
        lastName: last_name,
      },
    });

    console.log(`✅ User updated from Clerk: ${user.username}`);

    return user;
  }

  // Get user by Clerk ID
  async getUserByClerkId(clerkUserId: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { clerkUserId },
    });
  }

  // Get or create user (JIT sync for mock mode)
  async getOrCreateUser(clerkUserId: string): Promise<any> {
  let user = await this.getUserByClerkId(clerkUserId);

  if (!user) {
    if (this.mockMode) {
      // Mock mode auto-create
      user = await this.prisma.user.create({
        data: {
          clerkUserId,
          username: `mock_user_${clerkUserId.slice(-8)}`,
        },
      });

      console.log(`✅ Mock user auto-created: ${user.username}`);
    } else {
      try {
        // 🔥 Real mode — fetch full Clerk user
        const clerkUser = await this.clerkClient.users.getUser(clerkUserId);

        user = await this.syncUserFromClerk(clerkUser);

        console.log(`✅ Real Clerk user synced: ${user.username}`);
      } catch (error: any) {
        // 🔥 Handle race condition (unique constraint)
        if (error.code === 'P2002') {
          user = await this.getUserByClerkId(clerkUserId);
        } else {
          throw error;
        }
      }
    }
  }

  return user;
}


  // Soft delete user
  async softDeleteUser(clerkUserId: string): Promise<void> {
    const user = await this.getUserByClerkId(clerkUserId);

    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          deletedAt: new Date(),
          username: `deleted_${user.id.slice(-8)}`, // Free up username
        },
      });

      console.log(`✅ User soft deleted: ${clerkUserId}`);
    }
  }
}