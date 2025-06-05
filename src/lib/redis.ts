import { Redis } from "@upstash/redis/cloudflare";
import type { Bindings } from "../secrets";

const DEFAULT_TTL = 60 * 60 * 24 * 7; // 7 days

export class RedisCache {
	private redis: Redis;
	private salt: string;

	constructor(env: Bindings) {
		this.redis = new Redis({
			url: env.UPSTASH_REDIS_REST_URL,
			token: env.UPSTASH_REDIS_REST_TOKEN,
		});
		this.salt = env.ANALYTICS_SALT;
	}

	async setNonce(nonce: string, ttl = 600): Promise<void> {
		// 10 minutes default
		await this.redis.set(`nonce-${nonce}`, true, { ex: ttl });
	}

	async incrementActionUsage(
		viewerFid: number,
		castHash: string,
		fid: number,
		username: string,
		rootParentUrl: string,
		ttl: number = DEFAULT_TTL,
	): Promise<void> {
		const usageKey = `${fid}-${username}-${rootParentUrl}-${castHash}`;
		const interactionsSetKey = `interactions-${castHash}`;

		const hashedViewerId = await crypto.subtle
			.digest("SHA-1", new TextEncoder().encode(`${this.salt}-${viewerFid}`))
			.then((hash) =>
				Array.from(new Uint8Array(hash))
					.map((b) => b.toString(16).padStart(2, "0"))
					.join(""),
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
