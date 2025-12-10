import { hash256 } from "@blitzjs/auth"
import { resolver } from "@blitzjs/rpc"
import bcrypt from "bcryptjs"
import db from "db"
import { ResetPassword } from "../validations"
import login from "./login"

export class ResetPasswordError extends Error {
  name = "ResetPasswordError"
  message = "Reset password link is invalid or it has expired."
}

export default resolver.pipe(resolver.zod(ResetPassword), async ({ password, token }, ctx) => {
  if (!token) throw new ResetPasswordError("Token is required")

  // 1. Buscar token
  const hashedToken = hash256(token)
  const savedToken = await db.token.findFirst({
    where: { hashedToken, type: "RESET_PASSWORD" },
    include: { user: true },
  })

  // 2. Token inválido
  if (!savedToken) throw new ResetPasswordError()

  // 3. Token expirado
  if (savedToken.expiresAt < new Date()) {
    await db.token.delete({ where: { id: savedToken.id } }) // cleanup
    throw new ResetPasswordError()
  }

  const userId = savedToken.userId

  // 4. eliminar token inmediatamente (evitar reuso)
  await db.token.delete({ where: { id: savedToken.id } })

  // 5. Hashear nueva contraseña con bcrypt
  const hashedPassword = await bcrypt.hash(password.trim(), 10)

  // 6. Actualizar usuario
  const user = await db.user.update({
    where: { id: userId },
    data: { hashedPassword },
  })

  // 7. Cerrar TODAS las sesiones existentes
  await db.session.deleteMany({
    where: { userId: user.id },
  })

  // 8. Autologin con la nueva contraseña
  await login({ email: user.email, password }, ctx)

  return true
})
