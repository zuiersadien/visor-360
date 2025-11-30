// /app/api/gps-point-comment/route.ts
import { NextResponse } from "next/server"
import db from "@/db"

export async function POST(req: Request) {
  const body = await req.json()

  const {
    comment,
    gpsPointId,
    createdBy,
    parentId = null,
    urlFile = null, // clave de S3
  } = body

  const newComment = await db.gpsPointComment.create({
    data: {
      comment,
      gpsPointId,
      createdBy,
      parentId,
      urlFile,
    },
  })

  return NextResponse.json(newComment)
}
