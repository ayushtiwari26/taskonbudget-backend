/*
  Warnings:

  - A unique constraint covering the columns `[displayId]` on the table `Task` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `data` to the `TaskFile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "displayId" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "TaskFile" ADD COLUMN     "data" BYTEA NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Task_displayId_key" ON "Task"("displayId");
