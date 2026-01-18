import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { Role, Region } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async register(dto: RegisterDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new BadRequestException('User already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // Simple region detection logic for MVP
        // In production, use IP-based detection or explicit selection
        const region = dto.currency === 'INR' ? Region.INDIA : Region.FOREIGN;

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                name: dto.name,
                region,
                role: Role.USER, // Default to USER, first user can be made ADMIN manually or via seed
            },
        });

        return this.generateTokens(user.id, user.email, user.role);
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user || !(await bcrypt.compare(dto.password, user.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.generateTokens(user.id, user.email, user.role);
    }

    async refreshTokens(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });

            if (!user) {
                throw new UnauthorizedException();
            }

            const storedToken = await this.prisma.refreshToken.findUnique({
                where: { token: refreshToken },
            });

            if (!storedToken || storedToken.expiresAt < new Date()) {
                throw new UnauthorizedException('Refresh token expired or invalid');
            }

            // Rotate refresh token
            await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

            return this.generateTokens(user.id, user.email, user.role);
        } catch (e) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    private async generateTokens(userId: string, email: string, role: Role) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { region: true },
        });

        const payload = { sub: userId, email, role };

        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_ACCESS_SECRET'),
            expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION'),
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
        });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.prisma.refreshToken.create({
            data: { userId, token: refreshToken, expiresAt },
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: userId,
                email,
                role,
                region: user?.region || Region.INDIA,
            },
        };
    }

    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                region: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return user;
    }

    async logout(userId: string, refreshToken?: string) {
        if (refreshToken) {
            // Delete specific refresh token
            await this.prisma.refreshToken.deleteMany({
                where: { 
                    userId,
                    token: refreshToken,
                },
            });
        } else {
            // Delete all refresh tokens for user (logout from all devices)
            await this.prisma.refreshToken.deleteMany({
                where: { userId },
            });
        }

        return { success: true, message: 'Logged out successfully' };
    }

    async logoutByRefreshToken(refreshToken: string) {
        // Delete refresh token without needing userId
        await this.prisma.refreshToken.deleteMany({
            where: { token: refreshToken },
        });

        return { success: true, message: 'Logged out successfully' };
    }
}
