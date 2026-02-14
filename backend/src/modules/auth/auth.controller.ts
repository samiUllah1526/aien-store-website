import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      throw new BadRequestException('Email and password are required');
    }
    return this.authService.login(email.trim(), password);
  }
}
