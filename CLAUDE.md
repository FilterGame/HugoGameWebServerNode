# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server (with nodemon auto-restart)
npm run dev

# Start production server
npm start

# Run tests
npm test
```

## Architecture Overview

This is a Hugo blog comment and rating system built with Node.js, Express, and MongoDB. The system provides user authentication, commenting, rating, avatar management, and an admin panel with IP blacklisting capabilities.

### Core Components

**Models (MongoDB/Mongoose):**
- `User.js`: User authentication with role-based permissions, avatar storage, and IP tracking
- `Comment.js`: Hierarchical comment system with replies and IP logging
- `PostRating.js`: Star-based rating system (1-5) for Hugo posts
- `IPBlacklist.js`: IP blocking system (exact, subnet, range matching)

**Routes:**
- `/api/auth/*`: JWT authentication (register, login, refresh)
- `/api/comments/*`: Comment CRUD, ratings, hierarchical replies
- `/api/users/*`: Profile management, avatar upload/retrieval
- `/api/admin/*`: Admin dashboard, user management, IP blacklisting

**Middleware:**
- `auth.js`: JWT verification and role-based access control
- `ipCheck.js`: IP blacklist checking and login IP recording

**Architecture Pattern:**
- RESTful API with JWT authentication
- Role-based permissions (user/admin with granular permissions: canComment, canRate, canPost)
- IP tracking: Records last 3 unique IPs per user, logs IP for each comment
- Avatar system: Images processed to 64x64, stored as Base64 in MongoDB
- Hugo integration via frontend components in `/hugo-components/`

### Key Features

**Security:**
- IP blacklisting with exact/subnet/range matching
- Rate limiting, CORS, Helmet security headers
- bcryptjs password hashing with salt rounds 12
- Input validation with express-validator

**Avatar System:**
- Images processed with Sharp library to 64x64 pixels
- JPEG compression at 80% quality (configurable via .env)
- Base64 storage in MongoDB for small file sizes
- API endpoint: `/api/users/avatar/:userId`

**Admin Features:**
- User management (activate/deactivate, permission control)
- Comment moderation (hide/show, delete)
- IP blacklist management with different matching types
- Dashboard with user/comment/rating statistics

### Environment Configuration

Required `.env` variables:
- `MONGODB_URI`: Database connection string
- `JWT_SECRET`: JWT signing secret
- `CORS_ORIGIN`: Allowed frontend origin (usually Hugo site URL)
- `ADMIN_EMAIL`/`ADMIN_PASSWORD`: Initial admin account
- `MAX_AVATAR_SIZE`: Avatar file size limit (default: 100KB)
- `AVATAR_QUALITY`: JPEG quality 1-100 (default: 80)

### Database Schema Notes

Users have granular permissions and IP tracking. Comments support hierarchical replies via `parentId` field. All user actions (login, comments) record IP addresses for admin monitoring.

### Hugo Integration

The system provides Hugo components in `/hugo-components/` that communicate with the API. Comments are tied to Hugo post URLs, and the rating system works with post identifiers.