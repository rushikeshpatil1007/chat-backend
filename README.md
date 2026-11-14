# Chat Backend

REST API for one-to-one and group chats. PostgreSQL stores users, chats, and memberships. Firebase Firestore stores messages, read receipts, and last-seen markers.

## Tech stack

- Node.js and TypeScript with strict type checking
- Express
- PostgreSQL with Prisma
- Firebase Firestore with Firebase Admin SDK

## Requirements

- Node.js `22.12` or later
- PostgreSQL database
- Firebase project and service account credentials

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from `.env.example`. Set `DATABASE_URL`, `JWT_SECRET`, and the Firebase credentials:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/chat_backend"
   JWT_SECRET="replace-with-a-secret-at-least-32-bytes-long"

   FIREBASE_PROJECT_ID="your-project-id"
   FIREBASE_CLIENT_EMAIL="your-service-account@your-project-id.iam.gserviceaccount.com"
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nreplace-with-your-private-key\n-----END PRIVATE KEY-----\n"
   ```

3. Apply the database migrations and generate Prisma Client:

   ```bash
   npm run db:migrate
   npm run db:generate
   ```

4. Start the server:

   ```bash
   npm run dev
   ```

The server listens on port `3000` by default. Set `PORT` in `.env` to change it.

The initial migrations create the database tables, but do not add users. Add users with UUID IDs to PostgreSQL before testing chat creation.

## Authentication

All chat and user-chat endpoints require a bearer JWT:

```http
Authorization: Bearer <JWT>
```

The token must have a UUID in its `sub` claim and an expiry. `JWT_SECRET` must be at least 32 bytes. The authenticated user must be a member of a chat to read or send its messages.

## API endpoints

### Create or get a one-to-one chat

```http
POST /chat/create
Content-Type: application/json

{
  "userAId": "<user-a-uuid>",
  "userBId": "<user-b-uuid>"
}
```

The authenticated user must be one of the two users.

### Create a group chat

```http
POST /chat/group/create
Content-Type: application/json

{
  "name": "Project team",
  "memberIds": ["<user-b-uuid>", "<user-c-uuid>"]
}
```

The authenticated user is added automatically as the initial admin. `memberIds` must contain at least two other existing users. Groups can have up to 100 members.

### Add members to a group

```http
POST /chat/<chatId>/members
Content-Type: application/json

{
  "userIds": ["<user-d-uuid>"]
}
```

Only a group admin can add members. Users must already exist in PostgreSQL and cannot already be members.

### Remove a member from a group

```http
DELETE /chat/<chatId>/members/<userId>
```

Only a group admin can remove members. A group must retain at least one admin.

### Send a message

```http
POST /chat/<chatId>/message/send
Content-Type: application/json

{
  "senderId": "<authenticated-user-uuid>",
  "text": "Hello"
}
```

Messages are stored in Firestore with timestamps. An optional `Idempotency-Key` header can be supplied to safely retry a send request.

### Get messages

```http
GET /chat/<chatId>/messages?limit=50
```

Messages are returned oldest first. `limit` defaults to `50` and supports values up to `100`. Paginated responses include a `nextCursor`; pass it as `cursor` to get the next page.

### Edit a message

```http
PATCH /chat/<chatId>/message/<messageId>
Content-Type: application/json

{
  "text": "Updated message"
}
```

Only the message sender can edit it. The response includes `editedAt`.

### Delete a message

```http
DELETE /chat/<chatId>/message/<messageId>
```

Only the message sender can delete it. Deletion is soft: the Firestore message remains as a tombstone with `deletedAt` set and its text cleared.

### Mark a message as read

```http
POST /chat/<chatId>/message/<messageId>/read
Content-Type: application/json

{
  "userId": "<authenticated-user-uuid>"
}
```

### Update last-seen message

```http
POST /chat/<chatId>/lastseen
Content-Type: application/json

{
  "userId": "<authenticated-user-uuid>",
  "messageId": "<message-id>"
}
```

Last-seen markers only advance to a later message.

### List a user’s chats

```http
GET /user/<userId>/chats
```

Returns chat IDs and member IDs for the authenticated user’s chats.

## Notes

- Firebase must be configured before using message, read-receipt, or last-seen endpoints.
- Prisma Client is generated in `src/generated/prisma`, which is ignored by Git. Run `npm run db:generate` after installing dependencies.
- The repo expects users to be provisioned in PostgreSQL; it does not include a user creation endpoint.
- Group membership is managed by group admins. Group roles are stored in PostgreSQL.
