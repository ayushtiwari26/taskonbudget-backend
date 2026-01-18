import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../chat.service';

import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private chatService: ChatService) { }

  handleConnection(client: Socket) {
    const taskId = client.handshake.query.taskId as string;
    if (taskId) {
      client.join(`task:${taskId}`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string; content: string },
  ) {
    const userId = client.data.user.sub;
    const message = await this.chatService.saveMessage({
      ...data,
      senderId: userId,
    });
    this.server.to(`task:${data.taskId}`).emit('newMessage', message);
  }
}
