import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { contentTypeFor } from "../files.js";
import { distDir } from "../paths.js";

export function startPreview(port: number): http.Server {
  const server = http.createServer((request, response) => {
    void handleRequest(request, response);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use.`);
      process.exit(1);
    }
    console.error(error.message);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`Preview at http://localhost:${port}`);
  });

  return server;
}

async function handleRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
): Promise<void> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", "http://localhost");
  const resolved = await resolveFile(url.pathname);

  if (!resolved) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(request.method === "HEAD" ? undefined : "Not found");
    return;
  }

  const body = await fs.readFile(resolved.filePath);
  response.writeHead(resolved.status, {
    "Content-Type": contentTypeFor(resolved.filePath),
    "Content-Length": body.byteLength,
    "Cache-Control": "no-cache",
  });
  response.end(request.method === "HEAD" ? undefined : body);
}

async function resolveFile(
  urlPath: string,
): Promise<{ filePath: string; status: number } | undefined> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return errorDocument(400);
  }

  const relative = decoded.replace(/^\/+/, "");
  const candidate = path.resolve(distDir, relative);
  const fromRoot = path.relative(distDir, candidate);

  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) {
    return errorDocument(400);
  }

  const direct = await fileIfExists(candidate);
  if (direct) return { filePath: direct, status: 200 };

  const index = await fileIfExists(path.join(candidate, "index.html"));
  if (index) return { filePath: index, status: 200 };

  return errorDocument(404);
}

async function errorDocument(
  status: number,
): Promise<{ filePath: string; status: number } | undefined> {
  const errorFile = path.join(distDir, "404.html");
  const existing = await fileIfExists(errorFile);
  if (!existing) return undefined;
  return { filePath: existing, status };
}

async function fileIfExists(filePath: string): Promise<string | undefined> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() ? filePath : undefined;
  } catch {
    return undefined;
  }
}
