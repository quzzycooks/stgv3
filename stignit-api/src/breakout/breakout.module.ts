import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncidentsModule } from '../incidents/incidents.module';
import { AiGuidanceService } from './ai/ai-guidance.service';
import { AI_PROVIDER, AnthropicAiProvider, StubAiProvider } from './ai/ai-provider';
import { BreakoutController } from './breakout.controller';
import { BreakoutRoomService } from './breakout-room.service';

@Module({
  imports: [IncidentsModule],
  controllers: [BreakoutController],
  providers: [
    BreakoutRoomService,
    AiGuidanceService,
    {
      // Provider selection (OQ05). Defaults to the offline protocol stub unless
      // Anthropic is configured. The output safety filter applies regardless.
      provide: AI_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('integrations.aiProvider');
        const key = config.get<string>('integrations.anthropicApiKey');
        if (provider === 'anthropic' && key) {
          return new AnthropicAiProvider(key, config.get<string>('integrations.aiModel')!);
        }
        return new StubAiProvider();
      },
    },
  ],
  exports: [BreakoutRoomService, AiGuidanceService],
})
export class BreakoutModule {}
