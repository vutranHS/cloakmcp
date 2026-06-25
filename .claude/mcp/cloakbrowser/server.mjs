#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { ensureBinary, launch } from "cloakbrowser";

const blockedResourceTypes = new Set(["stylesheet", "image", "media", "font"]);
const blockedHosts = new Set(["localhost", "local", "0.0.0.0"]);

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    return parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
      parts[0] >= 224;
  }

  const normalized = ip.toLowerCase();
  return normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized === "::";
}

async function assertPublicHttpUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  const hostname = url.hostname.toLowerCase();
  if (blockedHosts.has(hostname) || hostname.endsWith(".localhost")) {
    throw new Error("Localhost URLs are not allowed.");
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error("Private network URLs are not allowed.");
    return url.href;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("Private network URLs are not allowed.");
  }

  return url.href;
}

async function readUrl({ url, timeoutMs = 30000 }) {
  const startUrl = await assertPublicHttpUrl(url);
  await ensureBinary();

  const browser = await launch({ headless: true });
  try {
    const page = await browser.newPage();

    await page.route("**/*", async route => {
      const request = route.request();
      if (blockedResourceTypes.has(request.resourceType())) return route.abort();

      if (request.isNavigationRequest()) {
        try {
          await assertPublicHttpUrl(request.url());
        } catch {
          return route.abort();
        }
      }

      return route.continue();
    });

    const response = await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForLoadState("networkidle", { timeout: Math.min(timeoutMs, 10000) }).catch(() => {});

    const finalUrl = await assertPublicHttpUrl(page.url());
    const title = (await page.title()).trim();
    const text = await page.evaluate(() => document.body?.innerText?.replace(/\n{3,}/g, "\n\n").trim() || "");

    return {
      url: finalUrl,
      status: response?.status() ?? null,
      title,
      text,
      source: "cloakbrowser"
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

const server = new McpServer({
  name: "cloakbrowser",
  version: "0.1.0"
});

server.registerTool(
  "cloakbrowser_read_url",
  {
    title: "Read URL with CloakBrowser",
    description: "Read plain text from a public URL using CloakBrowser headless while blocking CSS, images, fonts, and media. Do not use for paywalls, CAPTCHA, login walls, or access controls.",
    inputSchema: {
      url: z.string().url(),
      timeoutMs: z.number().int().min(1000).max(120000).optional()
    }
  },
  async input => {
    const result = await readUrl(input);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
);

await server.connect(new StdioServerTransport());
