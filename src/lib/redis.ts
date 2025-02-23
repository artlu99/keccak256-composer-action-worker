import { Redis } from "@upstash/redis/cloudflare";
import { Bindings } from "../secrets";

const DEFAULT_TTL = 60 * 60 * 24 * 7; // 7 days

export class RedisCache {
  private redis: Redis;

  constructor(env: Bindings) {
    this.redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  async setNonce(nonce: string, ttl: number = 600): Promise<void> {
    // 10 minutes default
    await this.redis.set("nonce-" + nonce, true, { ex: ttl });
  }

  async incrementActionUsage(
    castHash: string,
    fid: number,
    rootParentUrl: string,
    ttl: number = DEFAULT_TTL
  ): Promise<void> {
    const actionUsageKey = "action-usage";
    await this.redis.hincrby(
      actionUsageKey,
      `${fid}-${rootParentUrl}-${castHash}`,
      1
    );
    await this.redis.expire(actionUsageKey, ttl);
  }
}
