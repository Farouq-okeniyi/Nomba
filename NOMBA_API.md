# Nomba API — Complete Reference for This Project

> **Official Docs:** https://developer.nomba.com  
> **API Base URL:** `https://api.nomba.com/v1`  
> **Our API Client:** [`src/nomba/nomba.client.ts`](./src/nomba/nomba.client.ts)  
> **Our API Wrappers:** [`src/nomba/nomba.api.ts`](./src/nomba/nomba.api.ts)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Webhook Events](#2-webhook-events)
3. [Webhook Signature Verification](#3-webhook-signature-verification--critical)
4. [Virtual Accounts](#4-virtual-accounts)
5. [Transfers (Payouts)](#5-transfers-payouts)
6. [Account Balance](#6-account-balance)
7. [Transactions](#7-transactions)
8. [API Basics](#8-api-basics)
9. [How Each API Maps to Our Project](#9-how-each-api-maps-to-our-project)
10. [APIs We Are NOT Using (Yet)](#10-apis-we-are-not-using-yet)

---

## 1. Authentication

**Type:** OAuth 2.0 Client Credentials  
**Our implementation:** [`src/nomba/nomba.client.ts`](./src/nomba/nomba.client.ts)

### Obtain Access Token

```http
POST https://api.nomba.com/v1/auth/token/issue
Content-Type: application/json
accountId: <NOMBA_PARENT_ACCOUNT_ID>

{
  "grant_type": "client_credentials",
  "client_id": "<NOMBA_CLIENT_ID>",
  "client_secret": "<NOMBA_PRIVATE_KEY>"
}
```

**Response:**
```json
{
  "code": "00",
  "description": "Success",
  "data": {
    "businessId": "01a10aeb-...",
    "access_token": "eyJhbGci...",
    "refresh_token": "01h4gdx2t...",
    "expiresAt": "2022-07-08T14:33:00Z"
  }
}
```

### Key Notes
- Tokens expire after **30 minutes**
- Our client caches the token and automatically refreshes it 60 seconds before expiry
- Every request requires `Authorization: Bearer <token>` and `accountId: <NOMBA_PARENT_ACCOUNT_ID>` headers
- `client_secret` in Nomba's docs = our `NOMBA_PRIVATE_KEY` env var

### Refresh Token (not yet implemented — we re-authenticate instead)

```http
POST https://api.nomba.com/v1/auth/token/refresh
Authorization: Bearer <current_token>
accountId: <accountId>

{
  "grant_type": "refresh_token",
  "refresh_token": "<refresh_token>"
}
```

> **TODO:** Implement refresh token flow instead of re-authenticating with `client_credentials` every time. The current approach works but wastes a round-trip on every cache miss.

---

## 2. Webhook Events

**Our handler:** [`src/modules/webhook/webhook.service.ts`](./src/modules/webhook/webhook.service.ts)

Nomba sends a `POST` request to your registered webhook URL when a payment event occurs. You must register the URL in the **Nomba Dashboard → Developer → Webhook Setup**.

### Supported Event Types

| Event Type | Trigger |
|---|---|
| `payment_success` | Payment credited to your Nomba account (virtual account transfer, card, etc.) |
| `payout_success` | Payment debited from your account (bank transfer, bill payment) |
| `payment_failed` | A payment attempt failed |
| `payment_reversal` | A credited payment was reversed back to the sender |
| `payout_failed` | A payout failed to process |
| `payout_refund` | A payout was refunded back to your account |

### Webhook Payload Structure

```json
{
  "event_type": "payment_success",
  "requestId": "49e11b44-909b-4f83-82b4-9a83aXXXXXX",
  "data": {
    "merchant": {
      "walletId": "693e907aad9ea59616XXXX",
      "walletBalance": 539.4,
      "userId": "613bb620-c8e5-45f6-9c00-XXXXXXXX"
    },
    "terminal": {},
    "transaction": {
      "aliasAccountNumber": "967913XXX",
      "fee": 0.6,
      "sessionId": "1000042602061021531516XXXXXX",
      "type": "vact_transfer",
      "transactionId": "API-VACT_TRA-613BB-eeae578a-...",
      "aliasAccountName": "Peter/Peter Enterprise",
      "responseCode": "",
      "originatingFrom": "api",
      "transactionAmount": 120,
      "narration": "Transfer from JOHN GRASS",
      "time": "2026-02-06T10:21:56Z",
      "aliasAccountReference": "122320250916PM",
      "aliasAccountType": "VIRTUAL"
    },
    "customer": {
      "bankCode": "305",
      "senderName": "JOHN GRASS",
      "bankName": "Paycom (Opay)",
      "accountNumber": "81689XXX"
    }
  }
}
```

### Webhook Headers Sent by Nomba

```
nomba-signature: 0zzATkAuEta5kpKVCExReupW/XglCk/re51P4jiDJ9c=
nomba-sig-value: 0zzATkAuEta5kpKVCExReupW/XglCk/re51P4jiDJ9c=
nomba-signature-algorithm: HmacSHA256
nomba-signature-version: 1.0.0
nomba-timestamp: 2023-03-31T05:56:47Z
```

> **Important:** `nomba-timestamp` is **required** for signature verification — see section 3 below.

---

## 3. Webhook Signature Verification

**Our middleware:** [`src/middlewares/webhookAuth.ts`](./src/middlewares/webhookAuth.ts)

> ✅ **Our implementation is correct** — verified against the official Nomba documentation.

### How Nomba Signs Webhooks

Nomba computes an HMAC-SHA256 hash of the **entire raw JSON request body** using your webhook secret, and sends the result as a hex string in the `nomba-signature` header.

```
signature = Hex(HMAC-SHA256(rawRequestBody, webhookSecret))
```

### Official Nomba Reference Implementation

From the [Nomba developer docs](https://developer.nomba.com):

```typescript
import crypto from "crypto";

app.post("/webhooks/nomba", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.header("nomba-signature");
  const expected = crypto
    .createHmac("sha256", process.env.NOMBA_WEBHOOK_SECRET!)
    .update(req.body)
    .digest("hex");

  if (signature !== expected) return res.status(401).send("bad signature");

  const event = JSON.parse(req.body.toString());
  // Idempotency: ignore if we have already processed event.requestId
  res.sendStatus(200);
});
```

### Our Implementation (webhookAuth.ts) — Correct ✅

Our middleware does exactly this — it captures the raw body via `express.json({ verify })` and HMAC-hashes it:

```typescript
const expectedHex = crypto
  .createHmac('sha256', config.NOMBA_WEBHOOK_SIGNING_KEY)
  .update(req.rawBody)
  .digest('hex');
```

We also check a Base64 digest as a defensive fallback — this is harmless and provides extra flexibility.

### Key Reminders

- **Always verify before processing** — reject the payload if the signature doesn't match
- **Idempotency** — Nomba may fire the same event twice (network retries). Our `WebhookEvent.requestId` unique index handles this
- **Return 200 quickly** — Nomba retries if it doesn't get a fast acknowledgement

---

## 4. Virtual Accounts

**Our wrappers:** [`src/nomba/nomba.api.ts`](./src/nomba/nomba.api.ts)  
**Our service:** [`src/modules/accounts/accounts.service.ts`](./src/modules/accounts/accounts.service.ts)

Virtual accounts are dedicated bank account numbers that route incoming payments to your Nomba account. When a customer sends money to the virtual account, Nomba fires a `payment_success` webhook.

### Create Virtual Account

```http
POST https://api.nomba.com/v1/accounts/virtual
Authorization: Bearer <token>
accountId: <NOMBA_PARENT_ACCOUNT_ID>

{
  "accountRef": "CUST-001",
  "accountName": "John Doe - Hotel Booking",
  "currency": "NGN",
  "bvn": "12345678901"
}
```

**Response:**
```json
{
  "code": "00",
  "data": {
    "accountId": "9c0f57ec-...",
    "accountNumber": "9876543210",
    "accountName": "John Doe - Hotel Booking",
    "bankName": "Nomba MFB"
  }
}
```

### Update Virtual Account

```http
PUT https://api.nomba.com/v1/accounts/virtual/{accountHolderId}
accountId: {accountHolderId}

{ "accountName": "New Name" }
```

### Suspend Virtual Account

```http
PUT https://api.nomba.com/v1/accounts/suspend/{accountHolderId}
accountId: {accountHolderId}
```

### Reactivate Virtual Account

```http
PUT https://api.nomba.com/v1/accounts/reactivate/{accountHolderId}
accountId: {accountHolderId}
```

> **Note:** Nomba doesn't have a direct "close" endpoint. We suspend the account and mark it `CLOSED` locally.

### Key Notes
- `accountRef` must be unique per merchant — use a stable customer/order ID
- Funds land in your parent account wallet; the virtual account is just a routing number
- The `aliasAccountNumber` in webhook payloads = the virtual account number

---

## 5. Transfers (Payouts)

**Our wrappers:** [`src/nomba/nomba.api.ts`](./src/nomba/nomba.api.ts)  
**Our service:** [`src/modules/disbursements/disbursements.service.ts`](./src/modules/disbursements/disbursements.service.ts)

### Bank Account Lookup (Always call before transferring)

```http
POST https://api.nomba.com/v1/transfers/bank/lookup
Authorization: Bearer <token>
accountId: <NOMBA_PARENT_ACCOUNT_ID>

{
  "accountNumber": "0123456789",
  "bankCode": "058"
}
```

**Response:**
```json
{
  "code": "00",
  "data": {
    "accountName": "JOHN DOE",
    "accountNumber": "0123456789",
    "bankCode": "058"
  }
}
```

### Initiate Bank Transfer

```http
POST https://api.nomba.com/v1/transfers/bank
Authorization: Bearer <token>
accountId: <NOMBA_PARENT_ACCOUNT_ID>
X-Idempotent-key: <unique-idempotency-key>

{
  "amount": 50000,
  "bankCode": "058",
  "accountNumber": "0123456789",
  "accountName": "JOHN DOE",
  "narration": "Payout: January Salaries",
  "merchantTxRef": "DISB-{itemId}-{timestamp}",
  "sourceAccountId": "<NOMBA_PARENT_ACCOUNT_ID>"
}
```

**Response:**
```json
{
  "code": "00",
  "data": {
    "id": "API-TRANSFER-...",
    "status": "SUCCESS",
    "transactionId": "API-TRANSFER-...",
    "sessionId": "..."
  }
}
```

**Status Values:**
- `SUCCESS` — Transfer completed immediately
- `PENDING_BILLING` — Transfer is queued; watch for `payout_success` or `payout_failed` webhook
- On failure: auto-refunded, status becomes `FAILED`

### Key Notes
- `merchantTxRef` is how we track which disbursement item a webhook event belongs to. Our format: `DISB-{itemId}-{timestamp}` or `DISB-RETRY-{itemId}-{timestamp}`
- `X-Idempotent-key` header prevents duplicate transfers if the request is retried
- Always call the **bank account lookup** first so users can confirm the recipient name
- Amounts are in **kobo** (1 NGN = 100 kobo)

---

## 6. Account Balance

**Our wrapper:** `getWalletBalance()` in [`src/nomba/nomba.api.ts`](./src/nomba/nomba.api.ts)

```http
GET https://api.nomba.com/v1/accounts/balance
Authorization: Bearer <token>
accountId: <NOMBA_PARENT_ACCOUNT_ID>
```

**Response:**
```json
{
  "code": "00",
  "data": {
    "walletBalance": 5000000,
    "accountId": "..."
  }
}
```

Used in our disbursements service to validate sufficient balance before executing a batch payout.

---

## 7. Transactions

**Our wrapper:** `fetchTransactions()` in [`src/nomba/nomba.api.ts`](./src/nomba/nomba.api.ts)

```http
GET https://api.nomba.com/v1/transactions/bank?dateFrom=2026-01-01&dateTo=2026-07-05
Authorization: Bearer <token>
accountId: <NOMBA_PARENT_ACCOUNT_ID>
```

**Response:** Paginated list of transactions with `data.content[]` array.

> Currently used for auditing. We store all inbound transactions in our own `transactions` table via webhook events, so this endpoint is a fallback reconciliation tool.

---

## 8. API Basics

### All amounts are in kobo

- 1 NGN = 100 kobo
- `transactionAmount: 500000` = 5,000 NGN
- Store amounts as `integer` in the database — **never use floats for money**

### Response Envelope

All Nomba API responses follow this format:
```json
{
  "code": "00",
  "description": "Success",
  "data": { ... }
}
```

| Code | Meaning |
|---|---|
| `00` | Success |
| `01` | Pending |
| Any other | Error — check `description` |

### Rate Limits

Nomba uses a **fixed window** rate limiting strategy. Our `nombaClient` logs all requests — watch for `429 Too Many Requests` errors in logs.

### Pagination

List endpoints return:
```json
{
  "data": {
    "content": [...],
    "page": 1,
    "size": 20,
    "totalElements": 150,
    "totalPages": 8
  }
}
```

### Idempotency

For all transfer/payout requests, send `X-Idempotent-key` with a unique UUID. If a request times out and you retry, Nomba returns the same result without processing it twice.

### Environments

| Environment | Base URL |
|---|---|
| Production | `https://api.nomba.com/v1` |
| Sandbox | `https://sandbox.nomba.com/v1` (set `NOMBA_API_BASE_URL` in `.env`) |

---

## 9. How Each API Maps to Our Project

| Nomba API | Our Usage | File |
|---|---|---|
| `POST /auth/token/issue` | Auto-called before every API request; token cached in memory | `nomba.client.ts` |
| `POST /accounts/virtual` | Called when a merchant provisions a new virtual account for a customer | `accounts.service.ts` |
| `PUT /accounts/virtual/{id}` | Called when updating virtual account name | `accounts.service.ts` |
| `PUT /accounts/suspend/{id}` | Called when suspending or closing a virtual account | `accounts.service.ts` |
| `PUT /accounts/reactivate/{id}` | Called when reactivating a suspended virtual account | `accounts.service.ts` |
| `GET /accounts/balance` | Called before executing a disbursement batch to validate funds | `disbursements.service.ts` |
| `POST /transfers/bank/lookup` | Called before initiating any payout to verify recipient | `nomba.api.ts` |
| `POST /transfers/bank` | Called for each recipient in a disbursement batch | `disbursements.service.ts` |
| `GET /transactions/bank` | Available for reconciliation / audit queries | `nomba.api.ts` |
| **Webhook: `payment_success`** | Matches payment to a `PaymentExpectation`, creates `PaymentInstallment`, marks misplaced if unmatched | `webhook.service.ts` |
| **Webhook: `payout_success`** | Updates `DisbursementItem` status to SUCCESS, re-evaluates batch | `webhook.service.ts` |
| **Webhook: `payout_failed`** | Updates `DisbursementItem` status to FAILED, re-evaluates batch | `webhook.service.ts` |
| **Webhook: `payment_reversal`** | Removes installment, rolls back `amountReceived` on expectation | `webhook.service.ts` |

---

## 10. APIs We Are NOT Using (Yet)

| API | Description | Potential Use |
|---|---|---|
| `POST /checkout/orders` | Create a hosted payment page | For merchants who want to accept card payments |
| `POST /transfers/bank/subaccount` | Transfer from a sub-account | If we need isolated merchant wallets |
| `POST /auth/token/refresh` | Refresh expired token without re-auth | Upgrade token caching; avoid client_credentials calls |
| `POST /bills/*` | Airtime, electricity, cable TV | Future bill-payment module |
| Direct Debit APIs | Mandate creation for recurring charges | Subscription/recurring billing features |
| Global Payout APIs | Cross-border transfers | International disbursements |
| Terminal APIs | Push payment to POS terminal | Physical point-of-sale integration |

---

## Quick Reference: Environment Variables

```bash
NOMBA_PARENT_ACCOUNT_ID=f666ef9b-...   # Used as accountId header on all requests
NOMBA_SUB_ACCOUNT_ID=9c0f57ec-...     # Sub-account for collecting payments
NOMBA_CLIENT_ID=706df6c4-...           # OAuth client_id
NOMBA_PRIVATE_KEY=k8Uob...             # OAuth client_secret
NOMBA_WEBHOOK_SIGNING_KEY=NombaHackathon2026  # HMAC key for webhook verification
NOMBA_API_BASE_URL=https://api.nomba.com/v1   # Change to sandbox URL for testing
```

---

*Last updated: 2026-07-05 | Based on https://developer.nomba.com*
