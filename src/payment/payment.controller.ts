import { Controller, Post, Body, Req, UseGuards, Headers } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Post('create')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Create a payment - returns UPI payment details' })
    create(@Req() req, @Body('taskId') taskId: string) {
        return this.paymentService.createPaymentIntent(req.user.userId, taskId);
    }

    @Post('verify')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Verify a UPI payment (Admin or task owner for testing)' })
    verifyPayment(@Req() req, @Body('paymentId') paymentId: string, @Body('transactionId') transactionId: string) {
        return this.paymentService.verifyManualPayment(paymentId, transactionId, req.user.userId, req.user.role);
    }

    @Post('webhook/razorpay')
    @ApiOperation({ summary: 'Razorpay webhook (disabled)' })
    razorpayWebhook(@Body() body: any, @Headers('x-razorpay-signature') signature: string) {
        return this.paymentService.verifyRazorpayPayment(body, signature);
    }

    @Post('webhook/stripe')
    @ApiOperation({ summary: 'Stripe webhook (disabled)' })
    stripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
        return this.paymentService.handleStripeWebhook(req.body, signature);
    }
}
