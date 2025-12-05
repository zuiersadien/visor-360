// app/(main)/layout.tsx
import { redirect } from "next/navigation"

import { getBlitzContext } from "../blitz-server"
import Sidebar from "../components/Sidebar"

import { invoke } from "../blitz-server"
import getCurrentUser from "../users/queries/getCurrentUser"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const { session } = await getBlitzContext()

  if (!session.userId) {
    redirect("/login")
  }

  const currentUser = await invoke(getCurrentUser, session.userId)

  return (
    <div className="flex">
      <Sidebar currentUser={currentUser} />
      <main className="flex-1 overflow-y-auto  bg-gray-50">{children}</main>
    </div>
  )
}
