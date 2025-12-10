-- DropForeignKey
ALTER TABLE "PointMarker" DROP CONSTRAINT "PointMarker_markerId_fkey";

-- AlterTable
ALTER TABLE "PointMarker" ALTER COLUMN "lat" DROP NOT NULL,
ALTER COLUMN "lon" DROP NOT NULL,
ALTER COLUMN "markerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PointMarker" ADD CONSTRAINT "PointMarker_markerId_fkey" FOREIGN KEY ("markerId") REFERENCES "Marker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
