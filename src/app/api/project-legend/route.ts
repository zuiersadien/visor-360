import db from "@/db"
import { NextResponse } from "next/server"

// GET ALL
export async function GET() {
  const legends = await db.projectLegend.findMany({
    include: {
      marker: true, // incluir relación marker
      project: true,
    },
  })
  return NextResponse.json(legends)
}

// CREATE
export async function POST(req: Request) {
  const body = await req.json()

  const legend = await db.projectLegend.create({
    data: {
      description: body.description,
      lat: body.lat,
      lon: body.lon,
      projectId: body.projectId,
      markerId: body.markerId,
    },
  })

  return NextResponse.json(legend)
}
