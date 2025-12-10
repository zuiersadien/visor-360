import { resolver } from "@blitzjs/rpc"
import { AuthenticationError } from "blitz"
import db from "db"
import { Login } from "../validations"
import bcrypt from "bcryptjs"
import { Role } from "types"

export const authenticateUser = async (rawEmail: string, rawPassword: string) => {
  const { email, password } = Login.parse({ email: rawEmail, password: rawPassword })

  const user = await db.user.findFirst({ where: { email } })
  if (!user) throw new AuthenticationError()

  // Verificar contraseña con bcryptjs
  const isValid = await bcrypt.compare(password, user?.hashedPassword || "")

  if (!isValid) {
    throw new AuthenticationError()
  }

  const improvedHash = await bcrypt.hash(password, 10)
  await db.user.update({
    where: { id: user.id },
    data: { hashedPassword: improvedHash },
  })

  const { hashedPassword, ...rest } = user
  return rest
}

export default resolver.pipe(resolver.zod(Login), async ({ email, password }, ctx) => {
  const user = await authenticateUser(email, password)
  await ctx.session.$create({ userId: user.id, role: user.role as Role })
  return user
})
