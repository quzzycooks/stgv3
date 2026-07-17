import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { and, eq } from 'drizzle-orm';
import type { Server, Socket } from 'socket.io';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { incidentParticipants, incidents } from '../database/schema';
import { first } from '../database/util';

/**
 * Real-time Situation Room channel (PRD 10.2). Auth enforced at connect AND on
 * every join — membership is re-derived from the DB each time (roles change
 * mid-incident). Never trust connect-time state for later messages.
 */
@WebSocketGateway({ namespace: '/rt', cors: { origin: true } })
export class SituationRoomGateway implements OnGatewayConnection {
  private readonly logger = new Logger(SituationRoomGateway.name);
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  handleConnection(client: Socket): void {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');
      const claims = this.jwt.verify(token, { secret: this.config.get('jwt.accessSecret') });
      if (claims.typ !== 'access') throw new Error('wrong token type');
      client.data.userId = claims.sub;
    } catch {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  private async assertMembership(userId: string, incidentId: string): Promise<void> {
    const incident = first(
      await this.db
        .select({ triggeringUserId: incidents.triggeringUserId })
        .from(incidents)
        .where(eq(incidents.incidentId, incidentId))
        .limit(1),
    );
    if (!incident) throw new WsException('Incident not found');
    const participant = first(
      await this.db
        .select({ id: incidentParticipants.id })
        .from(incidentParticipants)
        .where(and(eq(incidentParticipants.incidentId, incidentId), eq(incidentParticipants.userId, userId)))
        .limit(1),
    );
    if (!participant && incident.triggeringUserId !== userId) {
      throw new WsException('Not authorized for this incident');
    }
  }

  @SubscribeMessage('incident:join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { incidentId: string },
  ): Promise<{ joined: string }> {
    await this.assertMembership(client.data.userId as string, body.incidentId);
    await client.join(`incident:${body.incidentId}`);
    return { joined: body.incidentId };
  }

  @SubscribeMessage('incident:leave')
  async leave(@ConnectedSocket() client: Socket, @MessageBody() body: { incidentId: string }) {
    await client.leave(`incident:${body.incidentId}`);
    return { left: body.incidentId };
  }

  emitToIncident(incidentId: string, event: string, payload: unknown): void {
    this.server?.to(`incident:${incidentId}`).emit(event, payload);
  }
}
