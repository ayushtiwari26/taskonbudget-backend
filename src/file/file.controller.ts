import { Controller, Post, Get, Param, UploadedFile, UseInterceptors, UseGuards, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FileController {
    constructor(private readonly fileService: FileService) { }

    @Post('upload/:taskId')
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
    upload(@Param('taskId') taskId: string, @UploadedFile() file: Express.Multer.File) {
        return this.fileService.uploadFile(taskId, file);
    }

    @Get(':key/download')
    @ApiOperation({ summary: 'Get a signed download URL for a file' })
    async download(@Req() req, @Param('key') key: string) {
        const url = await this.fileService.getDownloadUrl(key, req.user.userId, req.user.role);
        return { url };
    }
}
