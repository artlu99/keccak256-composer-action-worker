import { fetcher } from "itty-fetcher";
import { z } from "zod";

const WARPCAST_API_URL = "https://api.warpcast.com";

interface WarpcastChannel {
  id: string;
  url: string;
  name: string;
  description: string;
  descriptionMentions: number[];
  descriptionMentionsPositions: number[];
  imageUrl?: string;
  headerImageUrl?: string;
  leadFid: number;
  moderatorFids: number[];
  createdAt: number;
  followerCount: number;
  memberCount: number;
  pinnedCastHash?: string;
  publicCasting: boolean;
  externalLink?: {
    title: string;
    url: string;
  };
}

const WarpcastChannelResponseSchema = z.object({
  result: z.object({
    channel: z.object({
      id: z.string(),
      url: z.string(),
      name: z.string(),
      description: z.string(),
      descriptionMentions: z.array(z.number()),
      descriptionMentionsPositions: z.array(z.number()),
      imageUrl: z.string().optional(),
      headerImageUrl: z.string().optional(),
      leadFid: z.number(),
      moderatorFids: z.array(z.number()),
      createdAt: z.number(),
      followerCount: z.number(),
      memberCount: z.number(),
      pinnedCastHash: z.string().optional(),
      publicCasting: z.boolean(),
      externalLink: z
        .object({
          title: z.string(),
          url: z.string(),
        })
        .optional(),
    }),
  }),
});

const getChannel = async (channelId: string): Promise<WarpcastChannel> => {
  const data = await fetcher().get(
    `${WARPCAST_API_URL}/v1/channel?channelId=${channelId}`
  );
  try {
    const validated = WarpcastChannelResponseSchema.parse(data);
    return validated.result.channel;
  } catch (e) {
    console.error("Failed to parse Warpcast API Channel response", e);
    throw new Error("Failed to parse Warpcast API Channel response");
  }
};

export const getChannelOwner = async (
  channelId: string | undefined
): Promise<number | undefined> => {
  if (!channelId) {
    return undefined;
  }
  const owner = await getChannel(channelId);
  return owner.leadFid;
};

export const getChannelIdFromChannelUrl = (channelUrl: string | undefined) => {
  if (
    // TODO: replace temporary hack
    channelUrl ===
    "chain://eip155:7777777/erc721:0xe96c21b136a477a6a97332694f0caae9fbb05634"
  ) {
    return "music";
  }
  return channelUrl?.split("/").pop();
};
