import { ApiProperty } from '@nestjs/swagger';

export class ErrorDetailsDto {
    @ApiProperty()
    code: string;

    @ApiProperty()
    message: string;
}

export class BaseResponseDto<T> {
    @ApiProperty()
    success: boolean;

    @ApiProperty({ required: false })
    data?: T;

    @ApiProperty({ required: false })
    error?: ErrorDetailsDto;
}
