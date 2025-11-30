import db from "db"

export default async function getProjects() {
  const markers = await db.project.findMany()
  return markers
}
