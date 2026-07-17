import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { WELFARE_QUEUE } from '../messaging/queue.tokens';
import { WelfareCheckService } from './welfare-check.service';

/** Drives the welfare-check timeouts (prompt2, escalate). */
@Processor(WELFARE_QUEUE)
export class WelfareProcessor extends WorkerHost {
  constructor(private readonly welfare: WelfareCheckService) {
    super();
  }

  async process(job: Job<{ sessionId: string }>): Promise<void> {
    if (job.name === 'prompt2') await this.welfare.onPrompt2Timeout(job.data.sessionId);
    else if (job.name === 'escalate') await this.welfare.onEscalateTimeout(job.data.sessionId);
  }
}
