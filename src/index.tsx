import { Button, Frog } from "frog";
import { html } from "hono/html";
import { slide } from "./slide";

const title = "Keccak256 Composer Action";
const browserLocation = "https://keccak256-composer-action.artlu.workers.dev";
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
						key="deeplink"
						href={`https://snappa-mini-app.artlu.workers.dev/sassy?castHash=${hash}&castFid=${fid}`}
					>
						Mobile
					</Button.Link>,
					<Button.Link
						key="permalink"
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
			description: "Read Keccak256 hashes",
			aboutUrl,
		},
	)
	.composerAction(
		"/",
		async (c) => {
			const oneTimeUrl = `${browserLocation}/encode`;

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
		const currentYear = new Date().getFullYear();

		return c.html(
			html`<!DOCTYPE html>
<html>
	<head>
		<title>${title}</title>
		<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
		<link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
		<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
	</head>
	<body>
		<div class="artboard phone-1">
			<div class="card w-96 bg-base-100">
				<div class="card-body">
					<div class="flex flex-col justify-center">
						<h2 class="text-xl text-warning">
							It's ${currentYear}, fam.
							<br />
							Time to use
							<br />🐟 Snappa Mini App
						</h2>
						<br />
						<p class="text-sm italic my-5 text-accent">
							<a
								href="https://farcaster.xyz/miniapps/zTVU_TOaKbz1/snappa--"
								target="_blank"
								rel="noopener noreferrer"
							>
								https://farcaster.xyz/miniapps/zTVU_TOaKbz1/snappa--
							</a>
						</p>
					</div>
				</div>
			</div>
		</div>
	</body>
</html>`,
			{ headers: { "Content-Type": "text/html" } },
		);
	});

export default app;
