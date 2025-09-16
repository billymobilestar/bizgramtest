-- AlterTable
ALTER TABLE "public"."SavedItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- RenameIndex
ALTER INDEX "public"."SavedItem_listId_postId_key" RENAME TO "uniq_list_post";

-- RenameIndex
ALTER INDEX "public"."SavedItem_listId_profileId_key" RENAME TO "uniq_list_profile";
