import db from "db"

export default async function getCurrentUser(userId: number | null) {
  if (!userId) return null

  const user = await db.user.findFirst({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  })

  return user
}
