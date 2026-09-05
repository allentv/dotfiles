#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chromium, type Browser, type Page, type BrowserContext } from "playwright";

// ── State ───────────────────────────────────────────────────────────────
let browser: Browser | null = null;
let context: BrowserContext | null = null;
const pages = new Map<string, Page>();
let pageCounter = 0;

async function ensureBrowser(): Promise<BrowserContext> {
  if (context) return context;
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  return context;
}

function getPage(id: string): Page {
  const p = pages.get(id);
  if (!p) throw new Error(`No page with id "${id}". Use browser_open first.`);
  return p;
}

// ── Server ──────────────────────────────────────────────────────────────
const server = new McpServer({
  name: "browser",
  version: "0.1.0",
});

// ── Tools ───────────────────────────────────────────────────────────────

server.tool(
  "browser_open",
  "Open a URL in a new tab and return the page id",
  { url: z.string().url() },
  async ({ url }) => {
    const ctx = await ensureBrowser();
    const page = await ctx.newPage();
    const id = String(++pageCounter);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    pages.set(id, page);
    const title = await page.title();
    return {
      content: [{ type: "text", text: `Opened "${title}" → page ${id}` }],
    };
  },
);

server.tool(
  "browser_close",
  "Close a tab by page id, or all tabs if no id given",
  { page_id: z.string().optional() },
  async ({ page_id }) => {
    if (page_id) {
      const p = pages.get(page_id);
      if (p) {
        await p.close().catch(() => {});
        pages.delete(page_id);
        return { content: [{ type: "text", text: `Closed page ${page_id}` }] };
      }
      return { content: [{ type: "text", text: `Page ${page_id} not found` }] };
    }
    for (const [id, p] of pages) {
      await p.close().catch(() => {});
      pages.delete(id);
    }
    return { content: [{ type: "text", text: "Closed all pages" }] };
  },
);

server.tool(
  "browser_navigate",
  "Navigate a tab to a new URL",
  { page_id: z.string(), url: z.string().url() },
  async ({ page_id, url }) => {
    const page = getPage(page_id);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const title = await page.title();
    return {
      content: [{ type: "text", text: `Navigated to "${title}" (${url})` }],
    };
  },
);

server.tool(
  "browser_screenshot",
  "Take a screenshot of a tab. Returns base64 PNG.",
  { page_id: z.string(), full_page: z.boolean().optional() },
  async ({ page_id, full_page }) => {
    const page = getPage(page_id);
    const buf = await page.screenshot({ fullPage: full_page ?? false });
    return {
      content: [{ type: "image", data: buf.toString("base64"), mimeType: "image/png" }],
    };
  },
);

server.tool(
  "browser_click",
  "Click an element by CSS selector or text",
  { page_id: z.string(), selector: z.string() },
  async ({ page_id, selector }) => {
    const page = getPage(page_id);
    await page.locator(selector).first().click({ timeout: 10_000 });
    return { content: [{ type: "text", text: `Clicked "${selector}"` }] };
  },
);

server.tool(
  "browser_type",
  "Type text into an input/textarea. Use browser_fill for clearing first.",
  { page_id: z.string(), selector: z.string(), text: z.string() },
  async ({ page_id, selector, text }) => {
    const page = getPage(page_id);
    await page.locator(selector).first().fill(text);
    return { content: [{ type: "text", text: `Typed into "${selector}"` }] };
  },
);

server.tool(
  "browser_fill",
  "Clear and fill an input field",
  { page_id: z.string(), selector: z.string(), value: z.string() },
  async ({ page_id, selector, value }) => {
    const page = getPage(page_id);
    await page.locator(selector).first().fill(value);
    return { content: [{ type: "text", text: `Filled "${selector}"` }] };
  },
);

server.tool(
  "browser_press",
  "Press a keyboard key (Enter, Tab, Escape, ArrowDown, etc.)",
  { page_id: z.string(), key: z.string() },
  async ({ page_id, key }) => {
    const page = getPage(page_id);
    await page.keyboard.press(key);
    return { content: [{ type: "text", text: `Pressed ${key}` }] };
  },
);

server.tool(
  "browser_select",
  "Select an option from a <select> element",
  { page_id: z.string(), selector: z.string(), value: z.string() },
  async ({ page_id, selector, value }) => {
    const page = getPage(page_id);
    await page.locator(selector).first().selectOption(value);
    return { content: [{ type: "text", text: `Selected "${value}" in "${selector}"` }] };
  },
);

server.tool(
  "browser_extract",
  "Extract text content from the page or a specific selector",
  { page_id: z.string(), selector: z.string().optional() },
  async ({ page_id, selector }) => {
    const page = getPage(page_id);
    const text = selector
      ? await page.locator(selector).first().innerText({ timeout: 10_000 })
      : await page.locator("body").innerText();
    const trimmed = text.length > 8_000 ? text.slice(0, 8_000) + "\n…(truncated)" : text;
    return { content: [{ type: "text", text: trimmed }] };
  },
);

server.tool(
  "browser_evaluate",
  "Run arbitrary JavaScript in the page context and return the result",
  { page_id: z.string(), expression: z.string() },
  async ({ page_id, expression }) => {
    const page = getPage(page_id);
    const result = await page.evaluate(expression);
    const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    return { content: [{ type: "text", text: text }] };
  },
);

server.tool(
  "browser_wait_for",
  "Wait for a selector to appear or a timeout to elapse",
  { page_id: z.string(), selector: z.string().optional(), timeout_ms: z.number().optional() },
  async ({ page_id, selector, timeout_ms }) => {
    const page = getPage(page_id);
    const timeout = timeout_ms ?? 10_000;
    if (selector) {
      await page.locator(selector).first().waitFor({ state: "visible", timeout });
      return { content: [{ type: "text", text: `Selector "${selector}" is visible` }] };
    }
    await page.waitForTimeout(timeout);
    return { content: [{ type: "text", text: `Waited ${timeout}ms` }] };
  },
);

server.tool(
  "browser_scroll",
  "Scroll the page down or up by pixels, or to a selector",
  {
    page_id: z.string(),
    direction: z.enum(["down", "up", "to"]).optional(),
    pixels: z.number().optional(),
    selector: z.string().optional(),
  },
  async ({ page_id, direction, pixels, selector }) => {
    const page = getPage(page_id);
    if (direction === "to" && selector) {
      await page.locator(selector).first().scrollIntoViewIfNeeded();
      return { content: [{ type: "text", text: `Scrolled to "${selector}"` }] };
    }
    const px = pixels ?? 500;
    const dy = direction === "up" ? -px : px;
    await page.mouse.wheel(0, dy);
    return { content: [{ type: "text", text: `Scrolled ${dy > 0 ? "down" : "up"} ${Math.abs(dy)}px` }] };
  },
);

server.tool(
  "browser_list_tabs",
  "List all open tabs with their ids and titles",
  {},
  async () => {
    const lines: string[] = [];
    for (const [id, p] of pages) {
      const title = await p.title().catch(() => "(unknown)");
      const url = p.url();
      lines.push(`  ${id}: "${title}" — ${url}`);
    }
    if (lines.length === 0) lines.push("  (no open tabs)");
    return { content: [{ type: "text", text: `Open tabs:\n${lines.join("\n")}` }] };
  },
);

// ── Start ───────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);

// Cleanup on exit
process.on("SIGINT", async () => {
  for (const p of pages.values()) await p.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  process.exit(0);
});
process.on("SIGTERM", async () => {
  for (const p of pages.values()) await p.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  process.exit(0);
});
