import { Redis } from "@upstash/redis/cloudflare";
import { Button, Frog } from "frog";
import { neynar } from "frog/hubs";
import { neynar as neynarMiddleware } from "frog/middlewares";
import {
  checkIsChannelEnabled,
  disableChannel,
  enableChannel,
  getTextByCastHash,
} from "./graphql";
import { getChannelIdFromChannelUrl, getChannelOwner } from "./lib/warpcast";
import { Bindings, NEYNAR_API_KEY } from "./secrets";
import { slide } from "./slide";

const title = "Keccak256 Composer Action";
const browserLocation = "https://keccak256-composer-action.artlu.workers.dev";
const externalRoute = "https://keccak256-composer-action.vercel.app/encode";
const aboutUrl = "https://github.com/artlu99/keccak256-composer-action";
const aboutUrlWorker =
  "https://github.com/artlu99/keccak256-composer-action-worker";
const qrCode =
  "https://r2.fc-clients-cast-action.artlu.xyz/qr-install-keccak256-composer-action.png";

export const app = new Frog<{ Bindings: Bindings }>({
  browserLocation,
  hub: neynar({ apiKey: NEYNAR_API_KEY }),
  title,
  verify: true,
});

app
  .use(
    neynarMiddleware({
      apiKey: NEYNAR_API_KEY,
      features: ["interactor", "cast"],
    })
  )
  .frame("ephemeral-frame", async (c) => {
    const { verified, buttonValue, frameData } = c;

    if (verified && frameData) {
      const { fid: viewerFid } = frameData;

      const cast = c.var.cast;
      if (cast) {
        const { hash, text } = cast;

        let textToDisplay: string = text;
        let fullPlaintext: string = text;
        let decodedText: string | undefined = undefined;
        try {
          const res = await getTextByCastHash(hash, frameData.fid, c.env);
          textToDisplay =
            buttonValue === "full" ? res.text : res.decodedText ?? res.text;
          fullPlaintext = res.text;
          decodedText = res.decodedText;
        } catch (error) {
          console.error("Error in Whistles Yoga:", error);
        }

        // check if viewerFid is an owner of the channel
        const channelId = getChannelIdFromChannelUrl(cast.rootParentUrl);
        const channelOwner = await getChannelOwner(channelId);
        const isChannelEnabled = channelId
          ? await checkIsChannelEnabled(channelId, c.env)
          : false;

        return c.res({
          image: slide(
            "black",
            textToDisplay,
            textToDisplay.length <= 160 ? 60 : 30
          ),
          intents: [
            ...(viewerFid === channelOwner
              ? [
                  <Button action="/toggle-channel">
                    {isChannelEnabled ? "Disable" : "Enable"} Channel
                  </Button>,
                ]
              : []),
            <Button action="/qrcode">QR Code</Button>,
            ...(decodedText &&
            buttonValue !== "full" &&
            decodedText.trim() !== fullPlaintext.trim()
              ? [
                  <Button action="/ephemeral-frame" value="full">
                    Show more
                  </Button>,
                ]
              : []),
          ],
        });
      } else {
        return c.res({
          image: slide("black", "Cast not found, possible Hub error"),
        });
      }
    } else {
      return c.res({
        image: slide(
          "black",
          "this endpoint should be called via verified Cast Action"
        ),
      });
    }
  })
  .frame("/qrcode", (c) => c.res({ image: qrCode, imageAspectRatio: "1:1" }))
  .frame("/toggle-channel", async (c) => {
    const { verified, frameData } = c;

    if (verified && frameData) {
      const { fid: viewerFid } = frameData;

      if (c.var.cast) {
        const { rootParentUrl } = c.var.cast;

        // check if viewerFid is an owner of the channel
        const channelId = getChannelIdFromChannelUrl(rootParentUrl);
        const channelOwner = await getChannelOwner(channelId);
        const isChannelEnabled = channelId
          ? await checkIsChannelEnabled(channelId, c.env)
          : false;

        if (channelId && channelOwner === viewerFid) {
          if (isChannelEnabled) {
            await disableChannel(channelId, c.env);
            return c.res({
              image: slide(
                "gradient",
                `fid ${viewerFid} disabled Whistles as channel owner of /${channelId}`
              ),
            });
          } else {
            await enableChannel(channelId, rootParentUrl, c.env);
            return c.res({
              image: slide(
                "gradient",
                `fid ${viewerFid} enabled Whistles as channel owner of /${channelId}`
              ),
            });
          }
        } else {
          return c.res({
            image: slide(
              "gradient",
              `fid ${viewerFid} not channel owner of /${channelId}, cannot toggle channel permissions`
            ),
          });
        }
      } else {
        return c.res({
          image: slide("black", "cast not found"),
        });
      }
    } else {
      return c.res({
        image: slide(
          "black",
          "this endpoint should be called via verified Cast Action"
        ),
      });
    }
  })
  .castAction(
    "/cast-action",
    (c) => {
      return c.res({ type: "frame", path: "/ephemeral-frame" });
    },
    {
      name: "Read SassyHash",
      icon: "eye",
      description: "Read Keccak256 hashes sent via Composer Action",
      aboutUrl,
    }
  )
  .composerAction(
    "/",
    async (c) => {
      const { actionData } = c;
      const {
        fid,
        messageHash,
        timestamp,
        state: {
          cast: { text },
        },
      } = actionData;

      const redis = new Redis({
        url: c.env.UPSTASH_REDIS_REST_URL,
        token: c.env.UPSTASH_REDIS_REST_TOKEN,
      });

      // generate one-time nonce
      const nonce = crypto.getRandomValues(new Uint8Array(16)).join(""); // Generate a secure random nonce
      await redis.set("nonce-" + nonce, true, { ex: 600 }); // 10 minutes TTL
      const oneTimeUrl = `${browserLocation}/encode?fid=${fid}&text=${text}&timestamp=${timestamp}&messageHash=${messageHash}&nonce=${nonce}`;

      return c.res({ title, url: oneTimeUrl });
    },
    {
      name: "Keccak256",
      description: "Keccak256 Composer",
      icon: "eye-closed",
      aboutUrl: aboutUrlWorker,
      imageUrl:
        "https://r2.fc-clients-cast-action.artlu.xyz/Keccak256-logo-256-256.png",
    }
  )
  .hono.get("/encode", (c) => {
    const url = new URL(externalRoute);
    url.search = c.req.url.split("?")[1] || ""; // Copy all query parameters
    console.log(url.toString());

    const useHttpRedirect = true;
    if (useHttpRedirect) {
      return Response.redirect(url.toString(), 302);
    } else {
      // rather than returning a redirect response, return the smallest possible html page with an immediate redirect
      return new Response(
        `<html><body>Hello<script>window.location.href = "${url.toString()}";</script></body></html>`,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    }
  });

export default app;
