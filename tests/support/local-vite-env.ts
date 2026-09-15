/**
 * Playwright's webServer inherits the parent environment. Strip live Cloudflare
 * credentials so `npx vite` cannot start a remote proxy against staging or
 * production while booting local e2e / visual suites.
 */
export function localViteWebServerEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.CLOUDFLARE_API_TOKEN;
  delete env.CLOUDFLARE_ACCOUNT_ID;
  delete env.CLOUDFLARE_ENV;
  env.CLOUDFLARE_VITE_REMOTE_BINDINGS = "false";
  return env;
}
