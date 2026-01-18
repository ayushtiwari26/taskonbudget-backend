import { Injectable, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { PrismaService } from '../common/prisma.service';
import { nanoid } from 'nanoid';
import { Role } from '@prisma/client';

@Injectable()
export class FileService {
    private s3: AWS.S3;
    private bucket: string;

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        this.bucket = this.configService.get('S3_BUCKET') || 'default-bucket';
        this.s3 = new AWS.S3({
            accessKeyId: this.configService.get('S3_ACCESS_KEY') || '',
            secretAccessKey: this.configService.get('S3_SECRET_KEY') || '',
            endpoint: this.configService.get('S3_ENDPOINT') || '',
            s3ForcePathStyle: true,
            signatureVersion: 'v4',
            region: this.configService.get('S3_REGION'),
        });
    }

    async uploadFile(taskId: string, file: Express.Multer.File) {
        const key = `${taskId}/${nanoid()}-${file.originalname}`;

        try {
            await this.s3.putObject({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            }).promise();

            const taskFile = await this.prisma.taskFile.create({
                data: {
                    taskId,
                    fileName: file.originalname,
                    fileKey: key,
                    mimeType: file.mimetype,
                    size: file.size,
                    data: new Uint8Array(file.buffer),
                },
            });

            return taskFile;
        } catch (error) {
            throw new InternalServerErrorException(`Upload failed: ${error.message}`);
        }
    }

    async getDownloadUrl(fileKey: string, userId: string, role: Role) {
        const file = await this.prisma.taskFile.findUnique({
            where: { fileKey },
            include: { task: true },
        });

        if (!file) throw new NotFoundException('File not found');

        if (role !== Role.ADMIN && file.task.clientId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        return this.s3.getSignedUrlPromise('getObject', {
            Bucket: this.bucket,
            Key: fileKey,
            Expires: 3600, // 1 hour
        });
    }
}
