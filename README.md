# Majlis Backend — Best Practices

> **Majlis** is a social media platform for the Islamic community — supporting posts, interactions, real-time notifications, AI moderation, and more.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [File Naming Conventions](#file-naming-conventions)
3. [Folder Structure](#folder-structure)
4. [Code Naming Standards](#code-naming-standards)
5. [JSend Response Format](#jsend-response-format)
6. [Controllers](#controllers)
7. [Models (Mongoose)](#models-mongoose)
8. [Routes](#routes)
9. [Middleware](#middleware)
10. [Middleware Usage Rules (Project)](#middleware-usage-rules-project)
11. [Utilities Usage Rules (Project)](#utilities-usage-rules-project)
12. [Input Validation (Zod)](#input-validation-zod)
13. [Security Essentials](#security-essentials)
14. [Database Best Practices](#database-best-practices)
15. [Real-time (Socket.IO)](#real-time-socketio)
16. [AI Integration (OpenAI)](#ai-integration-openai)
17. [File Uploads (Multer)](#file-uploads-multer)
18. [Environment Variables](#environment-variables)
19. [Git Workflow](#git-workflow)
20. [Pre-Submission Checklist](#pre-submission-checklist)

---

## Tech Stack

| Technology | Purpose                  |
| ---------- | ------------------------ |
| Node.js    | JavaScript Runtime       |
| Express.js | Backend Framework        |
| TypeScript | Static Typing            |
| MongoDB    | Database                 |
| Mongoose   | Object Data Modeling     |
| JWT        | Authentication           |
| Socket.IO  | Real-time Communication  |
| Zod        | Request Validation       |
| Multer     | File Uploads             |
| OpenAI     | AI Moderation & Captions |
| Morgan     | Request Logging          |
| bcrypt     | Password Hashing         |
| ESLint     | Code Linting             |
| Prettier   | Code Formatting          |

---

## File Naming Conventions

| File Type       | Convention                      | Example                        |
| --------------- | ------------------------------- | ------------------------------ |
| Controllers     | camelCase + `Controller` suffix | `postController.ts`            |
| Models          | PascalCase                      | `User.ts`, `Post.ts`           |
| Routes          | camelCase + `Routes` suffix     | `postRoutes.ts`                |
| Middleware      | camelCase + `Middleware` suffix | `authMiddleware.ts`            |
| Validators      | camelCase + `Validator` suffix  | `postValidator.ts`             |
| Utilities       | camelCase + descriptive name    | `jsend.ts`, `asyncWrapper.ts`  |
| Configuration   | lowercase kebab-case            | `database.ts`, `jwt-config.ts` |
| Socket handlers | camelCase + `Handler` suffix    | `notificationHandler.ts`       |

**Rule:** Use descriptive, meaningful names. No abbreviations or unclear acronyms.

---

## Folder Structure

Feature-based structure — each feature owns its own controller, routes, validator, and model.

```
majlis-backend/
├── src/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── authController.ts
│   │   │   ├── authRoutes.ts
│   │   │   └── authValidator.ts
│   │   ├── users/
│   │   │   ├── userController.ts
│   │   │   ├── userRoutes.ts
│   │   │   └── userValidator.ts
│   │   ├── posts/
│   │   │   ├── postController.ts
│   │   │   ├── postRoutes.ts
│   │   │   └── postValidator.ts
│   │   ├── comments/
│   │   │   ├── commentController.ts
│   │   │   ├── commentRoutes.ts
│   │   │   └── commentValidator.ts
│   │   ├── likes/
│   │   │   ├── likeController.ts
│   │   │   ├── likeRoutes.ts
│   │   │   └── likeValidator.ts
│   │   ├── notifications/
│   │   │   ├── notificationController.ts
│   │   │   ├── notificationHandler.ts
│   │   │   └── notificationRoutes.ts
│   │   ├── friends/
│   │   │   ├── friendController.ts
│   │   │   ├── friendRoutes.ts
│   │   │   └── friendValidator.ts
│   │   ├── search/
│   │   │   ├── searchController.ts
│   │   │   └── searchRoutes.ts
│   │   └── categories/
│   │       ├── categoryController.ts
│   │       └── categoryRoutes.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Post.ts
│   │   ├── Comment.ts
│   │   ├── Like.ts
│   │   ├── Notification.ts
│   │   ├── Friend.ts
│   │   └── Category.ts
│   ├── middlewares/
│   │   ├── authMiddleware.ts
│   │   ├── allowToMiddleware.ts
│   │   ├── validateMiddleware.ts
│   │   ├── uploadMiddleware.ts
│   │   └── errorMiddleware.ts
│   ├── utils/
│   │   ├── jsend.ts
│   │   ├── appError.ts
│   │   ├── asyncWrapper.ts
│   │   ├── notFound.ts
│   │   └── errorHandler.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── jwt-config.ts
│   │   ├── openai-config.ts
│   │   └── cloudinary-config.ts
│   ├── socket/
│   │   └── socketManager.ts
│   ├── types/
│   │   └── express.d.ts
│   ├── app.ts
│   └── server.ts
├── .env.example
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── README.md
└── tsconfig.json
```

---

## Code Naming Standards

- **Variables:** `camelCase` → `userName`, `userEmail`
- **Constants:** `UPPER_SNAKE_CASE` → `MAX_LOGIN_ATTEMPTS`, `JWT_EXPIRY`
- **Functions:** `camelCase` + descriptive verb → `getUserById()`, `createPost()`
- **Classes/Models:** `PascalCase` → `User`, `Post`, `Comment`
- **Types/Interfaces:** `PascalCase` with descriptive name → `UserPayload`, `PostDocument`
- **Enums:** `PascalCase` → `UserRole`, `NotificationType`

**Rule:** Use `const` by default, `let` for reassignable variables. Never use `var`.

---

## JSend Response Format

All endpoints **MUST** use JSend format for consistency:

```
Success (200, 201):          { "status": "success", "data": {...} }
Validation Fail (400, 422):  { "status": "fail", "data": {...}, "message": "..." }
Server Error (500):          { "status": "error", "message": "...", "code": "..." }
```

Use the shared helper from `utils/jsend.ts`:

- `jsend.success(data)`
- `jsend.fail(data)`
- `jsend.error(message, data)`

Example:

```ts
import jsend from "../utils/jsend.js";

return res.status(200).json(jsend.success({ post }));
```

---

## Controllers

- Extract validation to middleware, keep controllers thin
- Always wrap with `asyncWrapper` — no raw try-catch in controllers
- Use JSend response helpers for all responses
- Return appropriate HTTP status codes
- Use async/await for all database queries
- Add JSDoc comments for each endpoint

Example:

```ts
import { asyncWrapper } from "../utils/asyncWrapper.js";
import jsend from "../utils/jsend.js";
import Post from "../models/Post.js";

export const getPosts = asyncWrapper(async (req, res) => {
  const posts = await Post.find().lean();
  return res.status(200).json(jsend.success({ posts }));
});
```

---

## Models (Mongoose)

- Use **PascalCase** for file names
- Always include `timestamps: true` for `createdAt` / `updatedAt`
- Use `select: false` on sensitive fields (e.g. passwords)
- Add indexes to frequently queried fields
- Use `enum` for restricted values
- Use `trim: true` on string fields
- Always set `required: true` for mandatory fields
- Add validation rules in schema definition

---

## Routes

- Use **RESTful conventions:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Apply middleware at the route level
- Version all API paths: `/api/v1/...`
- Keep routes declarative — delegate all logic to controllers
- Group related routes in their feature folder

Example:

```ts
router.post(
  "/posts",
  validate(createPostSchema),
  authorize,
  allowTo("admin", "user"),
  asyncWrapper(createPost)
);
```

---

## Middleware

- **Authentication:** Verify JWT token, attach decoded user to `req.user`
- **Validation:** Use Zod schemas for input validation
- **Error Handling:** Catch errors and format responses with JSend
- Always call `next()` to pass control forward
- Place middleware in logical order
- Use camelCase + `Middleware` suffix for file names

---

## Middleware Usage Rules (Project)

### 1) Route-level order

Always chain route middlewares in this order:

1. `validate(schema)` — request validation via Zod
2. `authorize` — JWT authentication
3. `allowTo(...)` — role authorization
4. controller handler — wrapped with `asyncWrapper`

### 2) Global middleware order in `app.ts`

1. Parser and cross-origin middleware (`express.json`, `cors`)
2. Logger (`morgan`)
3. Route mounting (`app.use("/api/v1/...", routes)`)
4. `notFound`
5. `errorHandler` — must be the last middleware

### 3) Middleware responsibilities

| File                    | Responsibility                                            |
| ----------------------- | --------------------------------------------------------- |
| `authMiddleware.ts`     | Verify bearer token and attach decoded user to `req.user` |
| `allowToMiddleware.ts`  | Block users whose role is not in allowed roles            |
| `validateMiddleware.ts` | Run Zod schema and forward validation errors              |
| `uploadMiddleware.ts`   | Handle file uploads via Multer                            |
| `errorMiddleware.ts`    | Centralized error formatting with JSend                   |

---

## Utilities Usage Rules (Project)

### 1) `utils/appError.ts`

Use `AppError` for all expected business / auth / not-found errors.

```ts
return next(new AppError("Post not found", 404));
```

### 2) `utils/asyncWrapper.ts`

Wrap all async controllers to avoid repeated try-catch blocks.

```ts
router.get("/posts", asyncWrapper(getPosts));
```

### 3) `utils/jsend.ts`

Return all API responses with the JSend shape.

```ts
return res.status(201).json(jsend.success({ post }));
```

### 4) `utils/errorHandler.ts`

Global error handler — registered as the last middleware in `app.ts`.
Handles: Mongoose CastError, ValidationError, Duplicate Key, JWT errors, AppError, and unknown errors.
Controllers should throw/forward errors — never send custom error JSON directly.

### 5) `utils/notFound.ts`

Registered once after all routes. Produces a clean 404 `AppError` for unknown endpoints.

---

## Input Validation (Zod)

- Validate **all** user inputs using Zod schemas
- Each feature owns its validator file: `postValidator.ts`
- Sanitize and normalize inputs (trim, lowercase emails)
- Use `z.object().strict()` to reject unknown fields
- Return JSend fail response (422 status) for validation errors

---

## Security Essentials

- **Environment Variables:** Store all secrets in `.env` — never commit it
- **Passwords:** Use `bcrypt` for hashing — never store plain text
- **Authentication:** Use JWT tokens with expiry dates
- **CORS:** Configure for allowed origins only
- **Rate Limiting:** Implement on sensitive routes (auth, AI endpoints)
- **Input Validation:** Validate and sanitize all inputs with Zod
- **Error Messages:** Never expose stack traces or sensitive data in responses
- **File Uploads:** Validate file type and size in `uploadMiddleware.ts`
- **Never log** secrets, passwords, or tokens

---

## Database Best Practices

- Use `.lean()` for read-only queries (better performance)
- Set indexes in schemas for frequently queried fields
- Use `select: false` for sensitive fields (passwords)
- Use `findByIdAndUpdate()` with `{ new: true, runValidators: true }`
- Always handle `null` responses when a document is not found
- Use transactions for multi-document operations
- Use pagination for feed and search endpoints — never return all documents at once

---

## Real-time (Socket.IO)

- All Socket.IO logic lives in `src/socket/socketManager.ts`
- Authenticate socket connections using JWT on the `connection` event
- Each user joins a room named by their `userId` for targeted events
- Do not put business logic inside socket handlers
- Use `emitNotification()` from `notificationHandler.ts` in controllers

| Event              | Direction       | Description               |
| ------------------ | --------------- | ------------------------- |
| `notification:new` | Server → Client | New notification received |
| `friend:request`   | Server → Client | Incoming friend request   |
| `post:liked`       | Server → Client | A post was liked          |

---

## AI Integration (OpenAI)

- All OpenAI config lives in `config/openai-config.ts`
- Use the **Moderation API** before saving any post
- Use the **Chat Completions API** for AI caption suggestions
- Always handle OpenAI failures gracefully — never block the user request on AI errors
- Never expose the OpenAI API key to the client

---

## File Uploads (Multer)

- All Multer config lives in `middlewares/uploadMiddleware.ts`
- Accepts images only: `jpeg`, `png`, `webp` — max 5 MB
- Use memory storage and upload to Cloudinary from the controller
- Never store uploaded files on the server disk in production

---

## Environment Variables

Create a `.env` file at the project root (copy from `.env.example`). **Never commit this file.**

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/majlis

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
JWT_ISSUER=backend-service
JWT_AUDIENCE=frontend-service

# OpenAI
OPENAI_API_KEY=sk-...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Client (for CORS)
CLIENT_URL=http://localhost:3000
```

---

## Git Workflow

### Branch Naming

```
<type>/<feature>
```

**Examples:**

```
feat/auth
feat/posts
feat/notifications
fix/like-api
chore/setup-eslint
```

### Commit Messages

```
<type>(<feature>): <description>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Examples:**

```
feat(auth): implement JWT authentication and middleware
feat(posts): add create post API with AI moderation
fix(notifications): resolve socket event not emitting
```

### Branch Strategy

| Branch           | Purpose                                            |
| ---------------- | -------------------------------------------------- |
| `main`           | Production-ready code only                         |
| `dev`            | Integration branch — merge all features here first |
| `feat/<feature>` | Individual feature branches cut from `dev`         |

**Rule:** Never push directly to `main` or `dev`. Always open a Pull Request.

---

## Pre-Submission Checklist

- [ ] File names follow naming conventions
- [ ] Feature lives in its correct feature folder
- [ ] Code uses JSend response format
- [ ] All inputs are validated with Zod
- [ ] Error handling uses `AppError` + `asyncWrapper`
- [ ] No hardcoded secrets or credentials
- [ ] Commit message follows Conventional Commits format
- [ ] No `console.log()` statements left in code
- [ ] Code is readable with appropriate JSDoc comments
- [ ] ESLint and Prettier pass with no errors
- [ ] AI moderation check applied before saving posts
- [ ] Socket events follow the naming convention (`resource:action`)
- [ ] File uploads are validated for type and size
