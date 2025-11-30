// app/(main)/layout.tsx
import { redirect } from "next/navigation"
import Sidebar from "../components/Sidebar"

import getCurrentUser from "../users/queries/getCurrentUser"
import { getBlitzContext, invoke } from "../blitz-server"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const { session } = await getBlitzContext()
  if (!session.userId) {
    redirect("/login")
  }

  const currentUser = await invoke(getCurrentUser, null)

  return (
    <div className="flex h-screen flex-row">
      <Sidebar currentUser={currentUser} />
      <main className="w-full h-full overflow-y-auto bg-gray-50">{children}</main>
    </div>
  )
}
