import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ClerkService } from '../../modules/clerk/clerk.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private clerkService: ClerkService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify with Clerk
      const { userId: clerkUserId } = await this.clerkService.verifyToken(token);
      
      // Get or create user in our database
      const user = await this.clerkService.getOrCreateUser(clerkUserId);
      
      if (!user || user.deletedAt) {
        throw new UnauthorizedException('User not found or deleted');
      }

      // Attach user to request
      request.user = user;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Authentication failed');
    }
  }
}