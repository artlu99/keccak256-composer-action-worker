import { Button, Frog } from "frog";
import { slide } from "./slide";

const title = "Keccak256 Composer Action";
const browserLocation = "https://keccak256-composer-action.artlu.workers.dev";
const externalRoute = "https://keccak256-composer-action.vercel.app/encode";
const aboutUrl = "https://github.com/artlu99/keccak256-composer-action";
const aboutUrlWorker =
	"https://github.com/artlu99/keccak256-composer-action-worker";

export const app = new Frog({ browserLocation, title, verify: false });

app
	.frame("/redirect", (c) => {
		const { frameData } = c;
		if (frameData) {
			const { fid, hash } = frameData.castId;
			console.log(`${frameData.fid} asked to redirect ${fid}:${hash}`);

			const textToDisplay = `click button to open 🐟 Snappa with this cast pre-loaded

add the Mini App
to enable Share Action`;
			return c.res({
				image: `https://frames-cached-dynamic-og.artlu.workers.dev/og?mainText=na&description=${encodeURIComponent(
					textToDisplay,
				)}&footerText=na&style=5`,
				intents: [
					<Button.Link
						key="snappa-deeplink"
						href={`https://snappa-mini-app.artlu.workers.dev/sassy?castHash=${hash}&castFid=${fid}`}
					>
						Mobile
					</Button.Link>,
					<Button.Link
						key="snappa-permalink"
						href={`https://farcaster.xyz/miniapps/zTVU_TOaKbz1/snappa--/sassy?castHash=${hash}&castFid=${fid}`}
					>
						Snappa
					</Button.Link>,
				],
			});
		}
		return c.res({
			image: slide(
				"gradient",
				"this endpoint should be called via Share Action",
			),
		});
	})
	.castAction(
		"/cast-action",
		(c) => c.res({ type: "frame", path: "/redirect" }),
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
			// generate a secure random one-time nonce
			const nonce = crypto.getRandomValues(new Uint8Array(16)).join("");
			// awesome bug find 2025-03-30: h/t horsefacts.eth and accountless.eth
			const oneTimeUrl = `${browserLocation}/encode?nonce=${encodeURIComponent(nonce)}`;

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
