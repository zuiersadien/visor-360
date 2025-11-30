import db from "db"

export default async function getFiles() {
  // Traemos todos los archivos ordenados por creación descendente
  const files = await db.file.findMany({
    include: {
      project: true,
    },
  })
  return files
}
