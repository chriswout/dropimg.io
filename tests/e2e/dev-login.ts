import { expect, type APIRequestContext } from "@playwright/test";

let ipCounter = 20;

export function nextE2eIp(): string {
  return `203.0.113.${(ipCounter++ % 200) + 20}`;
}

/** Start a development magic-link login with a unique IP so AUTH_LIMIT does not trip. */
export async function postDevLogin(
  request: APIRequestContext,
  email: string,
): Promise<{ ip: string; devMagicUrl: string }> {
  const ip = nextE2eIp();
  const started = await request.post("/login", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "CF-Connecting-IP": ip,
    },
    data: { email },
  });
  const bodyText = await started.text();
  expect(started.ok(), `POST /login ${started.status()}: ${bodyText.slice(0, 300)}`).toBeTruthy();
  const body = JSON.parse(bodyText) as { devMagicUrl?: string };
  expect(body.devMagicUrl, "POST /login missing devMagicUrl").toBeTruthy();
  return { ip, devMagicUrl: body.devMagicUrl! };
}
