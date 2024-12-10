import { fetcher } from "itty-fetcher";
import { z } from "zod";
import { legacyChannels } from "./legacy-channels";

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

const getChannel = async (
  channelId: string
): Promise<WarpcastChannel | null> => {
  try {
    const data = await fetcher().get(
      `${WARPCAST_API_URL}/v1/channel?channelId=${channelId}`
    );
    const validated = WarpcastChannelResponseSchema.parse(data);
    return validated.result.channel;
  } catch (e) {
    console.error(
      "Failed to parse Warpcast Channel API response for channelId:",
      channelId,
      e
    );
    return null;
  }
};

export const getChannelOwner = async (
  channelId: string | undefined
): Promise<number | undefined> => {
  if (!channelId) {
    return undefined;
  }
  const owner = await getChannel(channelId);
  return owner?.leadFid;
};

export const getChannelIdFromChannelUrl = (channelUrl: string | undefined) => {
  return (
    legacyChannels.find(
      (c: { url: string; id: string }) => c.url === channelUrl
    )?.id ?? channelUrl?.split("/").pop()
  );
};
