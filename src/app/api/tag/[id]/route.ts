import { NextRequest, NextResponse } from "next/server"
import db from "db"

// GET → obtener un tag por ID
export async function GET(_: NextRequest, { params }: any) {
  try {
    const id = Number(params.id)

    const tag = await db.tag.findUnique({
      where: { id },
    })

    return NextResponse.json(tag)
  } catch (error) {
    console.error(`GET /api/tags/${params.id} error:`, error)
    return NextResponse.json({ error: "Error al obtener tag" }, { status: 500 })
  }
}

// PUT → actualizar tag
export async function PUT(req: NextRequest, { params }: any) {
  try {
    const id = Number(params.id)
    const { name, color } = await req.json()

    const tag = await db.tag.update({
      where: { id },
      data: {
        name,
        color: color ?? null,
      },
    })

    return NextResponse.json(tag)
  } catch (error) {
    console.error(`PUT /api/tags/${params.id} error:`, error)
    return NextResponse.json({ error: "Error al actualizar tag" }, { status: 500 })
  }
}

// DELETE → eliminar tag
export async function DELETE(_: NextRequest, { params }: any) {
  try {
    const id = Number(params.id)

    await db.tag.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Tag eliminado" })
  } catch (error) {
    console.error(`DELETE /api/tags/${params.id} error:`, error)
    return NextResponse.json({ error: "Error al eliminar tag" }, { status: 500 })
  }
}
