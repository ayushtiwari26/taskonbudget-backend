import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) { }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                region: true,
                createdAt: true,
                _count: {
                    select: { tasks: true, payments: true },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async getAdminStats() {
        const [userCount, taskCount, paymentSum] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.task.count(),
            this.prisma.payment.aggregate({
                where: { status: 'SUCCESS' },
                _sum: { amount: true },
            }),
        ]);

        return {
            users: userCount,
            tasks: taskCount,
            revenue: paymentSum._sum.amount || 0,
        };
    }
}
