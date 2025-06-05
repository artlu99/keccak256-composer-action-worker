import { Button, Frog } from "frog";
import { neynar } from "frog/hubs";
import { neynar as neynarMiddleware } from "frog/middlewares";
import {
	checkIsChannelEnabled,
	disableChannel,
	enableChannel,
	getTextByCastHash,
} from "./graphql";
import { RedisCache } from "./lib/redis";
import { getChannelIdFromChannelUrl, getChannelOwner } from "./lib/warpcast";
import { type Bindings, NEYNAR_API_KEY } from "./secrets";
import { slide } from "./slide";

const title = "Keccak256 Composer Action";
const browserLocation = "https://keccak256-composer-action.artlu.workers.dev";
const externalRoute = "https://keccak256-composer-action.vercel.app/encode";
const aboutUrl = "https://github.com/artlu99/keccak256-composer-action";
const aboutUrlWorker =
	"https://github.com/artlu99/keccak256-composer-action-worker";
const qrCode =
	"https://r2.fc-clients-cast-action.artlu.xyz/qr-install-keccak256-composer-action.png";
const DO_NOT_TRACK_AFTER = 1743523200000;
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
		}),
	)
	.frame("ephemeral-frame", async (c) => {
		const { verified, buttonValue, frameData } = c;

		if (verified && frameData) {
			const { fid: viewerFid } = frameData;

			const cast = c.var.cast;
			if (cast) {
				const { hash, text, author, rootParentUrl } = cast;

				let textToDisplay: string = text;
				let fullPlaintext: string = text;
				let decodedText: string | undefined = undefined;
				try {
					const res = await getTextByCastHash(hash, frameData.fid, c.env);
					textToDisplay =
						buttonValue === "full" ? res.text : (res.decodedText ?? res.text);
					fullPlaintext = res.text;
					decodedText = res.decodedText;
				} catch (error) {
					console.error("Error in Whistles Yoga:", error);
				}
				if (Date.now() < DO_NOT_TRACK_AFTER) {
					try {
						// Anonymously log cast decoding
						const redisCache = new RedisCache(c.env);
						await redisCache.incrementActionUsage(
							viewerFid,
							hash,
							author.fid,
							author.username,
							rootParentUrl,
						);
					} catch (error) {
						console.error("Error in Redis logging:", error);
					}
				}
				// check if viewerFid is an owner of the channel
				const channelId = getChannelIdFromChannelUrl(cast.rootParentUrl);
				const channelOwner = await getChannelOwner(channelId);
				const isChannelEnabled = channelId
					? await checkIsChannelEnabled(channelId, c.env)
					: false;

				return c.res({
					image: `https://frames-cached-dynamic-og.artlu.workers.dev/og?mainText=na&description=${encodeURIComponent(
						textToDisplay,
					)}&footerText=na&style=5`,
					intents: [
						...(viewerFid === channelOwner
							? [
									<Button action="/toggle-channel" key="toggle-channel">
										{isChannelEnabled ? "Disable" : "Enable"} Channel
									</Button>,
								]
							: []),
						<Button action="/qrcode" key="qrcode">
							QR Code
						</Button>,
						...(decodedText &&
						buttonValue !== "full" &&
						decodedText.trim() !== fullPlaintext.trim()
							? [
									<Button
										action="/ephemeral-frame"
										value="full"
										key="show-more"
									>
										Show more
									</Button>,
								]
							: []),
					],
				});
			}
			return c.res({
				image: slide("black", "Cast not found, possible Hub error"),
			});
		}
		return c.res({
			image: slide(
				"black",
				"this endpoint should be called via verified Cast Action",
			),
		});
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
								`fid ${viewerFid} disabled Whistles as channel owner of /${channelId}`,
							),
						});
					}
					await enableChannel(channelId, rootParentUrl, c.env);
					return c.res({
						image: slide(
							"gradient",
							`fid ${viewerFid} enabled Whistles as channel owner of /${channelId}`,
						),
					});
				}
				return c.res({
					image: slide(
						"gradient",
						`fid ${viewerFid} not channel owner of /${channelId}, cannot toggle channel permissions`,
					),
				});
			}
			return c.res({
				image: slide("black", "cast not found"),
			});
		}
		return c.res({
			image: slide(
				"black",
				"this endpoint should be called via verified Cast Action",
			),
		});
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
		},
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

			// generate a secure random one-time nonce
			const nonce = crypto.getRandomValues(new Uint8Array(16)).join("");
			const redisCache = new RedisCache(c.env);
			await redisCache.setNonce(nonce);
			// awesome bug find 2025-03-30: h/t horsefacts.eth and accountless.eth
			const oneTimeUrl = `${browserLocation}/encode?fid=${fid}&text=${encodeURIComponent(
				text,
			)}&timestamp=${timestamp}&messageHash=${encodeURIComponent(
				messageHash,
			)}&nonce=${encodeURIComponent(nonce)}`;

			return c.res({ title, url: oneTimeUrl });
		},
		{
			name: "Keccak256",
			description: "Keccak256 Composer",
			icon: "eye-closed",
			aboutUrl: aboutUrlWorker,
			imageUrl:
				"https://r2.fc-clients-cast-action.artlu.xyz/Keccak256-logo-256-256.png",
		},
	)
	.hono.get("/encode", (c) => {
		const url = new URL(externalRoute);
		url.search = c.req.url.split("?")[1] || ""; // Copy all query parameters

		// Return an HTML page that loads the external content in an iframe
		return new Response(
			`<!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>
            body, html {
              margin: 0;
              padding: 0;
              min-width: 375px;
              min-height: 667px;
              width: 100%;
              height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            iframe {
              min-width: 375px;
              min-height: 667px;
              width: 100%;
              height: 100%;
              max-width: 100vw;
              max-height: 100vh;
              border: none;
              margin: 0;
              padding: 0;
              overflow: hidden;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          <iframe src="${url.toString()}"></iframe>
          <script>
            // Listen for messages from the iframe and forward them to the parent
            window.addEventListener('message', function(event) {
              // Only forward messages from our trusted external domain
              if (event.origin === '${new URL(externalRoute).origin}') {
                window.parent.postMessage(event.data, '*');
              }
            });
          </script>
        </body>
      </html>`,
			{ headers: { "Content-Type": "text/html" } },
		);
	});

export default app;
