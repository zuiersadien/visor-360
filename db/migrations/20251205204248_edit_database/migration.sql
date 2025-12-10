/*
  Warnings:

  - You are about to drop the `GpsPointComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectLegend` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GpsPointComment" DROP CONSTRAINT "GpsPointComment_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "GpsPointComment" DROP CONSTRAINT "GpsPointComment_gpsPointId_fkey";

-- DropForeignKey
ALTER TABLE "GpsPointComment" DROP CONSTRAINT "GpsPointComment_parentId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectLegend" DROP CONSTRAINT "ProjectLegend_markerId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectLegend" DROP CONSTRAINT "ProjectLegend_projectId_fkey";

-- DropTable
DROP TABLE "GpsPointComment";

-- DropTable
DROP TABLE "ProjectLegend";

-- CreateTable
CREATE TABLE "PointMarker" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "comment" TEXT NOT NULL,
    "urlFile" TEXT,
    "Tags" INTEGER[],
    "markerId" INTEGER NOT NULL,
    "projectId" INTEGER,
    "parentId" INTEGER,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "PointMarker_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PointMarker" ADD CONSTRAINT "PointMarker_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointMarker" ADD CONSTRAINT "PointMarker_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointMarker" ADD CONSTRAINT "PointMarker_markerId_fkey" FOREIGN KEY ("markerId") REFERENCES "Marker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointMarker" ADD CONSTRAINT "PointMarker_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PointMarker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
