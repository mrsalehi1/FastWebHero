import fs from "node:fs";
import path from "node:path";
import { buildSite } from "./build/index.js";
import { loadDeployConfig, loadSiteConfig } from "./config.js";
import { deploySite } from "./deploy/index.js";
import { distDir, siteDir } from "./paths.js";
import { startPreview } from "./preview/server.js";

const command = process.argv[2];

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});

async function main(): Promise<void> {
  switch (command) {
    case "build":
      await buildSite();
      return;
    case "dev":
      await buildSite();
      watchAndServe(readPort());
      return;
    case "preview":
      await ensureBuild();
      startPreview(readPort());
      return;
    case "deploy":
      await deploy();
      return;
    case "publish":
      await buildSite();
      await deploy();
      return;
    default:
      console.log(`Usage: tsx src/cli.ts <command>

Commands:
  build      Render site/ into dist/
  dev        Build, serve dist/, and rebuild when site/ changes
  preview    Serve the current dist/ folder
  deploy     Upload dist/ and enable S3 website hosting
  publish    Build, then deploy

Options:
  --port <number>   Preview port (default 3000)
`);
      process.exit(command ? 1 : 0);
  }
}

async function deploy(): Promise<void> {
  const site = await loadSiteConfig();
  const config = loadDeployConfig(site);
  if (config.bucket.includes(".")) {
    console.warn("Bucket names that contain dots are harder to host. Prefer a name without dots.");
  }

  try {
    await deploySite(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/AccessDenied|BlockPublic|NotAuthorized/i.test(message)) {
      throw new Error(
        `${message}\n\nCheck that these credentials can manage the bucket, and that account Block Public Access allows a public bucket policy. The README lists the IAM actions deploy uses.`,
      );
    }
    throw error;
  }
}

async function ensureBuild(): Promise<void> {
  if (!fs.existsSync(path.join(distDir, "index.html"))) {
    await buildSite();
  }
}

function watchAndServe(port: number): void {
  startPreview(port);

  let timer: NodeJS.Timeout | undefined;
  let building = false;
  let queued = false;

  const rebuild = async (): Promise<void> => {
    if (building) {
      queued = true;
      return;
    }

    building = true;
    try {
      await buildSite();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
    } finally {
      building = false;
      if (queued) {
        queued = false;
        await rebuild();
      }
    }
  };

  fs.watch(siteDir, { recursive: true }, () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void rebuild();
    }, 150);
  });

  console.log("Watching site/ for changes");
}

function readPort(): number {
  const args = process.argv.slice(3);
  const flagIndex = args.indexOf("--port");
  let raw = process.env.PORT;

  if (flagIndex !== -1) {
    raw = args[flagIndex + 1];
    if (!raw || raw.startsWith("--")) {
      throw new Error("Expected a number after --port");
    }
  }

  if (!raw) return 3000;

  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${raw}`);
  }
  return port;
}
