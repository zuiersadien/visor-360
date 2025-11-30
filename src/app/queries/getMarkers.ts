import db from "db"

export default async function getMarkers() {
  const markers = await db.marker.findMany()
  return markers
}
