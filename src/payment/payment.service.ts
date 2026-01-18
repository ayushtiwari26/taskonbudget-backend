import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import { Region, PaymentStatus } from '@prisma/client';
// import Stripe from 'stripe';
// import Razorpay = require('razorpay');

@Injectable()
export class PaymentService {
    // private stripe: Stripe | null = null;
    // private razorpay: any = null;
    // private isStripeConfigured: boolean = false;
    // private isRazorpayConfigured: boolean = false;

    // UPI Payment Details
    private readonly upiId = 'kayushtiwari26@oksbi';
    private readonly upiName = 'Ayush Tiwari';

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        // Stripe and Razorpay initialization commented out for now
        // const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        // const razorpayKeyId = this.configService.get<string>('RAZORPAY_KEY_ID');
        // const razorpayKeySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

        // this.isStripeConfigured = !!(stripeKey && stripeKey.length > 20 && stripeKey.startsWith('sk_'));
        // this.isRazorpayConfigured = !!(razorpayKeyId && razorpayKeySecret && razorpayKeyId.startsWith('rzp_'));

        // if (this.isStripeConfigured) {
        //     this.stripe = new Stripe(stripeKey!, {
        //         apiVersion: '2025-01-27.acacia' as any,
        //     });
        // }

        // if (this.isRazorpayConfigured) {
        //     this.razorpay = new Razorpay({
        //         key_id: razorpayKeyId!,
        //         key_secret: razorpayKeySecret!,
        //     });
        // }
    }

    async createPaymentIntent(userId: string, taskId: string) {
        if (!taskId) {
            throw new BadRequestException('taskId is required');
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });

        if (!user) throw new BadRequestException('User not found');
        if (!task) throw new BadRequestException('Task not found');

        // Generate UPI payment link
        const amount = task.suggestedBudget;
        const currency = task.currency;
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create UPI deep link
        const upiLink = `upi://pay?pa=${this.upiId}&pn=${encodeURIComponent(this.upiName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Payment for Task: ${task.title}`)}`;

        // Create payment record
        await this.prisma.payment.create({
            data: {
                taskId,
                clientId: userId,
                amount: amount,
                currency: currency,
                provider: 'upi',
                providerPaymentId: paymentId,
                status: PaymentStatus.PENDING,
            },
        });

        return {
            provider: 'upi',
            paymentId,
            upiId: this.upiId,
            upiName: this.upiName,
            upiLink,
            amount,
            currency,
            message: 'Please scan the QR code or use the UPI ID to make the payment. After payment, contact admin with the transaction ID for verification.',
        };
    }

    // Manual payment verification by admin or task owner (for testing)
    // Demo transaction IDs for testing: "TEST123", "DEMO456", "DEV789"
    async verifyManualPayment(paymentId: string, transactionId: string, userId: string, role: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { providerPaymentId: paymentId },
            include: { task: true },
        });

        if (!payment) throw new BadRequestException('Payment not found');

        // Allow admin OR the task owner to verify (for testing purposes)
        const isAdmin = role === 'ADMIN';
        const isOwner = payment.clientId === userId;
        
        if (!isAdmin && !isOwner) {
            throw new BadRequestException('Only admin or task owner can verify payments');
        }

        // Demo transaction IDs for testing (remove in production)
        const demoTransactionIds = ['TEST123', 'DEMO456', 'DEV789'];
        const isValidTransaction = demoTransactionIds.includes(transactionId) || transactionId.length >= 10;

        if (!isValidTransaction) {
            throw new BadRequestException('Invalid transaction ID. For testing, use: TEST123, DEMO456, or DEV789');
        }

        await this.prisma.payment.update({
            where: { providerPaymentId: paymentId },
            data: { 
                status: PaymentStatus.SUCCESS,
            },
        });

        return { success: true, message: 'Payment verified successfully', transactionId };
    }

    /* Commented out Stripe and Razorpay methods for now
    
    private async createMockPayment(taskId: string, userId: string, task: any, provider: string) {
        const mockPaymentId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await this.prisma.payment.create({
            data: {
                taskId,
                clientId: userId,
                amount: task.suggestedBudget,
                currency: task.currency,
                provider: 'mock',
                providerPaymentId: mockPaymentId,
                status: PaymentStatus.PENDING,
            },
        });

        return { 
            provider: 'mock', 
            message: `${provider} is not configured. Using mock payment for development.`,
            paymentId: mockPaymentId,
            amount: task.suggestedBudget,
            currency: task.currency,
        };
    }

    private async createRazorpayOrder(taskId: string, userId: string, task: any) {
        try {
            const options = {
                amount: Math.round(task.suggestedBudget * 100),
                currency: 'INR',
                receipt: `receipt_${task.id}`,
            };
            const order = await this.razorpay.orders.create(options);

            await this.prisma.payment.create({
                data: {
                    taskId,
                    clientId: userId,
                    amount: task.suggestedBudget,
                    currency: 'INR',
                    provider: 'razorpay',
                    providerPaymentId: order.id,
                    status: PaymentStatus.PENDING,
                },
            });

            return { provider: 'razorpay', orderId: order.id, amount: options.amount };
        } catch (error) {
            throw new InternalServerErrorException(`Razorpay payment creation failed: ${error.message}`);
        }
    }

    private async createStripeIntent(taskId: string, userId: string, task: any) {
        try {
            const intent = await this.stripe!.paymentIntents.create({
                amount: Math.round(task.suggestedBudget * 100),
                currency: task.currency.toLowerCase(),
                metadata: { taskId, userId },
            });

            await this.prisma.payment.create({
                data: {
                    taskId,
                    clientId: userId,
                    amount: task.suggestedBudget,
                    currency: task.currency,
                    provider: 'stripe',
                    providerPaymentId: intent.id,
                    status: PaymentStatus.PENDING,
                },
            });

            return { provider: 'stripe', clientSecret: intent.client_secret };
        } catch (error) {
            throw new InternalServerErrorException(`Stripe payment creation failed: ${error.message}`);
        }
    }
    */

    async verifyRazorpayPayment(body: any, signature: string) {
        // Commented out - using manual UPI verification instead
        return { success: false, message: 'Razorpay webhooks disabled. Using manual UPI verification.' };
    }

    async handleStripeWebhook(payload: any, signature: string) {
        // Commented out - using manual UPI verification instead
        return { received: false, message: 'Stripe webhooks disabled. Using manual UPI verification.' };
    }
}
