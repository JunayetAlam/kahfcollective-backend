# Kahf Collective — Backend API

[![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)]()
[![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white)]()
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma&logoColor=white)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)]()
[![License](https://img.shields.io/badge/License-MIT-green)]()

RESTful API powering the Kahf Collective e-learning platform. Handles authentication, course delivery, quizzes and grading, community forums, learning analytics, and Stripe payments.

**Companion frontend:** [`saifghori786-frontend`](../saifghori786-frontend) · **Live app:** https://kahfcollective.vercel.app

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Authentication & Authorization](#authentication--authorization)
- [API Reference](#api-reference)
- [Data Model](#data-model)
- [Integrations](#integrations)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Team](#team)

---

## Overview

The backend is a modular Express 5 application written in TypeScript, backed by MongoDB through Prisma. Every feature lives in a self-contained module under `src/app/modules`, and all traffic is served under the `/api/v1` prefix.

### Key Capabilities

| Capability | Description |
|---|---|
| **Authentication** | JWT access tokens, email verification, password reset, bcrypt hashing |
| **Role-based access** | Three roles (`SUPERADMIN`, `INSTRUCTOR`, `USER`) enforced by a single auth middleware |
| **Course hierarchy** | Course → Semester → Chapter → Content, with reorder and move operations at every level |
| **Content types** | Video upload, video link, PDF, rich text, meeting link, and quizzes |
| **Quiz engine** | Multiple-choice auto-grading plus written answers with manual instructor marking and answer locking |
| **Learning analytics** | Per-content progress tracking, course completion, leaderboards, student and subject comparison |
| **Community** | Study-circle and location-based forums with posts, nested replies, and reactions |
| **Groups** | Group-based access control for courses, forums, and CMS content |
| **CMS** | Articles and sermons with cover images and PDF attachments |
| **Payments** | Stripe Checkout sessions and signed webhook handling |
| **Caching** | Optional Redis layer with a `getOrSet` helper and admin cache invalidation |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Language | TypeScript 5.9 |
| Framework | Express 5.2 |
| Database | MongoDB |
| ORM | Prisma 6.19 (MongoDB provider, multi-file schema) |
| Validation | Zod 4 |
| Auth | `jsonwebtoken` 9, `bcrypt` 6 |
| File storage | Cloudinary 2.8 (via Multer memory storage) |
| Payments | Stripe 20 |
| Email | Nodemailer 7 |
| Cache | Redis 5 (optional) |
| Realtime | Socket.IO 4.8 |
| Scheduling | `node-cron` 4 |
| Tooling | ESLint 9, Prettier 3, `ts-node-dev`, Commitizen |

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **MongoDB** — a replica-set-enabled instance (MongoDB Atlas recommended; Prisma requires a replica set for transactions)
- **Cloudinary** account — required for all file uploads
- **Stripe** account — required for payments and webhooks
- **SMTP credentials** — required for verification and password-reset emails
- **Redis** — optional, only if `REDIS_ENABLED=true`

### Installation

```bash
git clone <your-repo-url>
cd saifghori-backend
npm install
```

`npm install` triggers the `postinstall` hook, which runs `prisma generate` automatically.

### Configuration

Copy the example environment file and fill in your own values:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) for the full reference. At minimum you need `DATABASE_URL`, `JWT_ACCESS_SECRET`, `SUPER_ADMIN_PASSWORD`, and the three `CLOUDINARY_*` values.

### Database Setup

```bash
npm run pg    # generate the Prisma client
npm run pm    # push schema / run migrations
```

### Run

```bash
npm run dev
```

The server starts on `http://localhost:5008` (or whichever `PORT` you set) with hot reload. Visit `/` for a status page and `/api/v1` for the API.

### First Boot

On startup the app seeds a `SUPERADMIN` account if none exists, using `SUPER_ADMIN_PASSWORD` from your environment. Change this password after your first login.

### Optional: Redis via Docker

```bash
docker compose up -d
```

The bundled `docker-compose.yml` provisions a Redis instance only. Set `REDIS_ENABLED=true` to activate caching.

---

## Environment Variables

Create a `.env` file in the project root. **Never commit this file.**

### Core

| Variable | Required | Description | Example |
|---|:---:|---|---|
| `NODE_ENV` | ✅ | Runtime mode | `development` |
| `PORT` | ✅ | HTTP port | `5008` |
| `PROJECT_NAME` | — | Display label | `KahfCollective` |
| `DATABASE_URL` | ✅ | MongoDB connection string | `mongodb+srv://user:pass@cluster/kahf` |
| `BASE_URL_CLIENT` | ✅ | Frontend origin, used in email links | `http://localhost:3000` |
| `BASE_URL_SERVER` | ✅ | Public backend URL | `http://localhost:5008` |

### Authentication

| Variable | Required | Description | Example |
|---|:---:|---|---|
| `JWT_ACCESS_SECRET` | ✅ | Access-token signing secret | `a-long-random-string` |
| `JWT_ACCESS_EXPIRES_IN` | ✅ | Access-token lifetime | `1d` |
| `SUPER_ADMIN_PASSWORD` | ✅ | Password for the seeded super admin | `change-me-now` |
| `BCRYPT_SALT_ROUNDS` | ✅ | bcrypt cost factor | `12` |
| `JWT_REFRESH_SECRET` | — | Reserved; no refresh flow is implemented yet | `another-random-string` |
| `JWT_REFRESH_EXPIRES_IN` | — | Reserved | `7d` |

### File Storage (Cloudinary)

| Variable | Required | Description | Example |
|---|:---:|---|---|
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name | `your-cloud` |
| `CLOUDINARY_API_KEY` | ✅ | API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | ✅ | API secret | `your-api-secret` |
| `CLOUDINARY_PROJECT_NAME` | ✅ | Folder prefix for uploaded assets | `kahfcollective` |

### Email (SMTP)

The mailer connects to Gmail SMTP using the `MAILTRAP_USER` and `MAILTRAP_PASSWORD` values as its credentials — the variable names are historical, so supply your actual SMTP username and password there.

| Variable | Required | Description | Example |
|---|:---:|---|---|
| `MAILTRAP_USER` | ✅ | SMTP username / sender address | `you@gmail.com` |
| `MAILTRAP_PASSWORD` | ✅ | SMTP password or Gmail app password | `your-app-password` |
| `MAILTRAP_PORT` | — | SMTP port | `465` |
| `MAILTRAP_HOST` | — | SMTP host (currently unused) | `smtp.gmail.com` |
| `MAIL` / `MAIL_PASS` | — | Legacy, not read by the app | — |

> **Gmail:** enable two-factor authentication and generate an app-specific password rather than using your account password.

### Payments (Stripe)

| Variable | Required | Description | Example |
|---|:---:|---|---|
| `STRIPE_SECRET_KEY` | ✅ | Server-side secret key | `sk_test_...` |
| `STRIPE_WEBHOOK` | ✅ | Webhook signing secret | `whsec_...` |
| `STRIPE_PUBLISHED_KEY` | — | Publishable key | `pk_test_...` |

### Cache (Redis)

| Variable | Required | Description | Example |
|---|:---:|---|---|
| `REDIS_ENABLED` | — | Toggle caching on or off | `false` |
| `REDIS_HOST` | — | Redis host | `127.0.0.1` |
| `REDIS_PORT` | — | Redis port | `6379` |
| `REDIS_PASSWORD` | — | Redis password | — |

### Deprecated

`DO_SPACE_ENDPOINT`, `DO_SPACE_ACCESS_KEY`, `DO_SPACE_SECRET_KEY`, and `DO_SPACE_BUCKET` are leftovers from the previous DigitalOcean Spaces integration. Uploads now go through Cloudinary and these values are ignored.

---

## Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `ts-node-dev --respawn --transpile-only ./src/server.ts` | Development server with hot reload |
| `npm run build` | `tsc && npx prisma generate` | Compile to `dist/` and regenerate the Prisma client |
| `npm start` | `node ./dist/server.js` | Run the compiled production server |
| `npm run pg` | `npx prisma generate` | Generate the Prisma client |
| `npm run pm` | `npx prisma migrate dev` | Apply schema changes |
| `npm run lint:check` | ESLint | Report lint problems |
| `npm run lint:fix` | ESLint `--fix` | Auto-fix lint problems |
| `npm run prettier:check` | Prettier | Check formatting |
| `npm run prettier:fix` | Prettier `--write` | Apply formatting |
| `npm run lint-prettier` | Both | Lint and format in one pass |
| `npm run cm` | `ts-node create-module.ts` | Scaffold a new feature module |
| `npm run generate-module` | `ts-node generate-module.ts` | Alternative module generator |

**Analytics backfill** — recompute every student's course statistics from scratch:

```bash
npx ts-node src/scripts/backfill-performance.ts
```

The same operation is exposed to super admins at `POST /api/v1/analytics/backfill`.

---

## Project Structure

```
saifghori-backend/
├── prisma/                      # Multi-file Prisma schema
│   ├── schema.prisma            # Generator, datasource, shared config
│   ├── user.prisma              # User model
│   ├── course.prisma            # Course, enrollment relations
│   ├── couse_content.prisma     # Semester, Chapter, CourseContents
│   ├── quiz.prisma              # Quiz, QuizAnswers
│   ├── forum.prisma             # Forum, ForumGroup
│   ├── post.prisma              # Post, Reply, React
│   ├── payment.prisma           # Payment
│   ├── performance.prisma       # ContentProgress, StudentCourseStats
│   └── enum.prisma              # Shared enums
├── src/
│   ├── server.ts                # HTTP server, Redis, Socket.IO, DB seed
│   ├── app.ts                   # Express app, CORS, route mounting
│   ├── config/index.ts          # Typed environment configuration
│   ├── scripts/                 # One-off maintenance scripts
│   └── app/
│       ├── routes/index.ts      # Module route registry
│       ├── modules/             # Feature modules (see below)
│       ├── middlewares/         # auth, validateRequest, upload, error handler
│       ├── builder/             # QueryBuilder — search, filter, paginate
│       ├── errors/              # AppError, Zod error formatter
│       ├── redis/               # Redis client and getOrSet cache helper
│       ├── DB/                  # Super-admin seeding
│       ├── interface/           # Shared types, Express augmentation
│       └── utils/               # sendResponse, catchAsync, mail, Stripe, uploads
├── docker-compose.yml           # Redis service
├── create-module.ts             # Module scaffolding CLI
└── Template-API.postman_collection.json
```

### Feature Modules

Each module under `src/app/modules` follows the same shape: `*.route.ts` → `*.controller.ts` → `*.service.ts`, with `*.validation.ts` for Zod schemas and `*.interface.ts` for types.

| Module | Responsibility |
|---|---|
| `Auth` | Login, registration, email verification, password reset |
| `User` | Profiles, roles, statuses, bulk creation, group membership |
| `Course` | Course CRUD, enrollment, completion, group assignment |
| `Semester` | Semester tier of the course hierarchy |
| `Chapter` | Chapter tier of the course hierarchy |
| `CourseContent` | Lessons and quiz blocks, reordering, moving |
| `Quiz_Answer` | Submissions, grading, locking, results |
| `Content` | Articles and sermons CMS |
| `Forum` | Study-circle and location-based forums |
| `Post` | Posts, nested replies, reactions |
| `Group` | Groups and group-to-course assignment |
| `Payment` | Stripe Checkout and payment history |
| `Analytics` | Progress, leaderboards, comparisons |
| `Utils` | Administrative helpers such as cache invalidation |

To scaffold a new module, run `npm run cm` and follow the prompts.

---

## Architecture

### Request Lifecycle

```
Request
  → CORS
  → JSON / multipart body parsing
  → Request logger
  → auth(...roles)              validates JWT, role, and verification state
  → upload(...)                 Multer memory storage, when the route accepts files
  → parseBody                   parses the JSON `data` field of multipart requests
  → validateRequest(schema)     Zod validation
  → controller (catchAsync)     thin HTTP layer
  → service                     business logic, Prisma access
  → sendResponse                uniform success envelope
  → globalErrorHandler          uniform error envelope
```

### Response Format

Every successful response is wrapped by `sendResponse`:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Course retrieved successfully",
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPage": 5 },
  "data": {}
}
```

`meta` is present only on paginated list endpoints.

Errors are normalized by the global error handler:

```json
{
  "success": false,
  "message": "Validation failed",
  "errorDetails": {}
}
```

The handler recognizes Zod validation errors, Prisma errors (`P2002` unique constraint, `P2003` foreign key, `P2011` null constraint, `P2025` not found), the custom `AppError`, and expired JWTs. Unmatched routes return `404` with `"API NOT FOUND!"`.

### Query Building

List endpoints use `QueryBuilder` (`src/app/builder/QueryBuilder.ts`) for consistent search, filtering, sorting, and pagination. Common query parameters:

| Parameter | Description | Example |
|---|---|---|
| `page` | Page number, 1-indexed | `?page=2` |
| `limit` | Items per page | `?limit=20` |
| `sortBy` | Field to sort by | `?sortBy=createdAt` |
| `sortOrder` | `asc` or `desc` | `?sortOrder=desc` |
| `searchTerm` | Full-text search across module-defined fields | `?searchTerm=tajweed` |

### Prisma Clients

Two clients are exported from `src/app/utils/prisma.ts`. The default `prisma` client omits sensitive user fields such as the password hash and verification tokens, and should be used everywhere. The `insecurePrisma` client exposes the full user record and is reserved for the authentication flow.

---

## Authentication & Authorization

### Token Flow

1. `POST /api/v1/auth/register` creates the account and sends a verification email.
2. `POST /api/v1/auth/verify-email` confirms the address and returns an access token.
3. `POST /api/v1/auth/login` returns an access token for verified accounts; for unverified accounts it re-sends the verification email instead.
4. Clients send the token on every protected request.

Only access tokens are issued — there is no refresh-token rotation, so clients re-authenticate when the token expires.

### Authorization Header

The auth middleware reads the raw header value and does **not** strip a `Bearer ` prefix:

```http
Authorization: <your_jwt_token>
```

### Roles

| Role | Scope |
|---|---|
| `SUPERADMIN` | Full platform control: users, groups, courses, content, payments |
| `INSTRUCTOR` | Owns courses, content, quizzes, grading, forums, and student analytics |
| `USER` | Student: enrolled courses, quiz submissions, forums, payments |

### Access Modifiers

Alongside real roles, routes can declare these pseudo-roles:

| Modifier | Behavior |
|---|---|
| `ANY` | Any authenticated, email-verified user |
| `UNAUTHORIZED` | Optional auth — the request proceeds without a token, but the user is attached if one is supplied |
| `NOT_CHECK_ADMIN_VERIFICATION` | Skips the `isUserVerified` gate, so unverified students can still reach payment routes |

### Verification Gates

A request must clear three checks before reaching a handler: the account must not be `BLOCKED`, the email must be verified (`isEmailVerified`), and — for the `USER` role — an administrator must have approved the account (`isUserVerified`), unless the route opts out with `NOT_CHECK_ADMIN_VERIFICATION`.

---

## API Reference

**Base URL:** `/api/v1`

A Postman collection is included at `Template-API.postman_collection.json`.

### Non-versioned Routes

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/` | Server status page | Public |
| `POST` | `/api/v1/payments/webhooks` | Stripe webhook receiver (raw body, signature-verified) | Stripe only |
| `GET` | `/upload/*` | Legacy static uploads | Public |

### Auth — `/api/v1/auth`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/register` | Create an account and send verification email | Public |
| `POST` | `/login` | Authenticate and receive an access token | Public |
| `POST` | `/verify-email` | Verify email with a token | Public |
| `POST` | `/resend-verification-email` | Re-send the verification email | Public |
| `POST` | `/forget-password` | Send a password-reset link | Public |
| `POST` | `/reset-password` | Set a new password using a reset token | Public |
| `POST` | `/change-password` | Change password while logged in | `ANY` |

### Users — `/api/v1/users`

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/` | List all users | `SUPERADMIN` |
| `GET` | `/me` | Current user's profile | `ANY` |
| `GET` | `/:id` | User details | `ANY` |
| `GET` | `/group-users/:groupId` | Users in a group | `SUPERADMIN`, `INSTRUCTOR` |
| `GET` | `/all/multiple-group-users` | Users across several groups | `SUPERADMIN`, `INSTRUCTOR` |
| `PUT` | `/update-profile` | Update own profile | `ANY` |
| `PUT` | `/update-profile-image` | Upload a profile photo | `ANY` |
| `PUT` | `/user-role/:id` | Change a user's role | `SUPERADMIN` |
| `PUT` | `/user-status/:id` | Change a user's status | `SUPERADMIN` |
| `PUT` | `/toggle-verify-status/:id` | Approve or revoke a student | `SUPERADMIN` |
| `PUT` | `/update-password/:id` | Reset another user's password | `SUPERADMIN` |
| `POST` | `/create-multiple-user` | Bulk-create users | `SUPERADMIN` |
| `DELETE` | `/:id` | Soft-delete a user | `SUPERADMIN` |

### Courses — `/api/v1/courses`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/` | Create a course with a thumbnail | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/` | List courses | `UNAUTHORIZED` |
| `GET` | `/:id` | Course details | `UNAUTHORIZED` |
| `GET` | `/:id/exist` | Existence check | Public |
| `GET` | `/admin/:id` | Course details, admin view | `SUPERADMIN` |
| `PATCH` | `/:id` | Update a course | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:id/toggle-status` | Switch between draft, active, and hidden | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:id/toggle-delete` | Soft-delete or restore | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:courseId/toggle-allow-to-all` | Open the course to every user | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:courseId/toggle-complete` | Mark the course complete | `USER` |
| `POST` | `/enroll` | Enroll or unenroll a student | `INSTRUCTOR`, `SUPERADMIN` |
| `POST` | `/enroll/bulk` | Enroll many students at once | `INSTRUCTOR`, `SUPERADMIN` |
| `POST` | `/assign-course-to-group` | Grant a group access to the course | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/enrolled-students/:courseId` | List enrolled students | `INSTRUCTOR`, `SUPERADMIN` |

### Semesters — `/api/v1/semesters`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/` | Create a semester | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/course/:courseId` | Semesters in a course | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:id` | Rename a semester | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:id/change-index` | Reorder | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:id/toggle-delete` | Soft-delete or restore | `INSTRUCTOR`, `SUPERADMIN` |

### Chapters — `/api/v1/chapters`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/` | Create a chapter | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/semester/:semesterId` | Chapters in a semester | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:id` | Rename a chapter | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:id/change-index` | Reorder | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:id/move` | Move to a different semester | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:id/toggle-delete` | Soft-delete or restore | `INSTRUCTOR`, `SUPERADMIN` |

### Course Contents — `/api/v1/course-contents`

Lesson management:

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/` | Create video or PDF content via upload | `INSTRUCTOR`, `SUPERADMIN` |
| `POST` | `/text-or-link` | Create text, video-link, or meeting-link content | `INSTRUCTOR`, `SUPERADMIN` |
| `PUT` | `/:id` | Replace an uploaded file | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:contentId` | Update metadata | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:contentId/change-index` | Reorder | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:contentId/move` | Move across semesters or chapters | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/:contentId/toggle-delete` | Soft-delete or restore | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/course/:courseId` | Full content tree, admin view | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/course/:courseId/user` | Content tree, student view | `ANY` |
| `GET` | `/:contentId/admin` | Single item, admin view | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/:contentId` | Single item, student view | `ANY` |
| `PUT` | `/question/answers` | Update a Q&A answer's status | `INSTRUCTOR`, `SUPERADMIN` |

Quiz authoring:

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/quiz` | Create a quiz content block | `INSTRUCTOR`, `SUPERADMIN` |
| `POST` | `/quiz/single` | Add one question to a quiz | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/quiz/:quizId` | Update a question | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/quiz/:quizId/change-index` | Reorder questions | `INSTRUCTOR`, `SUPERADMIN` |
| `PATCH` | `/quiz/:quizId/toggle-delete` | Soft-delete a question | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/:courseContentId/quizzes` | Questions with answer keys | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/:courseContentId/quizzes/user` | Questions without answer keys | `ANY` |
| `GET` | `/quiz/:quizId/admin` | Single question, admin view | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/quiz/:quizId` | Single question, student view | `ANY` |

### Quiz Answers — `/api/v1/answer-quizzes`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/` | Submit an answer | `USER` |
| `POST` | `/lock/:contentId` | Finalize a submission, blocking further edits | `USER` |
| `GET` | `/result/:contentId` | Own result for a quiz | `USER` |
| `GET` | `/:quizId` | A single question with the student's answer | `USER` |
| `POST` | `/mark` | Grade a written answer | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/quiz-answers` | All submissions | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/result-instructor` | Results across a cohort | `INSTRUCTOR`, `SUPERADMIN` |

### Analytics — `/api/v1/analytics`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/content-progress` | Record started or completed content | `USER`, `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/content-progress/:contentId` | Progress for one item | `USER`, `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/content-progress/course/:courseId` | Completed content IDs in a course | `USER`, `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/me` | Own performance summary | `USER`, `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/me/courses/:courseId` | Own per-course breakdown | `USER`, `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/subject-compare` | Compare subject performance | `USER`, `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/students/:userId` | A student's summary | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/students/:userId/courses/:courseId` | A student's course breakdown | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/courses/:courseId/leaderboard` | Course leaderboard | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/compare` | Compare multiple students | `INSTRUCTOR`, `SUPERADMIN` |
| `POST` | `/backfill` | Recompute all statistics | `SUPERADMIN` |

### Content (Articles & Sermons) — `/api/v1/contents`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/` | Create an article or sermon | `INSTRUCTOR`, `SUPERADMIN` |
| `GET` | `/` | List content | `ANY` |
| `GET` | `/:id` | Content details | `ANY` |
| `PATCH` | `/:id` | Update content | `INSTRUCTOR`, `SUPERADMIN` |
| `PUT` | `/toggle-feature/:id` | Toggle the featured flag | `SUPERADMIN` |
| `DELETE` | `/:id` | Delete content | `INSTRUCTOR`, `SUPERADMIN` |

### Forums — `/api/v1/forums`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/circle` | Create a study-circle forum | `SUPERADMIN`, `INSTRUCTOR` |
| `POST` | `/location` | Create a location-based forum | `SUPERADMIN`, `INSTRUCTOR` |
| `GET` | `/` | List forums | `ANY` |
| `GET` | `/:id` | Forum details | `ANY` |
| `GET` | `/join/:forumId` | Members of a forum | `ANY` |
| `PATCH` | `/circle/:forumId` | Update a circle forum | `SUPERADMIN`, `INSTRUCTOR` |
| `PATCH` | `/location/:forumId` | Update a location forum | `SUPERADMIN`, `INSTRUCTOR` |
| `DELETE` | `/:forumId` | Delete a forum | `SUPERADMIN`, `INSTRUCTOR` |

### Posts — `/api/v1/posts`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/:forumId` | Create a post | `ANY` |
| `POST` | `/reply/:postId` | Reply to a post | `ANY` |
| `POST` | `/reply-to-reply/:parentReplyId` | Reply to a reply | `ANY` |
| `POST` | `/react/:postId` | Toggle a reaction | `ANY` |
| `GET` | `/forum/:forumId` | Posts in a forum | `ANY` |
| `GET` | `/replies/:postId` | Replies to a post | `ANY` |
| `GET` | `/reacts/:postId` | Reactions on a post | `ANY` |
| `GET` | `/` | All posts, for moderation | `SUPERADMIN`, `INSTRUCTOR` |
| `POST` | `/toggle-status/:postId` | Publish or unpublish | `INSTRUCTOR`, `SUPERADMIN` |
| `DELETE` | `/toggle-delete/:postId` | Soft-delete a post | `INSTRUCTOR`, `SUPERADMIN` |
| `DELETE` | `/reply/:id` | Delete a reply | `SUPERADMIN`, `INSTRUCTOR` |

### Groups — `/api/v1/groups`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/` | Create a group | `SUPERADMIN` |
| `GET` | `/` | List groups | Public |
| `GET` | `/:id` | Group details | Public |
| `GET` | `/admin` | List groups, admin view | `SUPERADMIN` |
| `GET` | `/admin/:id` | Group details, admin view | `SUPERADMIN` |
| `PATCH` | `/toggle-group` | Add or remove a member | `SUPERADMIN` |
| `PATCH` | `/:id` | Rename a group | `SUPERADMIN` |
| `PATCH` | `/:id/toggle-delete` | Soft-delete or restore | `SUPERADMIN` |

### Payments — `/api/v1/payments`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/` | Create a Stripe Checkout session | `USER`, `NOT_CHECK_ADMIN_VERIFICATION` |
| `POST` | `/cancel/:id` | Cancel a pending payment | `ANY`, `NOT_CHECK_ADMIN_VERIFICATION` |
| `GET` | `/` | Own payment history | `USER` |
| `GET` | `/:id` | Own payment details | `USER` |
| `GET` | `/session/:stripeSessionId` | Look up a payment by Checkout session | `USER`, `NOT_CHECK_ADMIN_VERIFICATION` |
| `GET` | `/admin` | All payments | `SUPERADMIN` |
| `GET` | `/admin/:id` | Any payment's details | `SUPERADMIN` |

### Utils — `/api/v1/utils`

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/invalidate-full-redis` | Flush the entire Redis cache | `SUPERADMIN`, `INSTRUCTOR` |

---

## Data Model

Prisma schemas are split by domain across the `prisma/` directory.

### Identity & Access

| Model | Notable Fields |
|---|---|
| `User` | `fullName`, `email`, `password`, `role`, `status`, `profile`, `isEmailVerified`, `isUserVerified`, `currentClass`, `roll`, `subject`, `isDeleted` |
| `Group` | `name` (unique), `isDeleted` |
| `UserGroup` | `userId`, `groupId` |

### Learning

| Model | Notable Fields |
|---|---|
| `Course` | `title`, `description`, `instructorId`, `status`, `thumbnail`, `forAll`, `isDeleted` |
| `Semester` | `name`, `courseId`, `index`, `isDeleted` |
| `Chapter` | `name`, `semesterId`, `courseId`, `index`, `isDeleted` |
| `CourseContents` | `type`, `title`, `videoUrl`, `pdfUrl`, `text`, `videoLink`, `meetingLink`, `index`, `status` |
| `Quiz` | `type`, `courseContentId`, `question`, `optionA`–`optionD`, `rightAnswer`, `index` |
| `QuizAnswers` | `quizId`, `userId`, `answer`, `isRight`, `isMarked`, `isLocked` |
| `Question` / `QuestionAnswer` | Free-form Q&A attached to a content item |
| `EnrollCourse` / `CompleteCourse` / `GroupCourse` | Enrollment, completion, and group-access join records |

### Community & Content

| Model | Notable Fields |
|---|---|
| `Forum` | `title`, `forumType`, `forAll`, `forAllGroups`, `courseId`, `country`, `events` |
| `Post` | `message`, `userId`, `forumId`, `isPublished`, `isDeleted` |
| `Reply` | `postId`, `userId`, `parentReplyId`, `message` |
| `React` | `postId`, `userId` |
| `Content` | `contentType`, `title`, `description`, `coverImage`, `articlePDF`, `isFeatured`, `authorId`, `groupId` |

### Commerce & Analytics

| Model | Notable Fields |
|---|---|
| `Payment` | `userId`, `paymentType`, `amount`, `currency`, `status`, Stripe identifiers, card metadata |
| `ContentProgress` | `userId`, `courseContentId`, `courseId`, `status` |
| `StudentCourseStats` | `userId`, `courseId`, `quizAvgPercent`, `completionPercent`, `rank`, `lastActivityAt` |

### Enums

| Enum | Values |
|---|---|
| `UserRoleEnum` | `SUPERADMIN`, `INSTRUCTOR`, `USER` |
| `UserStatus` | `ACTIVE`, `INACTIVE`, `BLOCKED` |
| `CourseStatus` | `DRAFT`, `ACTIVE`, `HIDDEN` |
| `ContentType` | `VIDEO`, `QUIZ`, `PDF`, `TEXT`, `VIDEO_LINK`, `MEETING_LINK` |
| `QuizType` | `MULTIPLE_CHOICE`, `WRITE_ANSWER` |
| `ForumType` | `STUDY_CIRCLES`, `LOCATION_BASED` |
| `PaymentType` | `DONATION`, `PURCHASE` |
| `ProgressStatus` | `STARTED`, `COMPLETED` |

---

## Integrations

### Cloudinary

All uploads route through `src/app/utils/uploadToStorage.ts`. Multer buffers files in memory with a 100 MB per-file limit, then streams them to Cloudinary under the folder named by `CLOUDINARY_PROJECT_NAME`. Images, video, and PDFs are supported.

Routes that accept files expect `multipart/form-data` with the file part alongside a `data` field containing a JSON string of the remaining payload. The `parseBody` middleware deserializes that field before validation.

### Stripe

Checkout sessions are created from `POST /api/v1/payments` for both course purchases and donations.

Configure your webhook endpoint in the Stripe dashboard:

```
https://your-domain.com/api/v1/payments/webhooks
```

Subscribe to these events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, and `invoice.payment_succeeded`. Copy the signing secret into `STRIPE_WEBHOOK`. The webhook route is mounted before the JSON body parser so Stripe's signature check sees the raw payload.

For local testing:

```bash
stripe listen --forward-to localhost:5008/api/v1/payments/webhooks
```

### Redis

Caching is opt-in via `REDIS_ENABLED`. When disabled, `getOrSet` falls straight through to the database, so the app runs fine without Redis. When enabled, it caches authenticated user lookups and heavier list endpoints. Super admins and instructors can clear the cache through `POST /api/v1/utils/invalidate-full-redis`.

### Email

Nodemailer sends verification and password-reset messages over Gmail SMTP, using the credentials described in the [email environment variables](#email-smtp). Links embedded in those emails point at `BASE_URL_CLIENT`.

### Socket.IO

A Socket.IO server is attached to the HTTP server in `src/server.ts`. Clients emit `register` with their user ID to join a personal room, which lays the groundwork for targeted notifications.

---

## Deployment

### Build and Run

```bash
npm run build   # tsc → dist/, then prisma generate
npm start       # node dist/server.js
```

### Production Checklist

- Set `NODE_ENV=production`.
- Point `BASE_URL_CLIENT` and `BASE_URL_SERVER` at your live domains.
- Swap in live Stripe keys and register the production webhook endpoint.
- Use strong, freshly generated JWT secrets.
- Rotate `SUPER_ADMIN_PASSWORD` and change it again after the first login.
- Add your production frontend origin to the CORS allow-list in `src/app.ts`.
- Confirm your MongoDB instance is a replica set so Prisma transactions work.

### CORS

Allowed origins are declared in `src/app.ts`. Development defaults cover `http://localhost:3000`, `:3001`, and `:3005`, plus the deployed frontend at `https://kahfcollective.vercel.app`. Add new domains there before deploying.

---

## Contributing

1. Create a feature branch off `main`.
2. Scaffold new features with `npm run cm` so they match the existing module layout.
3. Run `npm run lint-prettier` before committing.
4. Commit with Commitizen (`npx cz`) to keep the conventional-commit history consistent.
5. Open a pull request describing the change and any new environment variables.

### Known Gaps

Contributions in these areas are especially welcome:

- No automated test suite (`npm test` is a placeholder).
- No rate limiting on public endpoints.
- No refresh-token flow, despite the reserved `JWT_REFRESH_*` variables.
- The daily subscription-expiry cron job in `src/app.ts` is commented out.
- The AWS SDK dependencies and `DO_SPACE_*` variables are dead weight from the old storage provider.

---

## Team

Developed by **Junayet Alam** (Full Stack), **Robin Mia**, and **Mir Noman**.

## License

MIT
