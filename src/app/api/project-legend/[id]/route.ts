import db from "@/db"
import { NextResponse } from "next/server"

// UPDATE
export async function PUT(req: Request, { params }: any) {
  const body = await req.json()

  const legend = await db.projectLegend.update({
    where: { id: Number(params.id) },
    data: {
      description: body.description,
      lat: body.lat,
      lon: body.lon,
      markerId: body.markerId,
    },
  })

  return NextResponse.json(legend)
}

// DELETE
export async function DELETE(req: Request, { params }: any) {
  await db.projectLegend.delete({
    where: { id: Number(params.id) },
  })

  return NextResponse.json({ ok: true })
}
