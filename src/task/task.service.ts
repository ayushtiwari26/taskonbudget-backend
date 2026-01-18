import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { AiService } from '../ai/ai.service';
import { TaskStatus, Role } from '@prisma/client';
import { nanoid } from 'nanoid';

@Injectable()
export class TaskService {
    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
    ) { }

    async create(clientId: string, dto: CreateTaskDto) {
        // Set default target date to 7 days from now if not provided
        const targetDate = dto.targetDate 
            ? new Date(dto.targetDate) 
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const task = await this.prisma.task.create({
            data: {
                title: dto.title,
                description: dto.description,
                suggestedBudget: dto.budget,
                currency: dto.currency,
                urgency: dto.urgency,
                clientId,
                targetDate,
                status: TaskStatus.SUBMITTED,
            },
        });

        // Run AI analysis asynchronously
        // TODO: Uncomment when OPENAI_API_KEY is configured
        // this.aiService.analyzeTask(task.id, task.title, task.description);

        return task;
    }

    async findAll(userId: string, role: Role) {
        const tasks = await this.prisma.task.findMany({
            where: role === Role.ADMIN ? {} : { clientId: userId },
            include: {
                client: { select: { email: true, region: true } },
                aiAnalysis: true,
                payments: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
        });

        return tasks.map(task => this.formatTaskResponse(task, role));
    }

    async findUserTasks(userId: string) {
        const tasks = await this.prisma.task.findMany({
            where: { clientId: userId },
            include: {
                client: { select: { email: true, region: true } },
                aiAnalysis: true,
                payments: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
            orderBy: { createdAt: 'desc' },
        });

        return tasks.map(task => this.formatTaskResponse(task, Role.USER));
    }

    private formatTaskResponse(task: any, role: Role) {
        const aiMetadata = task.aiAnalysis ? {
            category: task.aiAnalysis.category,
            complexity: task.aiAnalysis.complexity,
            riskFlags: task.aiAnalysis.riskFlags,
            recommendedPrice: task.aiAnalysis.recommendedPrice,
        } : null;

        const paymentStatus = task.payments?.[0]?.status || 'UNPAID';

        const allowedActions: string[] = [];
        if (role === Role.ADMIN) {
            if (task.status === TaskStatus.SUBMITTED) {
                allowedActions.push('ACCEPT', 'COUNTER', 'REJECT');
            }
            if (task.status === TaskStatus.ACCEPTED || task.status === TaskStatus.IN_PROGRESS) {
                allowedActions.push('COMPLETE');
            }
        } else {
            if (paymentStatus === 'UNPAID' || paymentStatus === 'FAILED') {
                allowedActions.push('PAY');
            }
        }

        return {
            ...task,
            aiMetadata,
            priorityScore: task.aiAnalysis?.priorityScore || 0,
            paymentStatus,
            allowedActions,
        };
    }

    async findOne(id: string, userId: string, role: Role) {
        const task = await this.prisma.task.findUnique({
            where: { id },
            include: {
                client: { select: { email: true, region: true } },
                aiAnalysis: true,
                files: true,
                payments: true,
                messages: { take: 10, orderBy: { createdAt: 'desc' } },
            },
        });

        if (!task) {
            throw new NotFoundException('Task not found');
        }

        if (role !== Role.ADMIN && task.clientId !== userId) {
            throw new ForbiddenException();
        }

        return this.formatTaskResponse(task, role);
    }

    async counterOffer(id: string, amount: number) {
        return this.prisma.task.update({
            where: { id },
            data: {
                suggestedBudget: amount,
                status: TaskStatus.SUBMITTED,
            },
        });
    }

    async updateStatus(id: string, dto: UpdateTaskStatusDto) {
        return this.prisma.task.update({
            where: { id },
            data: { status: dto.status },
        });
    }

    async acceptTask(id: string) {
        const task = await this.prisma.task.findUnique({ where: { id } });
        if (!task) throw new NotFoundException('Task not found');
        if (task.status === TaskStatus.ACCEPTED) return task; // Idempotent

        // In a real scenario, check if payment is successful
        return this.prisma.task.update({
            where: { id },
            data: { status: TaskStatus.ACCEPTED },
        });
    }

    async completeTask(id: string) {
        return this.prisma.task.update({
            where: { id },
            data: { status: TaskStatus.COMPLETED },
        });
    }

    // File management methods
    async uploadFile(taskId: string, file: Express.Multer.File, userId: string, role: Role) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');

        // Only task owner or admin can upload files
        if (role !== Role.ADMIN && task.clientId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        const fileKey = `${taskId}/${nanoid()}-${file.originalname}`;

        const taskFile = await this.prisma.taskFile.create({
            data: {
                taskId,
                fileName: file.originalname,
                fileKey,
                mimeType: file.mimetype,
                size: file.size,
                data: new Uint8Array(file.buffer),
            },
        });

        return {
            id: taskFile.id,
            fileName: taskFile.fileName,
            mimeType: taskFile.mimeType,
            size: taskFile.size,
            createdAt: taskFile.createdAt,
            downloadUrl: `/tasks/${taskId}/files/${taskFile.id}/download`,
        };
    }

    async getTaskFiles(taskId: string, userId: string, role: Role) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');

        if (role !== Role.ADMIN && task.clientId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        const files = await this.prisma.taskFile.findMany({
            where: { taskId },
            select: {
                id: true,
                fileName: true,
                mimeType: true,
                size: true,
                createdAt: true,
            },
        });

        // Add download URL to each file
        return files.map(file => ({
            ...file,
            downloadUrl: `/tasks/${taskId}/files/${file.id}/download`,
        }));
    }

    async downloadFile(taskId: string, fileId: string, userId: string, role: Role) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');

        if (role !== Role.ADMIN && task.clientId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        const file = await this.prisma.taskFile.findFirst({
            where: { id: fileId, taskId },
        });

        if (!file) throw new NotFoundException('File not found');

        return file;
    }
}
