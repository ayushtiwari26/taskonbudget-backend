import { Module } from '@nestjs/common';
import { ScreenshareGateway } from './screenshare/screenshare.gateway';

import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [AuthModule],
    providers: [ScreenshareGateway],
})
export class ScreenshareModule { }
