import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user with email/password' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    if (!dto.password) {
      throw new Error('Password is required');
    }
    return this.authService.register(dto.email, dto.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/password' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    if (!dto.password) {
      throw new Error('Password is required');
    }
    return this.authService.login(dto.email, dto.password);
  }

  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Magic link login (auto-creates user if needed)' })
  async magicLink(@Body() body: { email: string }): Promise<{ message: string }> {
    // In a real app, this would send an email with a magic link
    // For demo, just return success
    await this.authService.magicLinkLogin(body.email);
    return { message: 'Magic link sent (demo mode: auto-logged in)' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  async me(@Request() req: { user: { id: string; email: string; displayName: string } }) {
    return this.authService.getProfile(req.user.id);
  }
}