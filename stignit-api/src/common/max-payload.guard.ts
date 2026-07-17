import {
  CanActivate,
  ExecutionContext,
  Injectable,
  PayloadTooLargeException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const MAX_PAYLOAD_BYTES_KEY = 'maxPayloadBytes';
/** Cap request body size on critical endpoints (PRD 7.4: alert payloads <5KB). */
export const MaxPayloadBytes = (bytes: number) => SetMetadata(MAX_PAYLOAD_BYTES_KEY, bytes);

@Injectable()
export class MaxPayloadGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const limit = this.reflector.getAllAndOverride<number>(MAX_PAYLOAD_BYTES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!limit) return true;
    const req = ctx.switchToHttp().getRequest();
    const size = Buffer.byteLength(JSON.stringify(req.body ?? {}), 'utf8');
    if (size > limit) {
      throw new PayloadTooLargeException(`Payload ${size}B exceeds ${limit}B limit`);
    }
    return true;
  }
}
