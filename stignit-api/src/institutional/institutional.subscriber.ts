import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus } from '../messaging/event-bus.service';
import { EventType, SituationRoomCreatedEvent } from '../messaging/events';
import { InstitutionalService } from './institutional.service';

/**
 * Fan-out subscriber #2 (PRD 8.2 step 23): dispatch the institutional packet on
 * Situation Room creation. Isolated from the other subscribers by the EventBus.
 */
@Injectable()
export class InstitutionalSubscriber implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly service: InstitutionalService,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe(EventType.SITUATION_ROOM_CREATED, 'institutional', (e) =>
      this.service.dispatchForIncident((e as SituationRoomCreatedEvent).incidentId).then(() => undefined),
    );
  }
}
