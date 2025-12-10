import { resolver } from "@blitzjs/rpc"
import db from "db"
import bcrypt from "bcryptjs"
import { hash256 } from "@blitzjs/auth"
import { ResetPassword } from "../validations"
import { AuthenticationError, NotFoundError } from "blitz"
import { Role } from "@/types"

export default resolver.pipe(
  resolver.zod(ResetPassword),
  async ({ token, password, passwordConfirmation }, ctx) => {
    // 1. Confirmar contraseñas
    if (password !== passwordConfirmation) {
      throw new Error("Passwords do not match")
    }

    const hashedToken = hash256(token)

    // 2. Buscar token válido
    const savedToken = await db.token.findFirst({
      where: {
        type: "RESET_PASSWORD",
        hashedToken,
      },
      include: { user: true },
    })

    if (!savedToken) throw new NotFoundError("Token not found")
    if (savedToken.expiresAt < new Date()) {
      throw new AuthenticationError("Token expired")
    }

    const user = savedToken.user
    if (!user) throw new NotFoundError("User not found")

    // 3. Hashear la nueva contraseña con bcrypt
    const newHashedPassword = await bcrypt.hash(password, 10)

    await db.user.update({
      where: { id: user.id },
      data: { hashedPassword: newHashedPassword },
    })

    // 4. Borrar TODOS los reset tokens del usuario
    await db.token.deleteMany({
      where: { userId: user.id, type: "RESET_PASSWORD" },
    })

    // 5. Crear sesión nueva
    await ctx.session.$create({
      userId: user.id,
      role: (user.role as Role) ?? "USER",
    })

    return true
  }
)
