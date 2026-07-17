import { Logger } from '@nestjs/common';
import { IncidentType } from '../../database/enums';

export interface AiGuidanceContext {
  incidentType: IncidentType;
  question: string;
  /** Only ever populated when a verified Skilled Responder is present (6.6.4). */
  medicalContext?: string;
}

export interface AiProvider {
  generate(ctx: AiGuidanceContext): Promise<string>;
}
export const AI_PROVIDER = 'AI_PROVIDER_TOKEN';

/**
 * Default provider: protocol-grounded canned guidance (no external calls).
 * Used until OQ05 (LLM provider) is resolved. Deterministic + offline-capable,
 * matching PRD 6.6.4's on-device cached knowledge base for the 8 categories.
 */
export class StubAiProvider implements AiProvider {
  private readonly protocols: Partial<Record<IncidentType, string>> = {
    [IncidentType.RTA]:
      'Do not move the victim unless there is fire risk. Keep them still, check that they are breathing, and reassure them. Control visible bleeding with firm pressure using a clean cloth.',
    [IncidentType.MEDICAL_COLLAPSE]:
      'Check responsiveness and breathing. Place them on their side if breathing and unconscious. If trained and they are not breathing, begin standard basic life support and continue until help arrives.',
    [IncidentType.FIRE]:
      'Prioritise getting everyone away from smoke and flames to fresh air. Do not re-enter the building. Keep low to avoid smoke.',
    [IncidentType.DROWNING]:
      'Only attempt a rescue if it is safe. Once out of the water, check breathing and, if trained, begin basic life support.',
    [IncidentType.BUILDING_COLLAPSE]:
      'Do not enter unstable structures. Keep bystanders back, listen for trapped people, and wait for responders.',
    [IncidentType.CROWD_CRUSH]:
      'Move away from the crush toward open space, stay on your feet, and help others up. Do not push against the crowd.',
    [IncidentType.UNKNOWN]:
      'Ensure the scene is safe, keep the person calm and still, and monitor their breathing until a verified responder arrives.',
  };

  async generate(ctx: AiGuidanceContext): Promise<string> {
    return this.protocols[ctx.incidentType] ?? this.protocols[IncidentType.UNKNOWN]!;
  }
}

/**
 * Anthropic Claude adapter (pluggable, OQ05). Uses global fetch; no SDK dep.
 * The system prompt is one layer of defense — the output filter is the other.
 */
export class AnthropicAiProvider implements AiProvider {
  private readonly logger = new Logger(AnthropicAiProvider.name);
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generate(ctx: AiGuidanceContext): Promise<string> {
    const system =
      'You are an emergency first-aid guidance assistant for Nigerian bystanders. ' +
      'Give brief, protocol-grounded guidance based on WHO Basic Life Support and Nigeria Red Cross. ' +
      'NEVER give a diagnosis, medication dosages, or invasive/surgical instructions. ' +
      'Use qualified language and always recommend deferring to a verified responder.';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 400,
        system,
        messages: [
          {
            role: 'user',
            content: `Incident type: ${ctx.incidentType}. Question: ${ctx.question}`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);
    const data: any = await res.json();
    return data?.content?.[0]?.text ?? '';
  }
}
