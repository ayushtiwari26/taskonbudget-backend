import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        let message =
            exception instanceof HttpException
                ? exception.getResponse()
                : 'Internal server error';

        // Handle validation errors (mapped to 422 if it was 400)
        if (status === HttpStatus.BAD_REQUEST && typeof message === 'object' && message !== null && (message as any).message) {
            status = HttpStatus.UNPROCESSABLE_ENTITY;
        }

        const errorResponse = {
            success: false,
            error: {
                code: (exception as any)?.code || (exception as any)?.constructor?.name || 'Error',
                message: typeof message === 'string' ? message : (message as any).message || message,
            },
        };

        response.status(status).json(errorResponse);
    }
}
