import db from "db"
import bcrypt from "bcryptjs"
import { Role } from "@/types"

export default async function signup(input: { password: string; email: string }, ctx: any) {
  const { password, email } = input

  if (!email) throw new Error("Email is required")
  if (!password) throw new Error("Password is required")

  // 1. Hash password con bcrypt
  const hashedPassword = await bcrypt.hash(password, 10)

  // 2. Crear usuario
  const user = await db.user.create({
    data: {
      email,
      hashedPassword,
      role: "USER",
    },
  })

  // 3. Crear sesión
  await ctx.session.$create({
    userId: user.id,
    role: (user.role as Role) ?? "USER",
  })

  // 4. Devolver sin hashedPassword
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  }
}
