// app/tags/queries/getTags.ts

import db from "db"

export default async function getTags() {
  return (await db.tag.findMany()) || []
}
