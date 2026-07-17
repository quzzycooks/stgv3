import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBus } from '../../messaging/event-bus.service';
import { EventType, SituationRoomCreatedEvent } from '../../messaging/events';
import { TransportService } from '../transport.service';

/**
 * Fan-out subscriber #3 (PRD 8.2 step 24): kick off driver dispatch when a
 * Situation Room is created. Runs independently of notification/institutional
 * (failure-isolated by the EventBus).
 */
@Injectable()
export class DispatchSubscriber implements OnModuleInit {
  private readonly logger = new Logger(DispatchSubscriber.name);

  constructor(
    private readonly bus: EventBus,
    private readonly transport: TransportService,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe(EventType.SITUATION_ROOM_CREATED, 'driver-dispatch', (e) =>
      this.handle(e as SituationRoomCreatedEvent),
    );
  }

  private async handle(event: SituationRoomCreatedEvent): Promise<void> {
    await this.transport.requestDispatch(event.incidentId);
  }
}
