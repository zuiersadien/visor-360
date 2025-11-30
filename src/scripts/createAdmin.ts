import { SecurePassword } from "@blitzjs/auth/secure-password.js"

import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()

async function createAdminIfNoneExists() {
  const count = await db.user.count()
  if (count === 0) {
    const hashedPassword = await SecurePassword.hash("admin")
    await db.user.create({
      data: {
        email: "admin@example.com",
        hashedPassword,
        role: "ADMIN",
      },
    })
    console.log("Usuario admin creado porque no existía ninguno")
  } else {
    console.log("Ya existen usuarios, no se crea admin")
  }
}

createAdminIfNoneExists()
  .catch(console.error)
  .finally(() => db.$disconnect())
