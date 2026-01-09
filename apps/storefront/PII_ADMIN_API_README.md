# PII + Shopify Admin API (Hydrogen/Oxygen)

This doc describes how we handle **PII (personally identifiable information)** and how to safely use the **Shopify Admin API** from this Hydrogen/Oxygen app.

## What counts as PII here

- Customer **email**
- Customer **phone**
- Customer **name**, **address**, etc.

Assume anything on the Shopify `Customer` object is PII unless it’s clearly non-identifying.

## Split environment model (server vs client)

Hydrogen/Oxygen is **server-rendered**. We have a backend: route `loader`/`action` code runs in the **worker runtime**.

- **Server-only env**: secrets must be read from `context.env` in loaders/actions.
  - Examples: `PRIVATE_ADMIN_API_TOKEN`, `ADMIN_API_SHOP`, `SIGNUP_TOKEN_SECRET`, broker secrets.
- **Public env**: values safe to expose to the browser should be `PUBLIC_*` and only returned to the client intentionally.

### Local dev (MiniOxygen)

MiniOxygen does **not** automatically inject every `.env` variable into the worker runtime.

We explicitly inject required server vars in `vite.config.ts` via:

- `oxygen({ env: { ... } })`

That makes them available in server code as `context.env.*`.

## Core rules for PII

- **Never log PII**
  - Do not `console.log` request bodies that contain `email`/`phone`.
  - Do not log full Admin API responses that may include customer data.
- **Do not send PII to the browser unless required**
  - Our UI should not receive customer details; only receive minimal control flags + opaque tokens.
- **Prefer opaque tokens between steps**
  - We use `signupToken` (HMAC signed, short TTL) to correlate “email signup” → “phone/SMS consent”.
  - The client should pass `signupToken` back; the server verifies it and uses the embedded `customerId`.

## Admin API: how to avoid “PII in response” failures

Shopify may allow a mutation to apply, but reject returning PII fields in the GraphQL response.

### Guidance

- When doing Admin GraphQL writes involving PII, **do not select PII fields** in the response.
  - Example: update phone via `customerUpdate`, but only request `customer { id }`.
- If you need to confirm the write, confirm via:
  - the mutation `userErrors`,
  - Shopify Admin UI timeline,
  - or non-PII signals (ids, tags, notes).

## Our current API flow

### 1) Email signup → create/find customer (Admin REST)

Endpoint: `POST /api/customer-signup`

Behavior (Admin path):
- Search existing customer by email via Admin REST:
  - `GET /admin/api/<version>/customers/search.json?query=email:<email>`
- If found: update tags + email marketing subscription via Admin REST:
  - `PUT /admin/api/<version>/customers/<id>.json`
- If not found: create customer via Admin REST:
  - `POST /admin/api/<version>/customers.json`

We tag/note customers so we can identify the source:
- tags: `coming-soon-signup`, `af_source_admin`
- note: “Created/Subscribed via Coming Soon (Hydrogen/Admin API)”

Response includes:
- `collectPhone` (boolean): whether the UI should collect a phone number
- `signupToken` (string): opaque token for the next step
- `customerId` (string): Shopify Customer GID
- `source` (`admin` or `storefront`): how it was handled

### 2) Phone + SMS consent (Admin GraphQL)

Endpoint: `POST /api/update-customer-sms`

Client sends:
- `signupToken`
- `phone`
- `consent: true`

Server verifies `signupToken` and uses `customerId` from it.

Admin writes:
- **Phone**: `customerUpdate` (response selects `customer { id }` only)
- **SMS marketing consent**: `customerSmsMarketingConsentUpdate`

The endpoint supports `operation` (`phone` | `consent` | `both`) for debugging, but the UI uses the default (`both`).

## Testing checklist

- **Signup**:
  - `POST /api/customer-signup` returns `success: true`, `source: "admin"`, and a `customerId`.
  - Shopify customer timeline should show “<app name> created this customer” (Admin API).
- **SMS flow**:
  - `POST /api/update-customer-sms` returns `success: true`.
  - Shopify customer shows phone and “SMS subscribed”.

## Security notes

- Keep `PRIVATE_ADMIN_API_TOKEN`, `SIGNUP_TOKEN_SECRET`, and broker secrets server-only.
- Rotating `SIGNUP_TOKEN_SECRET` invalidates in-flight signup tokens (expected).
- Keep token TTL short (we default to ~15 minutes).

