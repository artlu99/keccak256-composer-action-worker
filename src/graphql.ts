import { GraphQLClient, gql } from "graphql-request";
import { Bindings } from "./secrets";

export const getTextByCastHash = async (
  castHash: string,
  fid: number,
  env: Bindings
) => {
  const graphQLClient = new GraphQLClient(env.YOGA_WHISTLES_ENDPOINT, {
    headers: { authorization: `Bearer ${env.YOGA_WHISTLES_BEARER}` },
  });

  try {
    const cast = await graphQLClient.request<{
      getTextByCastHash: {
        isDecrypted: boolean;
        timestamp: number;
        text: string;
      };
    }>(
      gql`
        query MyQuery($castHash: String!, $fid: Int!) {
          getTextByCastHash(castHash: $castHash, viewerFid: $fid) {
            isDecrypted
            timestamp
            text
          }
        }
      `,
      {
        castHash,
        fid,
      }
    );
    return cast.getTextByCastHash;
  } catch (error: any) {
    if (error.response) {
      console.error("Error response:", error);
    }
    throw new Error("Failed to get cast by hash");
  }
};

export const checkIsChannelEnabled = async (
  channelId: string,
  env: Bindings
) => {
  const graphQLClient = new GraphQLClient(env.YOGA_WHISTLES_ENDPOINT, {
    headers: { authorization: `Bearer ${env.YOGA_WHISTLES_BEARER}` },
  });

  try {
    const enabledChannels = await graphQLClient.request<{
      getEnabledChannels: string[];
    }>(
      gql`
        query getEnabledChannels {
          getEnabledChannels
        }
      `
    );
    return enabledChannels.getEnabledChannels.includes(channelId);
  } catch (error: any) {
    if (error.response) {
      console.error("Error response:", error);
    }
    throw new Error("Failed to get channels list");
  }
};

export const enableChannel = async (
  channelId: string,
  parentUrl: string,
  env: Bindings
) => {
  const graphQLClient = new GraphQLClient(env.YOGA_WHISTLES_ENDPOINT, {
    headers: { authorization: `Bearer ${env.YOGA_WHISTLES_BEARER}` },
  });

  try {
    const enableChannel = await graphQLClient.request<{
      EnableChannel: {
        message: string;
        success: string;
      };
    }>(
      gql`
        mutation EnableChannel($channelId: String!, $parentUrl: String!) {
          enableChannel(
            input: { channelId: $channelId, parentUrl: $parentUrl }
          ) {
            message
            success
          }
        }
      `,
      {
        channelId,
        parentUrl,
      }
    );
    return enableChannel;
  } catch (error: any) {
    if (error.response) {
      console.error("Error response:", error);
    }
    throw new Error("Failed to enable channel");
  }
};

export const disableChannel = async (channelId: string, env: Bindings) => {
  const graphQLClient = new GraphQLClient(env.YOGA_WHISTLES_ENDPOINT, {
    headers: { authorization: `Bearer ${env.YOGA_WHISTLES_BEARER}` },
  });

  try {
    const disableChannel = await graphQLClient.request<{
      disableChannel: {
        message: string;
        success: string;
      };
    }>(
      gql`
        mutation DisableChannel($channelId: String!) {
          disableChannel(
            input: { channelId: $channelId }
          ) {
            message
            success
          }
        }
      `,
      {
        channelId,
      }
    );
    return disableChannel;
  } catch (error: any) {
    if (error.response) {
      console.error("Error response:", error);
    }
    throw new Error("Failed to disable channel");
  }
};
