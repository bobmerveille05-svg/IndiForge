import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid user');
    }
    
    return user;
  }

  async generateToken(userId: string) {
    const payload = { sub: userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async login(email: string) {
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create user on first login (magic link flow)
      user = await this.prisma.user.create({
        data: {
          email,
          displayName: email.split('@')[0],
          authProvider: 'EMAIL',
        },
      });
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is suspended or deleted');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await this.generateToken(user.id);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      ...token,
    };
  }

  async register(email: string, password?: string) {
    // Check if user exists
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        displayName: email.split('@')[0],
        authProvider: password ? 'EMAIL' : 'EMAIL',
      },
    });

    const token = await this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      ...token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }
}