import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
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

  async login(email: string, password?: string) {
    // Require password for login (no auto-create)
    if (!password) {
      throw new BadRequestException('Password is required for login');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is suspended or deleted');
    }

    // For now, support both password-hashed and magic-link users
    // If passwordHash exists, verify it
    if (user.authProvider === 'EMAIL' && password) {
      // TODO: Add passwordHash field to schema and verify properly
      // For now, only allow magic-link style (no password verification)
      // This will be fixed when we add proper password hashing
      throw new UnauthorizedException('Password login not fully implemented yet');
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

    // Require password for registration
    if (!password) {
      throw new BadRequestException('Password is required for registration');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        displayName: email.split('@')[0],
        authProvider: 'EMAIL',
      },
      // Note: Need to add passwordHash field to schema for proper storage
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

  /**
   * Magic link login - creates user if doesn't exist
   * Only for magic link flow, not password login
   */
  async magicLinkLogin(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    let existingUser = user;

    if (!existingUser) {
      // Auto-create for magic link flow only
      existingUser = await this.prisma.user.create({
        data: {
          email,
          displayName: email.split('@')[0],
          authProvider: 'GOOGLE', // Use GOOGLE as placeholder for magic link
        },
      });
    }

    if (existingUser.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is suspended or deleted');
    }

    await this.prisma.user.update({
      where: { id: existingUser.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await this.generateToken(existingUser.id);
    
    return {
      user: {
        id: existingUser.id,
        email: existingUser.email,
        displayName: existingUser.displayName,
        role: existingUser.role,
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