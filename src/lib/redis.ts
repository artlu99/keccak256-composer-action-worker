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
    viewerFid: number,
    castHash: string,
    fid: number,
    rootParentUrl: string,
    ttl: number = DEFAULT_TTL
  ): Promise<void> {
    const usageKey = `${fid}-${rootParentUrl}-${castHash}`;
    const interactionsSetKey = `interactions-${usageKey}`;

    // Using SHA-1 for viewer ID hashing:
    // - Faster than SHA-256 (~30% performance improvement)
    // - Shorter output (40 chars vs 64) = less Redis storage
    // - Sufficient for deduplication purposes (not used for security)
    const hashedViewerId = await crypto.subtle
      .digest("SHA-1", new TextEncoder().encode(viewerFid.toString()))
      .then((hash) =>
        Array.from(new Uint8Array(hash))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      );

    // SADD returns 1 if the element was added, 0 if it already existed
    const wasAdded = await this.redis.sadd(interactionsSetKey, hashedViewerId);

    if (wasAdded === 1) {
      await this.redis.hincrby("action-usage", usageKey, 1);
    }

    await this.redis.expire(interactionsSetKey, ttl);
    await this.redis.expire("action-usage", ttl);
  }
}
