import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async update(userId: string, dto: UpdateUserDto) {
    // Check username uniqueness if changing username
    if (dto.username) {
      const exists = await this.prisma.user.findFirst({
        where: {
          username: dto.username,
          id: { not: userId },
          deletedAt: null,
        },
      });

      if (exists) {
        throw new ConflictException('Username already taken');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

}