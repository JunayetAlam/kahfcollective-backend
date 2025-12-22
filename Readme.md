# Kahf Collective - Backend

[![License](https://img.shields.io/badge/License-MIT-green)]()

Backend API for Kahf Collective e-learning platform. Built with Node.js, Express, TypeScript, MongoDB, and Prisma ORM.

## Table of Contents
- [Overview](#overview)
- [API Architecture](#api-architecture)
- [API Endpoints](#api-endpoints)
- [Technologies Used](#technologies-used)
- [How to Run the Project](#how-to-run-the-project)
- [Environment Variables](#environment-variables)

---

## Overview

The Kahf Collective backend provides a RESTful API that powers the e-learning platform. It handles authentication, user management, course creation and management, content delivery, forum discussions, payment processing, and quiz/assignment functionality.

### Key Features
- JWT-based authentication with email verification
- Role-based access control (SUPERADMIN, INSTRUCTOR, USER)
- Course and content management with multiple content types
- Forum/discussion system with nested replies
- Payment integration with Stripe
- Quiz system with automatic and manual grading
- Group-based user management
- File upload handling with DigitalOcean Spaces (S3-compatible)
- Automated task scheduling

---

## API Architecture

The backend follows a modular architecture with the following structure:

```
modules/
├── Auth/           # Authentication & authorization
├── User/           # User management
├── Course/         # Course CRUD operations
├── CourseContent/  # Course content & quizzes
├── Content/        # Fraternity & blog content
├── Forum/          # Discussion forums
├── Post/           # Forum posts & replies
├── Group/          # User group management
├── Payment/        # Payment processing
└── Quiz_Answer/    # Quiz submissions & grading
```

---

## API Endpoints

### Authentication
Base Path: `/api/auth`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/login` | User login | Public |
| POST | `/register` | User registration | Public |
| POST | `/verify-email` | Email verification | Public |
| POST | `/resend-verification-email` | Resend verification email | Public |
| POST | `/change-password` | Change password | Authenticated |
| POST | `/forget-password` | Request password reset | Public |
| POST | `/reset-password` | Reset password with token | Public |

### Users
Base Path: `/api/users`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all users | SUPERADMIN |
| GET | `/group-users/:groupId` | Get users by group | SUPERADMIN, INSTRUCTOR |
| GET | `/me` | Get current user profile | Authenticated |
| GET | `/:id` | Get user by ID | Authenticated |
| PUT | `/update-profile` | Update profile | Authenticated |
| PUT | `/update-profile-image` | Update profile image | Authenticated |
| PUT | `/user-role/:id` | Update user role | SUPERADMIN |
| PUT | `/user-status/:id` | Update user status | SUPERADMIN |
| PUT | `/toggle-verify-status/:id` | Toggle user verification | SUPERADMIN |
| DELETE | `/:id` | Delete user | SUPERADMIN |

### Courses
Base Path: `/api/courses`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create course | INSTRUCTOR |
| GET | `/` | Get all courses | Public |
| GET | `/:id` | Get course by ID | Public |
| GET | `/admin/:id` | Get course (admin view) | SUPERADMIN, INSTRUCTOR |
| PATCH | `/:id` | Update course | INSTRUCTOR, SUPERADMIN |
| PATCH | `/:id/toggle-delete` | Soft delete/restore course | INSTRUCTOR, SUPERADMIN |
| PATCH | `/:id/toggle-status` | Toggle course status | INSTRUCTOR, SUPERADMIN |
| GET | `/:id/exist` | Check if course exists | Public |
| PATCH | `/:courseId/toggle-complete` | Mark course complete | USER |
| POST | `/enroll` | Enroll/unenroll user | INSTRUCTOR, SUPERADMIN |
| POST | `/enrolled-students/:courseId` | Get enrolled students | INSTRUCTOR, SUPERADMIN |

### Course Content
Base Path: `/api/course-contents`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create file content | INSTRUCTOR, SUPERADMIN |
| POST | `/quiz` | Create quiz content | INSTRUCTOR, SUPERADMIN |
| POST | `/quiz/single` | Create individual quiz | INSTRUCTOR, SUPERADMIN |
| PUT | `/:id` | Update file content | INSTRUCTOR, SUPERADMIN |
| PUT | `/question/answers` | Update answer status | INSTRUCTOR, SUPERADMIN |
| PATCH | `/:contentId` | Update content metadata | INSTRUCTOR, SUPERADMIN |
| PATCH | `/:contentId/toggle-delete` | Soft delete content | INSTRUCTOR, SUPERADMIN |
| PATCH | `/:contentId/change-index` | Reorder content | INSTRUCTOR, SUPERADMIN |
| GET | `/course/:courseId` | Get all content (admin) | INSTRUCTOR, SUPERADMIN |
| GET | `/course/:courseId/user` | Get content (user view) | Authenticated |
| GET | `/:contentId/admin` | Get single content (admin) | INSTRUCTOR, SUPERADMIN |
| GET | `/:contentId` | Get single content | Authenticated |

### Content (Fraternity & Blogs)
Base Path: `/api/contents`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create content | INSTRUCTOR, SUPERADMIN |
| GET | `/` | Get all contents | Authenticated |
| GET | `/:id` | Get content by ID | Authenticated |
| PATCH | `/:id` | Update content | INSTRUCTOR, SUPERADMIN |
| DELETE | `/:id` | Delete content | INSTRUCTOR, SUPERADMIN |
| PUT | `/toggle-feature/:id` | Toggle featured status | SUPERADMIN |

### Forums
Base Path: `/api/forums`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/circle` | Create circle forum | SUPERADMIN, INSTRUCTOR |
| POST | `/location` | Create location forum | SUPERADMIN, INSTRUCTOR |
| GET | `/` | Get all forums | Authenticated |
| GET | `/join/:forumId` | Get connected users | Authenticated |
| GET | `/:id` | Get single forum | Authenticated |
| PATCH | `/circle/:forumId` | Update circle forum | SUPERADMIN, INSTRUCTOR |
| PATCH | `/location/:forumId` | Update location forum | SUPERADMIN, INSTRUCTOR |
| DELETE | `/:forumId` | Delete forum | SUPERADMIN, INSTRUCTOR |

### Posts
Base Path: `/api/posts`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/:forumId` | Create post in forum | Authenticated |
| POST | `/reply/:postId` | Reply to post | Authenticated |
| POST | `/reply-to-reply/:parentReplyId` | Reply to a reply | Authenticated |
| POST | `/react/:postId` | Toggle reaction | Authenticated |
| GET | `/forum/:forumId` | Get all posts in forum | Authenticated |
| GET | `/` | Get all posts | SUPERADMIN, INSTRUCTOR |
| GET | `/replies/:postId` | Get all replies | Authenticated |
| GET | `/reacts/:postId` | Get all reactions | Authenticated |
| POST | `/toggle-status/:postId` | Toggle publish status | INSTRUCTOR, SUPERADMIN |
| DELETE | `/toggle-delete/:postId` | Soft delete post | INSTRUCTOR, SUPERADMIN |
| DELETE | `/reply/:id` | Delete reply | SUPERADMIN, INSTRUCTOR |

### Groups
Base Path: `/api/groups`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create group | SUPERADMIN |
| GET | `/` | Get all groups | Public |
| GET | `/admin` | Get all groups (admin) | SUPERADMIN |
| GET | `/:id` | Get group by ID | Public |
| GET | `/admin/:id` | Get group by ID (admin) | SUPERADMIN |
| PATCH | `/toggle-group` | Assign/unassign group | SUPERADMIN |
| PATCH | `/:id` | Update group | SUPERADMIN |
| PATCH | `/:id/toggle-delete` | Soft delete group | SUPERADMIN |

### Payments
Base Path: `/api/payments`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create payment checkout | USER |
| POST | `/cancel/:id` | Cancel payment | Authenticated |
| GET | `/admin` | Get all payments | SUPERADMIN |
| GET | `/admin/:id` | Get single payment (admin) | SUPERADMIN |
| GET | `/` | Get user's payments | USER |
| GET | `/:id` | Get single payment | USER |
| GET | `/session/:stripeSessionId` | Get transaction by session | USER |

### Quiz Answers
Base Path: `/api/answer-quizzes`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Submit quiz answer | USER |
| POST | `/mark` | Mark quiz answer | INSTRUCTOR, SUPERADMIN |
| POST | `/lock/:contentId` | Lock quizzes | USER |
| GET | `/quiz-answers` | Get all quiz answers | INSTRUCTOR, SUPERADMIN |
| GET | `/result/:contentId` | Get quiz result | USER |
| GET | `/result-instructor` | Get quiz results (instructor) | INSTRUCTOR, SUPERADMIN |
| GET | `/:quizId` | Get single quiz with answer | USER |

---

## Technologies Used

### Core Framework & Language
- **Node.js** - JavaScript runtime environment
- **Express.js** (v5.1.0) - Fast, minimalist web framework
- **TypeScript** (v5.8.3) - Typed superset of JavaScript

### Database & ORM
- **MongoDB** (v6.17.0) - NoSQL database
- **Prisma** (v6.10.1) - Next-generation ORM for Node.js and TypeScript
- **@prisma/client** - Auto-generated database client

### Authentication & Security
- **jsonwebtoken** (v9.0.2) - JWT token generation and verification
- **bcrypt** (v6.0.0) - Password hashing library
- **cors** (v2.8.5) - Cross-Origin Resource Sharing middleware

### File Storage & Upload
- **@aws-sdk/client-s3** (v3.835.0) - AWS SDK for S3-compatible storage (DigitalOcean Spaces)
- **@aws-sdk/lib-storage** (v3.835.0) - Multipart upload support
- **Multer** (v2.0.1) - Middleware for handling multipart/form-data

### Payment Processing
- **Stripe** (v18.5.0) - Payment gateway integration

### Email Services
- **Nodemailer** (v7.0.3) - Email sending library

### Task Scheduling
- **node-cron** (v4.2.1) - Task scheduler for Node.js

### Validation & Utilities
- **Zod** (v3.25.67) - TypeScript-first schema validation
- **http-status** (v2.1.0) - HTTP status codes utility
- **dotenv** (v16.5.0) - Environment variable management

### Development Tools
- **ts-node-dev** (v2.0.0) - TypeScript development server with auto-reload
- **ts-node** (v10.9.2) - TypeScript execution environment
- **ESLint** (v9.15.0) - Code linting
- **Prettier** (v3.6.0) - Code formatting

---

## How to Run the Project

### Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** (local installation or MongoDB Atlas account)
- **Stripe Account** (for payment processing)
- **DigitalOcean Spaces** (or any S3-compatible storage)
- **Email Service** (Gmail or Mailtrap for development)

### Installation Steps

#### 1. Clone the repository
```bash
git clone <your-repo-url>
cd server
```

#### 2. Install dependencies
```bash
npm install
```

This will automatically run `prisma generate` via the postinstall script.

#### 3. Set up environment variables

Create a `.env` file in the root directory and add the following variables:

```env
# Environment
NODE_ENV=development
PROJECT_NAME=KahfCollective

# Database
DATABASE_URL="mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/kahf-collective?retryWrites=true&w=majority&appName=Cluster0"

# Server
PORT=5008

# Super Admin
SUPER_ADMIN_PASSWORD=your_secure_admin_password
BCRYPT_SALT_ROUNDS=12

# JWT Configuration
JWT_ACCESS_SECRET="your_jwt_access_secret_change_this"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_change_this"
JWT_ACCESS_EXPIRES_IN="1d"
JWT_REFRESH_EXPIRES_IN="7d"

# Email Configuration (Gmail)
MAIL=your_email@gmail.com
MAIL_PASS=your_gmail_app_password

# Email Configuration (Mailtrap - for development)
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=465
MAILTRAP_USER="your_mailtrap_username"
MAILTRAP_PASSWORD="your_mailtrap_password"

# URLs
BASE_URL_CLIENT="http://localhost:3000"
BASE_URL_SERVER="http://localhost:5008"

# DigitalOcean Spaces (S3-compatible storage)
DO_SPACE_ENDPOINT=nyc3.digitaloceanspaces.com
DO_SPACE_ACCESS_KEY=your_digitalocean_access_key
DO_SPACE_SECRET_KEY=your_digitalocean_secret_key
DO_SPACE_BUCKET=your_bucket_name

# Stripe
STRIPE_PUBLISHED_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK=whsec_your_stripe_webhook_secret
```

#### 4. Set up Prisma

Generate Prisma Client:
```bash
npm run pg
```

Run database migrations:
```bash
npm run pm
```

This will create all necessary database collections and indexes in MongoDB.

#### 5. Start the development server
```bash
npm run dev
```

The server will start on `http://localhost:5008` with auto-reload enabled.

---

## Production Deployment

### 1. Build the project
```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist` folder and generates Prisma Client.

### 2. Start the production server
```bash
npm start
```

### 3. Environment Variables for Production

Update the following variables for production:

```env
NODE_ENV=production
BASE_URL_CLIENT="https://kahfcollective.vercel.app"
BASE_URL_SERVER="https://api.yourdomain.com"

# Use production Stripe keys
STRIPE_PUBLISHED_KEY=pk_live_your_live_key
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_WEBHOOK=whsec_your_production_webhook

# Use production email service (not Mailtrap)
```

---

## Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload

# Database
npm run pm               # Run Prisma migrations
npm run pg               # Generate Prisma Client

# Build
npm run build            # Compile TypeScript and generate Prisma Client
npm start                # Start production server

# Code Quality
npm run lint:check       # Check for linting errors
npm run lint:fix         # Fix linting errors automatically
npm run prettier:check   # Check code formatting
npm run prettier:fix     # Fix code formatting
npm run lint-prettier    # Run both lint and prettier checks

# Module Generation
npm run generate-module  # Generate new module structure
npm run cm               # Create new module (alias)
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PROJECT_NAME` | Project name | `KahfCollective` |
| `DATABASE_URL` | MongoDB connection string | `mongodb+srv://...` |
| `PORT` | Server port | `5008` |
| `SUPER_ADMIN_PASSWORD` | Initial admin password | Strong password |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | `12` |
| `JWT_ACCESS_SECRET` | JWT access token secret | Random string |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Random string |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry | `1d` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |

### Email Configuration

| Variable | Description | Required For |
|----------|-------------|--------------|
| `MAIL` | Email address | Production (Gmail) |
| `MAIL_PASS` | Email password/app password | Production (Gmail) |
| `MAILTRAP_HOST` | Mailtrap host | Development |
| `MAILTRAP_PORT` | Mailtrap port | Development |
| `MAILTRAP_USER` | Mailtrap username | Development |
| `MAILTRAP_PASSWORD` | Mailtrap password | Development |

### External Services

| Variable | Description | Service |
|----------|-------------|---------|
| `BASE_URL_CLIENT` | Frontend URL | CORS configuration |
| `BASE_URL_SERVER` | Backend URL | Email links |
| `DO_SPACE_ENDPOINT` | DigitalOcean endpoint | File storage |
| `DO_SPACE_ACCESS_KEY` | DO access key | File storage |
| `DO_SPACE_SECRET_KEY` | DO secret key | File storage |
| `DO_SPACE_BUCKET` | Bucket name | File storage |
| `STRIPE_PUBLISHED_KEY` | Stripe public key | Payment processing |
| `STRIPE_SECRET_KEY` | Stripe secret key | Payment processing |
| `STRIPE_WEBHOOK` | Webhook secret | Payment webhooks |

---

## API Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message",
  "errorMessages": [
    {
      "path": "field_name",
      "message": "Validation error message"
    }
  ]
}
```

---

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### User Roles

- **SUPERADMIN** - Full system access, can manage all users and content
- **INSTRUCTOR** - Can create and manage courses, content, and assigned students
- **USER** - Regular student with access to enrolled courses

---

## Database Schema

The application uses Prisma ORM with MongoDB. The schema is defined in the `./prisma` directory.

### Key Collections
- **User** - User accounts and profiles
- **Course** - Course information
- **CourseContent** - Course modules (text, video, PDF, quiz)
- **Quiz** - Quiz questions
- **QuizAnswer** - Student quiz submissions
- **Forum** - Discussion forums
- **Post** - Forum posts and replies
- **Content** - Fraternity and blog content
- **Group** - User group management
- **Payment** - Payment transactions

---

## File Upload

File uploads are handled via multipart/form-data and stored in DigitalOcean Spaces (S3-compatible).

### Supported File Types
- **Images**: JPG, PNG, GIF, WebP
- **Videos**: MP4, WebM, MOV
- **Documents**: PDF

### DigitalOcean Spaces Setup

1. Create a DigitalOcean account and set up a Space
2. Generate API keys (Access Key and Secret Key)
3. Configure CORS settings to allow your frontend domain
4. Add the credentials to your `.env` file

---

## Email Configuration

### Development (Mailtrap)
For development, use Mailtrap to catch all emails without sending real emails:

```env
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=465
MAILTRAP_USER="your_username"
MAILTRAP_PASSWORD="your_password"
```

### Production (Gmail)
For production, use Gmail with an app-specific password:

1. Enable 2-factor authentication on your Gmail account
2. Generate an app-specific password
3. Use these credentials:

```env
MAIL=your_email@gmail.com
MAIL_PASS=your_app_specific_password
```

---

## Stripe Integration

### Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/payments/webhook`
3. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the webhook signing secret to your `.env` file

---

## Development Team

**Developed by:**
- **Junayet Alam** - Full Stack Developer
- **Robin Mia** - Developer
- **Mir Noman** - Developer
---

## Links

- **Live Frontend**: [https://kahfcollective.vercel.app/](https://kahfcollective.vercel.app/)
- **API Base URL**: Contact admin for production API URL

---