import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';
import { UseGuards } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/screenshare',
  cors: { origin: '*' },
})
@UseGuards(WsJwtGuard)
export class ScreenshareGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() taskId: string) {
    client.join(`task:${taskId}`);
  }

  @SubscribeMessage('signal')
  handleSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string; signal: any },
  ) {
    client.to(`task:${data.taskId}`).emit('signal', {
      signal: data.signal,
      from: client.data.user.sub,
    });
  }
}
