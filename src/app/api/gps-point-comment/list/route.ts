// GET /api/gps-point-comment/list?gpsPointId=123
import db from "@/db"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fileId = Number(searchParams.get("fileId"))

  const comments = await db.gpsPointComment.findMany({
    where: {
      gpsPoint: {
        fileId,
      },
    },
    include: {
      user: true,
      gpsPoint: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(comments)
}
