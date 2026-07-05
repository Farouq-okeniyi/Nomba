# User & Testing Workflow

> A step-by-step guide through every user journey in the system — including exact API calls and PowerShell test commands.

**Base URL:** `http://localhost:5004/api/v1`  
**Swagger UI:** `http://localhost:5004/api-docs`

---

## System Overview

This service sits **between merchants and Nomba**. Merchants use our API to:
1. Collect payments from customers via virtual accounts
2. Track partial/installment payments
3. Disburse funds (batch payouts) to bank accounts

```
Customer ──bank transfer──► Nomba Virtual Account
                                     │
                                     │ webhook (payment_success)
                                     ▼
                            Our Webhook Service
                            ├── match to PaymentExpectation
                            ├── log Transaction
                            ├── fire outbound webhook → Merchant
                            └── flag as MisplacedPayment if no match

Merchant ──► POST /disbursements ──► Our Service ──► Nomba Transfer API
                                                           │
                                                           │ webhook (transfer.success / transfer.failed)
                                                           ▼
                                                    Update DisbursementRecipient
                                                    Fire outbound webhook → Merchant
```

---

## Flow 1: Merchant Onboarding

**Goal:** Register a merchant and get their API key.

### Step 1.1 — Register

```
POST /api/v1/merchants/register
```

**Body:**
```json
{
  "businessName": "Acme Corp",
  "email": "admin@acme.com",
  "phone": "08012345678"
}
```

**Response:**
```json
{
  "merchant": { "id": "uuid", "businessName": "Acme Corp", ... },
  "apiKey": "nw_live_abc123xyz...",
  "recoveryCode": "REC-12345678"
}
```

> ⚠️ **Save the `apiKey` and `recoveryCode` immediately — they are shown only once.**  
> The `apiKey` is used as `Authorization: Bearer <apiKey>` on all protected endpoints.  
> The `recoveryCode` is the ONLY way to regenerate a lost API key.

### Step 1.2 — Set Webhook URL (optional but recommended)

```
PUT /api/v1/merchants/webhook
Authorization: Bearer <apiKey>
```

```json
{ "webhookUrl": "https://your-server.com/nomba-events" }
```

Our service will POST events to this URL whenever a payment or disbursement event occurs (signed with the merchant's `webhookSecret`).

### Step 1.3 — If API key is lost, regenerate it

```
POST /api/v1/merchants/regenerate-key
```

```json
{
  "email": "admin@acme.com",
  "recoveryCode": "REC-12345678"
}
```

---

## Flow 2: Provision a Virtual Account for a Customer

**Goal:** Give a customer a dedicated bank account number so they can make payments.

```
POST /api/v1/accounts
Authorization: Bearer <apiKey>
```

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "08011112222",
  "bvn": "12345678901"
}
```

**What happens internally:**
1. We generate a unique `nombaAccountRef` (e.g. `ACC-A1B2C3D4E5F6...`)
2. Call `POST /accounts/virtual` on Nomba API
3. Nomba returns a real bank account number (e.g. `9876543210` at Nomba MFB)
4. We save the account in our DB linked to the merchant

**Response:**
```json
{
  "id": "uuid",
  "nombaAccountNumber": "9876543210",
  "nombaBankName": "Nomba MFB",
  "nombaAccountName": "John Doe",
  "status": "ACTIVE"
}
```

Give `nombaAccountNumber` + `nombaBankName` to your customer so they can make a bank transfer.

### Account Lifecycle

| Action | Endpoint |
|---|---|
| List all accounts | `GET /api/v1/accounts` |
| Get one account | `GET /api/v1/accounts/{id}` |
| Update account name | `PUT /api/v1/accounts/{id}` |
| Suspend (stop receiving) | `POST /api/v1/accounts/{id}/suspend` |
| Reactivate | `POST /api/v1/accounts/{id}/reactivate` |
| Close permanently | `POST /api/v1/accounts/{id}/close` |

---

## Flow 3: Set Up a Payment Expectation (Installments)

**Goal:** Tell the system "Account X should receive ₦50,000 total — track partial payments."

```
POST /api/v1/payment-expectations
Authorization: Bearer <apiKey>
```

**Body:**
```json
{
  "reference": "ORDER-2026-001",
  "accountId": "<account-uuid>",
  "expectedAmount": 50000
}
```

**Response:**
```json
{
  "id": "uuid",
  "reference": "ORDER-2026-001",
  "expectedAmount": 50000,
  "amountPaid": 0,
  "outstanding": 50000,
  "status": "PENDING"
}
```

`status` values:
- `PENDING` — no payment received yet
- `PARTIAL` — some payments received but not yet fully paid
- `SETTLED` — full amount received (`outstanding === 0`)
- `CANCELLED` — manually cancelled

### View Installments

```
GET /api/v1/payment-expectations/{expectationId}/installments
Authorization: Bearer <apiKey>
```

Returns every individual payment received, with `runningTotal` and `outstandingAfter` per payment.

---

## Flow 4: Customer Makes a Payment (The Webhook Journey)

**Goal:** Understand what happens when a customer actually sends money.

> **This flow is triggered automatically by Nomba — you don't call any API manually.**

### 4.1 — Customer sends money

The customer does a bank transfer to `9876543210` (Nomba MFB). Nomba receives the funds and fires a POST to our webhook URL:

```
POST /api/v1/webhooks/nomba
nomba-signature: <HMAC signature>
```

```json
{
  "event_type": "payment_success",
  "requestId": "unique-uuid-from-nomba",
  "data": {
    "merchant": { "userId": "...", "walletId": "...", "walletBalance": 539.4 },
    "transaction": {
      "transactionId": "API-VACT_TRA-...",
      "type": "vact_transfer",
      "transactionAmount": 20000,
      "time": "2026-07-05T10:00:00Z",
      "aliasAccountNumber": "9876543210",
      "responseCode": ""
    },
    "customer": {
      "senderName": "John Doe",
      "bankName": "Access Bank",
      "bankCode": "044",
      "accountNumber": "0123456789"
    }
  }
}
```

### 4.2 — Our webhook service processes it

The decision tree inside `processPaymentSuccess()`:

```
Received payment on account 9876543210
            │
            ▼
   Look up Account by nombaAccountNumber
            │
   ┌────────┴────────────────────────┐
   │ Not Found                       │ Found
   ▼                                 ▼
MisplacedPayment               Check Account Status
(ACCOUNT_NOT_FOUND)          ┌──────┴──────────────┐
                             │ SUSPENDED/CLOSED      │ ACTIVE
                             ▼                       ▼
                        MisplacedPayment       Save Transaction
                     (ACCOUNT_SUSPENDED /      Look for PENDING
                      ACCOUNT_CLOSED)          or PARTIAL
                     Fire merchant webhook     PaymentExpectation
                     (payment.misplaced)              │
                                             ┌────────┴────────┐
                                             │ Found            │ Not Found
                                             ▼                  ▼
                                      Create Installment   Transaction saved
                                      Update Expectation   (no expectation match)
                                      ├─ PARTIAL (if not fully paid)
                                      └─ SETTLED (if fully paid)
                                      Fire merchant webhook (payment.received)
```

### 4.3 — Simulate locally for testing

First generate a matching signature (run in your terminal):
```powershell
node gen-sig.js
```

Then send the webhook:
```powershell
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:5004/api/v1/webhooks/nomba" `
  -Headers @{ "nomba-signature" = "<sig-from-gen-sig>"; "Content-Type" = "application/json" } `
  -Body '<body-from-gen-sig>'
```

> **Edit `gen-sig.js`** to change `customer.accountNumber` to match an actual virtual account number in your DB, and update `transactionAmount` to whatever you want to test.

---

## Flow 5: View Misplaced Payments

If a payment arrives on an unknown or suspended account, it becomes a `MisplacedPayment`.

```
GET /api/v1/misplaced-payments
Authorization: Bearer <apiKey>
```

Returns all misplaced payments for the merchant with `reason`:
- `ACCOUNT_NOT_FOUND` — account number not in our system
- `ACCOUNT_SUSPENDED` — account exists but was suspended
- `ACCOUNT_CLOSED` — account exists but was closed

```
GET /api/v1/misplaced-payments/{id}
PATCH /api/v1/misplaced-payments/{id}   (to update status/notes)
```

---

## Flow 6: Create and Execute a Disbursement Batch

**Goal:** Pay multiple recipients in one batch from the merchant's Nomba wallet.

```
POST /api/v1/disbursements
Authorization: Bearer <apiKey>
```

**Body:**
```json
{
  "reference": "PAYROLL-JULY-2026",
  "narration": "July 2026 Staff Salaries",
  "items": [
    {
      "accountNumber": "0123456789",
      "bankCode": "044",
      "amount": 150000,
      "narration": "July salary - Alice"
    },
    {
      "accountNumber": "9876543210",
      "bankCode": "058",
      "amount": 200000,
      "narration": "July salary - Bob"
    }
  ]
}
```

**What happens internally (step by step):**

```
1. Validate accountIds (if provided) belong to this merchant
2. Check reference is not duplicate
3. Create Disbursement record (status = PENDING)
4. For each recipient:
   a. Generate unique merchantTxRef (DISB-xxxx) — this links webhook to recipient
   b. Generate idempotencyKey (UUID)
   c. Call Nomba bank lookup → verify account name
   d. If lookup fails → mark recipient FAILED immediately, continue
   e. Save DisbursementRecipient (status = PENDING)
5. Set disbursement status = PROCESSING
6. Return disbursement to caller (non-blocking)
7. Background: initiate transfer for each PENDING recipient via Nomba
8. Nomba fires transfer.success / transfer.failed webhook for each recipient
9. Webhook updates recipient status, recomputes disbursement totals
10. Fire outbound webhook to merchant (disbursement.updated)
```

**Response (immediate, transfers still processing):**
```json
{
  "id": "uuid",
  "reference": "PAYROLL-JULY-2026",
  "status": "PROCESSING",
  "totalRecipients": 2,
  "totalPending": 2,
  "totalSuccess": 0,
  "totalFailed": 0
}
```

### Poll for completion

```
GET /api/v1/disbursements/{id}
Authorization: Bearer <apiKey>
```

Response includes `recipients[]` array with individual statuses.

`status` values:
- `PENDING` — not yet started
- `PROCESSING` — transfers sent to Nomba, waiting for webhooks
- `COMPLETED` — all recipients succeeded
- `PARTIALLY_FAILED` — some succeeded, some failed
- `FAILED` — all recipients failed

### Retry failed recipients

```
POST /api/v1/disbursements/{id}/retry
Authorization: Bearer <apiKey>
```

Retries only the `FAILED` recipients. Uses the same `merchantTxRef` (so Nomba can deduplicate) with a fresh `idempotencyKey`.

---

## Flow 7: View Transactions

```
GET /api/v1/transactions
Authorization: Bearer <apiKey>
```

Lists all inbound transactions received for this merchant's accounts.

```
GET /api/v1/transactions/{merchantTxRef}
```

Look up a single transaction by our internal reference.

---

## Testing Order (Recommended)

Run these in order to validate the full system end-to-end:

```
1. Register merchant                     → POST /merchants/register
2. Save apiKey and recoveryCode
3. Set webhook URL (optional)            → PUT /merchants/webhook
4. Create a virtual account              → POST /accounts
5. Save the nombaAccountNumber
6. Create a payment expectation          → POST /payment-expectations
7. Edit gen-sig.js — set customer.accountNumber = nombaAccountNumber
8. Run node gen-sig.js to get sig+body
9. Send the webhook                      → POST /webhooks/nomba (with sig header)
10. Check transaction was created        → GET /transactions
11. Check expectation updated            → GET /payment-expectations/{id}
12. Check installment created            → GET /payment-expectations/{id}/installments
13. Repeat step 7-12 until fully SETTLED
14. Create a disbursement batch          → POST /disbursements
15. Check disbursement status            → GET /disbursements/{id}
16. Simulate payout webhook              → POST /webhooks/nomba (with transfer.success event)
```

---

## Webhook Events Our Service Fires to Merchants

When things happen, our service POSTs to the merchant's `webhookUrl`:

| Event | Trigger | Payload includes |
|---|---|---|
| `payment.received` | Payment matched to an active account | `accountRef`, `transactionId`, `amount`, `status` |
| `payment.misplaced` | Payment on suspended/closed account | `accountRef`, `amount`, `reason` |
| `disbursement.updated` | Each payout recipient resolves | `reference`, `status`, `recipientReference`, `recipientStatus` |

**Signature:** Our outbound webhooks are signed with the merchant's `webhookSecret` using `HMAC-SHA256`. Header: `X-Nomba-Signature: <hex>`.

---

## Quick Status Reference

### Account Status
| Status | Can receive payments? |
|---|---|
| `ACTIVE` | ✅ Yes |
| `SUSPENDED` | ❌ No — payment becomes MisplacedPayment |
| `CLOSED` | ❌ No — payment becomes MisplacedPayment |

### PaymentExpectation Status
| Status | Meaning |
|---|---|
| `PENDING` | No payments yet |
| `PARTIAL` | Some paid, not complete |
| `SETTLED` | Fully paid |
| `CANCELLED` | Manually cancelled |

### Disbursement Status
| Status | Meaning |
|---|---|
| `PENDING` | Created, not started |
| `PROCESSING` | Transfers in flight |
| `COMPLETED` | All recipients paid |
| `PARTIALLY_FAILED` | Mixed results |
| `FAILED` | All failed |

### DisbursementRecipient Status
| Status | Meaning |
|---|---|
| `PENDING` | Transfer not yet sent |
| `SUCCESS` | Transfer confirmed by Nomba webhook |
| `FAILED` | Transfer rejected or timed out |

---

*Last updated: 2026-07-05*
