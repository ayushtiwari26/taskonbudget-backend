import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtAuthOptionalGuard } from './guards/jwt-auth-optional.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with email and password' })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    refresh(@Req() req, @Body() body: any) {
        // Accept refreshToken from body or cookies
        const refreshToken = body.refreshToken || body.refresh_token || req.cookies?.refreshToken;
        if (!refreshToken) {
            throw new Error('Refresh token is required');
        }
        return this.authService.refreshTokens(refreshToken);
    }

    @Get('me')
    @UseGuards(JwtAuthOptionalGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current logged-in user profile' })
    async getMe(@Req() req) {
        // If no user (no token or invalid token), return null
        if (!req.user) {
            return null;
        }
        return this.authService.getMe(req.user.userId);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthOptionalGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout - invalidate refresh tokens' })
    async logout(@Req() req, @Body() body: any) {
        const refreshToken = body.refreshToken || body.refresh_token || req.cookies?.refreshToken;
        
        // If user is authenticated, logout properly
        if (req.user) {
            return this.authService.logout(req.user.userId, refreshToken);
        }
        
        // If no valid token but refreshToken provided, try to invalidate it
        if (refreshToken) {
            return this.authService.logoutByRefreshToken(refreshToken);
        }
        
        // No authentication info at all - still return success (client will clear local tokens)
        return { success: true, message: 'Logged out successfully' };
    }
}
