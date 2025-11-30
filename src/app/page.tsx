// app/page.tsx
import { redirect } from "next/navigation"
import { getBlitzContext } from "./blitz-server"

export default async function Home() {
  const { session } = await getBlitzContext()
  if (session.userId) redirect("/home")
  else redirect("/login")
}
