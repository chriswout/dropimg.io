# Stripe underwriting — the category question

Stripe lists **"Cyberlocker and file-sharing services"** as a *restricted*
business, not a prohibited one. Restricted means approval is possible and
requires a human decision. It also means silence is not neutral: the Services
Agreement (General Terms 4.1(a)(ix)) forbids operating a restricted business
"unless Stripe has pre-approved the respective Prohibited or Restricted
Business in writing."

So activating live without disclosing puts us in breach from the first charge,
and breach is a termination-for-cause ground that skips the 10-day cure period.
The EEA regional terms carry no minimum notice period — Australia and New
Zealand get a contractual 30 days, we do not. Stripe has closed a file-storage
account under this exact clause with no notice at all, and the UK Financial
Ombudsman held that was fair (DRN-5181025), reaching a definition of cyberlocker
— "an internet service that allows users to store and share files online" —
broad enough to catch us on its face.

The asymmetry decides it. Rejected before launch costs us a provider search.
Terminated after launch costs us the provider, the balance, possibly a MATCH
listing that poisons the alternatives, and every customer mid-subscription.

## What the rule is actually aimed at

The restriction traces to Visa's high-brand-risk designation for MCC 4816,
which is narrower than the category name suggests:

> Cyberlockers and similar remote digital file-sharing services **where uploaded
> content is accessible to the public or the service pays uploaders for
> content.**

Two limbs. We fail the second cleanly and completely — nobody is ever paid for
an upload, and there is no mechanism by which they could be. The first is
arguable rather than clear-cut: a share link needs no login, but there is no
index, no search, no gallery and no feed, so nothing is *discoverable*, only
retrievable by someone already holding an unguessable URL.

Visa names what it is protecting against: pirated films, music and software,
and in the extreme case CSAM. Our file-type restriction makes the first three
structurally impossible — you cannot ship a cracked binary or a film as a PNG
that passes header validation. That is the argument to lead with, because it is
about capability rather than promises.

## Send this

Channels, in order: the **contact link on the restricted-businesses legal page**
(officially maintained), a **dashboard support ticket** against
`acct_1UABoeAyXaIAfjNQ` so it is attached to the account record, and
`support+restricted@stripe.com` as a third copy. That address comes from a 2016
Stripe post and may no longer be monitored, so do not rely on it alone.

Fill in the bracketed identity fields before sending.

---

**Subject: Restricted-business pre-approval request — DropIMG (acct_1UABoeAyXaIAfjNQ)**

I am requesting written pre-approval before enabling live payments, because I
believe my business may be read as falling under "Cyberlocker and file-sharing
services" on the restricted list and I would rather establish that up front than
discover it after taking customer money.

**What DropIMG is.** A screenshot-sharing tool for developers and support
teams: paste or drop an image, get a link, the link expires. Sold as a
subscription to software (SaaS tax code `txcd_10103000`), operated by
[legal name, KVK number] in the Netherlands. Live at https://dropimg.io.

**What is sold.** DropIMG Pro, EUR 2.99/month or EUR 24.99/year. It buys longer
expiry windows, upload history, password-protected links, ShareX and browser
extension integration, larger uploads and no ads. It does not buy storage
capacity, and there is no plan at any price that stores a file permanently.

**Why the cyberlocker designation should not apply.** Visa's MCC 4816
designation reaches services where uploaded content is publicly accessible or
where the service pays uploaders. Neither is true here, and several of the
properties are enforced in code rather than policy:

- **Images only, verified by content.** PNG, JPEG, WebP and GIF are the only
  accepted formats, validated server-side by file signature — not by the
  `Content-Type` header or a client-side hint, so the check cannot be bypassed
  by relabelling. SVG is explicitly rejected. Video, archives, executables,
  documents and arbitrary binaries cannot be uploaded at all. The piracy vectors
  the restriction exists to stop are not merely prohibited, they are impossible.
- **Everything expires; nothing is permanent.** Maximum lifetime is 90 days
  from upload, hard-capped, with no unlimited option on any tier. Expiry is
  enforced three ways: refusal at read time, a cleanup job every five minutes,
  and object-storage lifecycle rules as a backstop. No library accumulates.
- **Uploaders are never paid.** No marketplace, no tipping, no paid links, no
  selling access, no revenue share. The only money that moves is a customer
  paying us for a subscription.
- **Nothing is publicly discoverable.** No gallery, no browse page, no search,
  no feed, no public listing of any kind. Links are 8-character
  cryptographically random slugs. Share pages are served `noindex` and excluded
  from the sitemap, so uploads never enter search engines.
- **Small files, rate-limited.** 10 MB per upload, rising to 50 MB for
  subscribers, against per-IP limits of 10 uploads per minute and 100 uploads or
  500 MB per day. Cloudflare WAF rules challenge high-risk uploads and block URL
  enumeration. These are screenshot-sized limits, not distribution-sized ones.
- **Proactive CSAM scanning.** Content served through our CDN is hash-matched
  against NCMEC's known-CSAM lists via Cloudflare's CSAM Scanning Tool. Matches
  are blocked automatically and reported.
- **Reactive takedown.** A public report form at /abuse and abuse@dropimg.io,
  with categories for CSAM, malware and copyright, feeding a moderation queue
  with one-click removal. Our copyright process is documented in our published
  terms.
- **Privacy by default.** Camera and location metadata is stripped from uploads.
  We store a salted hash of the uploader's IP rather than the address itself.

I am happy to provide anything further that would help — traffic figures,
moderation logs, a walkthrough of the upload path, or a demo account.

[Name]
[Email]

---

## Two things to fix before sending

**1. Enable Cloudflare's CSAM Scanning Tool.** The letter above claims it. Today
that claim is false — `src/lib/moderation-hook.ts` is a documented no-op and
there is no scanning of any kind. Do not send until this is switched on.

It is free, it is zone-level, and since Cloudflare dropped the credential
requirement it needs nothing but an email address: Caching → Configuration →
CSAM Scanning Tool → Configure. It works by hashing content served through the
Cloudflare cache, and our unprotected images qualify — `/i/:slug` is served
`public, s-maxage=300` through the proxied zone.

One honest limit worth knowing before you rely on it: password-protected images
are served `private, no-store` and are therefore never cached, so they fall
outside the scan. Everything anonymous — which is the actual risk surface —
is covered.

This single control is what moves the letter from asserting good intentions to
describing a mechanism, against the exact harm Visa names as the extreme case.

**2. Say who runs the site.** `public/terms.html` currently attributes the
service to "the operator of dropimg.io" and sets governing law to "that
operator's home jurisdiction" without ever naming an entity, a country or an
address. To a risk reviewer, an unnamed operator plus anonymous uploads plus
links that need no login is precisely the cyberlocker silhouette — and EU
e-commerce rules require the trader's identity and geographic address anyway.
Naming the entity is close to free and removes a signal that costs us nothing
to give up.

## Gaps the letter deliberately does not paper over

Claimed nowhere above, because we do not have them: NSFW or nudity
classification, malware scanning, upload-time review queues, in-product user or
IP ban tooling, a registered DMCA agent, and a documented law-enforcement
request process. Edge blocking and account closure are possible but manual.

If Stripe asks for a moderation roadmap, these are the honest next items.
`docs/moderation.md` already describes the intended state machine.

## If Stripe says no

Most of the obvious alternatives are not independent of this decision:

| Provider | Stance |
|----------|--------|
| Lemon Squeezy | Stripe-owned; prohibits "products restricted by our payment processing partners" — same answer, weaker appeal |
| Polar | Runs on Stripe; explicitly bound to Stripe's restricted list |
| Creem | Names "remote digital file-sharing services and cyberlockers" as prohibited |
| 2Checkout / Verifone | Prohibits "file storage services for pictures and movies" — describes us almost exactly |
| FastSpring | Publishes no industry list covering this; plausibly the only genuinely independent underwriting. Ask before building |

Paddle's published policy, for the record, never mentions file sharing,
cyberlockers or hosting. Their rejection was discretionary judgment, not a
written rule — which is why competitors in this space using Paddle (img.vision,
Free Snipping Tool) prove less than they appear to. Their approvals were equally
discretionary. What Paddle's read does tell us, usefully, is how DropIMG looks
to a payments risk professional on first glance, which is what the letter above
is written against.
