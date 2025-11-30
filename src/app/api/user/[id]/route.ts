// app/api/users/[id]/route.ts
import { NextResponse } from "next/server"
import db from "@/db"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await db.user.findUnique({
      where: { id: Number(params.id) },
    })

    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

    return NextResponse.json(user)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Error al obtener usuario" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json()

    const updated = await db.user.update({
      where: { id: Number(params.id) },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await db.user.delete({
      where: { id: Number(params.id) },
    })

    return NextResponse.json({ message: "Usuario eliminado" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 })
  }
}
