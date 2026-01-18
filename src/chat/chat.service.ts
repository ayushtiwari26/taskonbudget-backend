import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ChatService {
    constructor(private prisma: PrismaService) { }

    async saveMessage(data: { taskId: string; senderId: string; content: string }) {
        return this.prisma.chatMessage.create({
            data: {
                taskId: data.taskId,
                senderId: data.senderId,
                content: data.content,
            },
            include: {
                sender: { select: { email: true } },
            },
        });
    }

    async getMessages(taskId: string) {
        return this.prisma.chatMessage.findMany({
            where: { taskId },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: { select: { email: true } },
            },
        });
    }
}
