import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Generates unique 6-character ride codes
 * Format: BCDFGH (no vowels to prevent profanity)
 * Example: MH47BK, DL2XP9
 */

// Custom Base32 charset without vowels (A, E, I, O, U)
const CHARSET = 'BCDFGHJKLMNPQRSTVWXYZ23456789';
const CODE_LENGTH = 6;

/**
 * Generate a random ride code
 */
export function generateRideCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * CHARSET.length);
    code += CHARSET[randomIndex];
  }
  return code;
}

/**
 * Generate a unique ride code (checks database for duplicates)
 * @param prisma - Prisma service instance
 * @param maxAttempts - Maximum retry attempts (default: 5)
 * @returns Unique ride code
 */
export async function generateUniqueRideCode(
  prisma: PrismaService,
  maxAttempts: number = 5,
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const code = generateRideCode();

    // Check if code already exists
    const existingRide = await prisma.ride.findUnique({
      where: { rideCode: code },
    });

    if (!existingRide) {
      return code;
    }

    console.warn(`⚠️  Ride code collision: ${code} (attempt ${attempt}/${maxAttempts})`);
  }

  // If all attempts fail, throw error
  throw new Error('Failed to generate unique ride code after maximum attempts');
}

/**
 * Validate ride code format
 * @param code - Ride code to validate
 * @returns true if valid, false otherwise
 */
export function isValidRideCode(code: string): boolean {
  if (!code || code.length !== CODE_LENGTH) {
    return false;
  }

  // Check if all characters are in the charset
  for (const char of code) {
    if (!CHARSET.includes(char.toUpperCase())) {
      return false;
    }
  }

  return true;
}