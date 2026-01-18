import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'openai';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AiService {
    private openai: OpenAI;
    private readonly logger = new Logger(AiService.name);

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        this.openai = new OpenAI({
            apiKey: this.configService.get('OPENAI_API_KEY'),
        });
    }

    async analyzeTask(taskId: string, title: string, description: string) {
        try {
            const prompt = `
        Analyze the following technical task and return a JSON object with:
        - category: string
        - complexity: string (Low, Medium, High)
        - recommendedPrice: number (in the context of the task)
        - priorityScore: number (1-10)
        - riskFlags: string[] (potential issues)

        Task Title: ${title}
        Task Description: ${description}

        Return ONLY the JSON object.
      `;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo', // or gpt-4
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0].message.content;
            if (!content) throw new Error('Empty AI response');
            const analysis = JSON.parse(content);

            await this.prisma.taskAIAnalysis.create({
                data: {
                    taskId,
                    category: analysis.category || 'Unknown',
                    complexity: analysis.complexity || 'Medium',
                    recommendedPrice: analysis.recommendedPrice || 0,
                    priorityScore: analysis.priorityScore || 5,
                    riskFlags: analysis.riskFlags || [],
                    rawAnalysis: analysis,
                },
            });

            this.logger.log(`AI Analysis completed for task ${taskId}`);
        } catch (error) {
            this.logger.error(`AI Analysis failed for task ${taskId}: ${error.message}`);
            // Fail gracefully as per requirements
        }
    }
}
