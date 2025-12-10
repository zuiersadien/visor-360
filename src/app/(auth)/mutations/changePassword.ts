import { NotFoundError } from "blitz"
import db from "db"
import { authenticateUser } from "./login"
import { ChangePassword } from "../validations"
import { resolver } from "@blitzjs/rpc"
import bcrypt from "bcryptjs"

export default resolver.pipe(
  resolver.zod(ChangePassword),
  resolver.authorize(),
  async ({ currentPassword, newPassword }, ctx) => {
    const user = await db.user.findFirst({ where: { id: ctx.session.userId } })
    if (!user) throw new NotFoundError()

    // Verificar contraseña actual con tu función existente
    await authenticateUser(user.email, currentPassword)

    // Hashear la nueva contraseña sin SecurePassword
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10)

    await db.user.update({
      where: { id: user.id },
      data: { hashedPassword },
    })

    return true
  }
)
