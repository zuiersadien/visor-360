import db from "@/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { commentId, comment, urlFile, createdBy } = body

    if (!commentId || !comment || !createdBy) {
      return NextResponse.json({ message: "Faltan datos obligatorios" }, { status: 400 })
    }

    // Obtener gpsPointId del comentario padre
    const parentComment = await db.gpsPointComment.findUnique({
      where: { id: commentId },
      select: { gpsPointId: true },
    })

    if (!parentComment) {
      return NextResponse.json({ message: "Comentario padre no encontrado" }, { status: 404 })
    }

    // Crear la respuesta incluyendo gpsPointId del padre
    const newReply = await db.gpsPointComment.create({
      data: {
        comment,
        urlFile: urlFile ?? null,
        createdBy,
        parentId: commentId,
        gpsPointId: parentComment.gpsPointId, // aquí asocias el gpsPointId del padre
      },
    })

    return NextResponse.json(newReply, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}
