import { Hono } from "hono";
import { webAssetsBillingConfig } from "../lib/billing/paypal";
import { mediaDeliveryEnabled, mediaEnabled } from "../lib/media-config";

type Env = {
  Bindings: Cloudflare.Env;
};

export const siteConfigRoutes = new Hono<Env>();

/**
 * Public, cacheable feature flags for static marketing CTAs.
 * Never include secrets or user identity.
 */
siteConfigRoutes.get("/api/site-config", (c) => {
  return c.json(
    {
      mediaEnabled: mediaEnabled(c.env),
      mediaDeliveryEnabled: mediaDeliveryEnabled(c.env),
      webAssetsCheckout: Boolean(webAssetsBillingConfig(c.env) && mediaEnabled(c.env)),
    },
    200,
    { "Cache-Control": "public, max-age=60" },
  );
});
