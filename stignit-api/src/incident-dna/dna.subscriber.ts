import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus } from '../messaging/event-bus.service';
import { EventType, IncidentClosedEvent } from '../messaging/events';
import { IncidentDnaService } from './incident-dna.service';

/** On incident close/false-alarm, anonymize the action trail (PRD 6.9.3). */
@Injectable()
export class DnaSubscriber implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly dna: IncidentDnaService,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe(EventType.INCIDENT_CLOSED, 'dna-anonymize', (e) =>
      this.dna.anonymizeIncident((e as IncidentClosedEvent).incidentId).then(() => undefined),
    );
  }
}
