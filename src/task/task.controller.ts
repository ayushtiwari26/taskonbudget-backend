import { Controller, Get, Post, Body, Param, UseGuards, Req, Patch, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { TaskService } from './task.service';
import { CreateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TaskController {
    constructor(private readonly taskService: TaskService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new task' })
    create(@Req() req, @Body() dto: CreateTaskDto) {
        return this.taskService.create(req.user.userId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all tasks (Client gets own, Admin gets all)' })
    findAll(@Req() req) {
        return this.taskService.findAll(req.user.userId, req.user.role);
    }

    @Get('user')
    @ApiOperation({ summary: 'Get current user tasks' })
    findUserTasks(@Req() req) {
        return this.taskService.findUserTasks(req.user.userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get task details' })
    findOne(@Req() req, @Param('id') id: string) {
        return this.taskService.findOne(id, req.user.userId, req.user.role);
    }

    @Post(':id/accept')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Admin accepts a task' })
    accept(@Param('id') id: string) {
        return this.taskService.acceptTask(id);
    }

    @Post(':id/counter')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Admin makes a counter offer' })
    counter(@Param('id') id: string, @Body('amount') amount: number) {
        return this.taskService.counterOffer(id, amount);
    }

    @Post(':id/complete')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Admin marks task as completed' })
    complete(@Param('id') id: string) {
        return this.taskService.completeTask(id);
    }

    @Patch(':id/status')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Admin updates task status' })
    updateStatus(@Param('id') id: string, @Body() dto: UpdateTaskStatusDto) {
        return this.taskService.updateStatus(id, dto);
    }

    @Post(':id/files')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiOperation({ summary: 'Upload a file for a task' })
    uploadFile(@Req() req, @Param('id') taskId: string, @UploadedFile() file: Express.Multer.File) {
        return this.taskService.uploadFile(taskId, file, req.user.userId, req.user.role);
    }

    @Get(':id/files')
    @ApiOperation({ summary: 'Get all files for a task' })
    getFiles(@Req() req, @Param('id') taskId: string) {
        return this.taskService.getTaskFiles(taskId, req.user.userId, req.user.role);
    }

    @Get(':id/files/:fileId/download')
    @ApiOperation({ summary: 'Download a file' })
    async downloadFile(
        @Req() req,
        @Param('id') taskId: string,
        @Param('fileId') fileId: string,
        @Res() res: Response,
    ) {
        const file = await this.taskService.downloadFile(taskId, fileId, req.user.userId, req.user.role);
        res.set({
            'Content-Type': file.mimeType,
            'Content-Disposition': `attachment; filename="${file.fileName}"`,
            'Content-Length': file.size,
        });
        res.send(file.data);
    }
}
