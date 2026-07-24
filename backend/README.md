# KNUST ClassMate Backend

Spring Boot backend for the KNUST ClassMate mobile app.

## Stack

- Java 17
- Spring Boot 3.3.5
- Spring Web
- Spring Security
- Spring Data JPA
- PostgreSQL (NeonDB)
- Maven

## Run Locally

```bash
cd backend
mvn spring-boot:run
```

## Health Check

```
GET http://localhost:8080/api/health
```

Expected response:

```json
{
  "status": "KNUST ClassMate backend is running"
}
```

## Environment Variables

Set these before running:

```
DATABASE_URL=jdbc:postgresql://your-neon-host/your-db?sslmode=require
DATABASE_USERNAME=your-username
DATABASE_PASSWORD=your-password
```

## Paystack Payments

The Pro subscription paywall is backed by Paystack. All Paystack calls go
through this backend — the app never talks to `api.paystack.co` directly, and
never decides a payment succeeded on its own; only this server's verified
result (via the verify endpoint or the webhook) does.

**Environment variables** (see `.env.example`):

```
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APP_BASE_URL=https://your-railway-domain.up.railway.app/api
```

Get the secret key from the Paystack dashboard under **Settings > API Keys &
Webhooks**. Use a test key (`sk_test_...`) until you're ready to take real
payments — never the live key in development.

**Webhook URL** — register this in the Paystack dashboard under **Settings >
API Keys & Webhooks > Webhook URL**:

```
https://<your-railway-domain>/api/payments/webhook
```

**Test card** (test mode only, no real charge):

```
Card number: 4084 0840 8408 4081
Expiry:      any future date
CVV:         408
```

## Package Structure

```
com.knust.classmate
├── admin
├── announcement
├── assignment
├── audit
├── auth
├── config
├── examvenue
├── exception
├── notification
├── payment
├── profile
├── score
├── timetable
└── user
```
