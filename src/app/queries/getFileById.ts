import db from "@/db"
import { Ctx } from "blitz"

type Input = { id: number }

export default async function getFileById(input: Input, ctx: Ctx) {
  const file = await db.file.findUnique({
    where: { id: input.id },

    include: {
      gpsPoints: {},
      project: {
        include: {
          PointMarker: {
            include: {
              marker: true,
            },
          },
        },
      },
    },
  })

  const tags = await db.tag.findMany({
    where: {
      id: {
        in: file?.tags,
      },
    },
  })
  if (!file) throw new Error("Archivo no encontrado")

  return { ...file, tags }
}
