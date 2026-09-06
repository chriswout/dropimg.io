import { Hono } from "hono";
import { runCleanup } from "./cron/cleanup";
import { accountRoutes } from "./routes/account";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { billingRoutes } from "./routes/billing";
import { deletePageRoutes } from "./routes/delete-page";
import { deleteRoutes } from "./routes/delete";
import { eventRoutes } from "./routes/event";
import { imageRoutes } from "./routes/image";
import { integrationRoutes } from "./routes/integrations";
import { sharexRoutes } from "./routes/integrations-sharex";
import { reportRoutes } from "./routes/report";
import { shareRoutes } from "./routes/share";
import { uploadRoutes } from "./routes/upload";

type Env = {
  Bindings: Cloudflare.Env;
};

const app = new Hono<Env>();

/**
 * One public origin: https://dropimg.io/…
 * HTTP and www both 301 here so Search Console does not treat them as
 * alternates. Local wrangler (127.0.0.1) is left alone.
 */
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  const publicHost =
    url.hostname === "dropimg.io" || url.hostname === "www.dropimg.io";
  if (publicHost && url.protocol === "http:") {
    url.protocol = "https:";
    url.hostname = "dropimg.io";
    return c.redirect(url.toString(), 301);
  }
  if (url.hostname === "www.dropimg.io") {
    url.hostname = "dropimg.io";
    return c.redirect(url.toString(), 301);
  }
  await next();
});

app.get("/health", (c) => c.json({ ok: true, service: "dropimg" }));

app.route("/", uploadRoutes);
app.route("/", eventRoutes);
app.route("/", authRoutes);
app.route("/", billingRoutes);
app.route("/", accountRoutes);
app.route("/", imageRoutes);
app.route("/", deleteRoutes);
app.route("/", deletePageRoutes);
app.route("/", reportRoutes);
app.route("/", adminRoutes);
app.route("/", integrationRoutes);
app.route("/", sharexRoutes);
app.route("/", shareRoutes);

app.notFound(async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text("Not found", 404);
});

export default {
  fetch: app.fetch,
  async scheduled(
    _controller: ScheduledController,
    env: Cloudflare.Env,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(runCleanup(env));
  },
} satisfies ExportedHandler<Cloudflare.Env>;
