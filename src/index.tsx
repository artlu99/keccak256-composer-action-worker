import { Redis } from "@upstash/redis/cloudflare";
import { Button, Frog } from "frog";
import { neynar } from "frog/hubs";
import { neynar as neynarMiddleware } from "frog/middlewares";
import { getTextByCastHash } from "./graphql";
import { Bindings, NEYNAR_API_KEY } from "./secrets";
import { slide } from "./slide";

const title = "Keccak256 Composer Action";
const browserLocation = "https://keccak256-composer-action.vercel.app";
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
    const { verified, frameData } = c;

    if (verified && frameData) {
      const cast = c.var.cast;
      if (cast) {
        const { hash, text } = cast;

        let fullPlaintext = text;
        try {
          const res = await getTextByCastHash(hash, frameData.fid, c.env);
          fullPlaintext = res.text;
        } catch (error) {
          console.error("Error in Whistles Yoga:", error);
        }

        return c.res({
          image: slide(
            "black",
            fullPlaintext,
            fullPlaintext.length <= 80 ? 60 : 30
          ),
          intents: [<Button action="/qrcode">Composer QR Code</Button>],
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
  .castAction(
    "/cast-action",
    (c) => {
      return c.res({ type: "frame", path: "/ephemeral-frame" });
    },
    {
      name: "Read Keccak256",
      icon: "eye",
      description: "Read a message hashed with Keccak256 Composer Action",
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
      // TODO: more secure nonce
      const nonce = (fid + timestamp + 42069).toString(16);
      await redis.set("nonce-" + nonce, true, { ex: 600 }); // 10 minutes TTL
      const oneTimeUrl =
        `${browserLocation}/encode` +
        `?fid=${fid}&text=${text}&timestamp=${timestamp}&messageHash=${messageHash}&nonce=${nonce}`;

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
  );

export default app;
