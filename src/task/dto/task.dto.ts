import { IsString, IsNotEmpty, IsNumber, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateTaskDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty()
    @IsNumber()
    budget: number;

    @ApiProperty({ enum: ['INR', 'USD', 'EUR'] })
    @IsString()
    currency: string;

    @ApiProperty()
    @IsString()
    urgency: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsDateString()
    targetDate?: string;
}

export class UpdateTaskStatusDto {
    @ApiProperty({ enum: TaskStatus })
    @IsEnum(TaskStatus)
    status: TaskStatus;
}

export class CounterOfferDto {
    @ApiProperty()
    @IsNumber()
    amount: number;

    @ApiProperty()
    @IsString()
    message: string;
}
