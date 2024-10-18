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
