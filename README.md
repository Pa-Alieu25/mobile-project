# KNUST ClassMate

A mobile academic-coordination app for KNUST students and course representatives:
timetable, announcements, assignments (with document attachments), exam-venue
lookup by index number, midsem scores, class reminders, and course-rep/admin
management tools. It works offline for previously loaded academic data.

- **Frontend:** React Native + TypeScript, Expo SDK 56, Expo Router, EAS dev client
- **Backend:** Java 17, Spring Boot 3.3.5, Spring Security + JWT, Spring Data JPA, Maven
- **Database:** PostgreSQL (Neon)
- **Android package:** `com.knust.classmate`

## Roles

| Role | How it's created | Can do |
|---|---|---|
| **Student** | Public self-registration (always STUDENT) | View timetable/announcements/assignments/scores, exam search, reminders |
| **Course rep** | An admin promotes an existing student | All student actions + post announcements/assignments/timetable/exam venues/scores, cancel classes, delete their own posts |
| **Admin** | Provisioned directly in the database (no self-registration) | Promote/remove reps, view all posts, view the audit log |

Public registration is forced to STUDENT **server-side** (`AuthService.register`); the
request payload has no role field, so it cannot be manipulated to gain privileges.

## Prerequisites

- Node.js 20+ and npm
- Java 17 (JDK) and Maven
- A PostgreSQL database (Neon works well) with a `jdbc:postgresql://…` URL
- Android Studio (emulator) or a physical Android device with the EAS dev client
- Expo account + EAS CLI (`npm i -g eas-cli`) for development builds and remote push

## Frontend setup

```bash
npm install
npx expo start --dev-client      # opens Metro; press "a" for Android
```

- API base URL lives in **`src/constants/config.ts`** (`API_BASE_URL`). It defaults to
  the deployed Railway backend. For local backend development, point it at
  `http://10.0.2.2:8080/api` (the Android emulator's alias for your machine's
  `localhost`).
- Optional env var for payments: `EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY` (a Paystack **test**
  public key). Without it, the paywall shows a "not set up" message instead of checkout.

### Type-check / lint

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor        # checks SDK/native module alignment
```

## Backend setup

```bash
cd backend
# Required environment variables (never commit real values):
export DATABASE_URL="jdbc:postgresql://<host>/<db>?sslmode=require"
export DATABASE_USERNAME="<user>"
export DATABASE_PASSWORD="<password>"
export JWT_SECRET="<a long random secret>"

mvn -q clean compile          # verify it builds (Java 17)
mvn spring-boot:run           # starts on http://localhost:8080/api
```

- Context path is `/api`, port `8080`. Health check: `GET /api/health`.
- Schema is managed by Hibernate `ddl-auto=update`, so tables are created/updated on
  first run — no manual migration needed. Assignment document bytes are stored in the
  `assignment_documents` table.
- **On Windows PowerShell**, set variables with `$env:DATABASE_URL="…"` before `mvn`.

### Provisioning an admin

There is no admin self-registration. Register a normal student account, then promote it
directly in the database:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@st.knust.edu.gh';
```

Sign out and back in to pick up the new role. That admin can then promote course reps by
index number or email from the Admin panel.

## Offline behaviour

Timetable, announcements, assignments, and exam venues use a **network-first, cache-fallback**
pattern (`src/services/cache.ts`): fresh data is fetched and cached on success; the last
cached copy is shown (with an offline banner) when the network fails. Exam search downloads
all venues once, then filters locally by index range — so it works fully offline afterward.
On sign-out, private per-student state and cached data are cleared so a shared device does
not leak one user's data to the next.

## Notifications

- **Local** (works in Expo Go and dev builds): class reminders 30 min before class; toggled
  in Profile. High-priority reminder behaviour is used where the operating system permits.
- **Remote push** (class cancellations, score/exam alerts): requires an **EAS development
  build** with FCM configured — it does not work in Expo Go. Tapping a notification deep-links
  to the relevant screen.

## Payments (Paystack)

Freemium: the first semester is free automatically (no card required). Pro is demonstrated in
**Paystack test mode** via `react-native-paystack-webview`. The Pro tier is tracked on-device
for the demo; production would require server-side webhook verification. No secret keys are
committed.

## Builds (EAS)

```bash
eas build --profile development --platform android   # dev client APK
eas build --profile preview --platform android       # shareable internal APK
```

Profiles are defined in `eas.json`. The Android package is `com.knust.classmate`. A new EAS
dev build is required whenever a **native** dependency changes (e.g. `expo-sharing`,
`expo-notifications`); pure JS/font changes do not need a rebuild.

## Known limitations (honest)

- **Per-student state (assignment completion, announcement reads) is stored per-device**, not
  synced across devices (the backend has no per-student status table). It is correct on a
  single device and is cleared on sign-out.
- **Course-rep authorisation is role-level, not per-class-group.** Any course rep can post to
  any class group; there is no rep→class-group assignment model yet. Deletion *is* ownership-checked
  (a rep can only delete their own posts; admins can delete any).
- **Pro subscription is on-device demo state**, not server-verified.
- **Password recovery** is a placeholder screen (not wired to the backend).
- Remote push needs an EAS dev build + FCM; document open/download needs `expo-sharing` in the
  installed dev build.


  ## Local Development Setup (Windows / Android)

If you are developing on a Windows machine, the recommended workflow is to use an Android Emulator or a physical Android device. 

**Steps to run locally:**
1. Ensure you have [Node.js](https://nodejs.org/) installed.
2. Run `npm install` to install project dependencies.
3. If using an emulator, open Android Studio and launch your Virtual Device.
4. Run `npx expo start` in the terminal.
5. Press `a` in the terminal to launch the app on your Android emulator, or scan the QR code with the Expo Go app on your physical Android device.

*Note: Avoid committing changes to `app.json` or `eas.json` that are specific to your personal Expo account.*


## Demo procedure

1. Register a student; log in.
2. Promote that student to admin via SQL (above); or use a pre-provisioned admin.
3. Admin promotes another student to course rep by index number.
4. Rep posts an announcement and an assignment **with a document**.
5. Student views the announcement, opens the assignment document.
6. Rep cancels a class → student's timetable shows the cancelled state.
7. Rep uploads an exam-venue range and midsem scores.
8. Student searches their exam venue (then turn off Wi-Fi and search again — still works).
9. Student views their own score; opens Maps navigation to a venue.
10. Admin views the audit log; sign out and confirm login is required again.

Use controlled test accounts and safe sample data. Do not hardcode passwords in the repo.

## Troubleshooting

- **Metro shows stale code / fonts:** `npx expo start -c` (clears the cache).
- **Backend won't start:** confirm `DATABASE_URL` begins with `jdbc:postgresql://` and the env
  vars are exported in the same shell.
- **Document open fails on device:** the dev client predates `expo-sharing`; rebuild it.
- **Login says "too many attempts":** login rate-limiting triggered (5 failures / 15 min) — wait.
- **Emulator can't reach the backend:** use `http://10.0.2.2:8080/api`, not `localhost`.
