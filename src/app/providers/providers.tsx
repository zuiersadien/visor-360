"use client"

import { ReactNode } from "react"
import { BlitzProvider } from "../blitz-client"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return <BlitzProvider>{children}</BlitzProvider>
}
