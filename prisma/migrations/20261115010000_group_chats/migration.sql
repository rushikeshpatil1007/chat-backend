CREATE TYPE "ChatMemberRole" AS ENUM ('MEMBER', 'ADMIN');

ALTER TABLE "chats"
    ALTER COLUMN "pair_key" DROP NOT NULL,
    ADD COLUMN "name" TEXT;

ALTER TABLE "chat_members"
    ADD COLUMN "role" "ChatMemberRole" NOT NULL DEFAULT 'MEMBER';
