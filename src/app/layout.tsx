import "./styles/globals.css"
import "primeicons/primeicons.css"
import "primereact/resources/themes/saga-blue/theme.css"
import "primereact/resources/primereact.min.css"

import { BlitzProvider } from "./blitz-client"
import { PrimeReactProvider } from "primereact/api"
import { Inter } from "next/font/google"
import Tailwind from "primereact/passthrough/tailwind"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PrimeReactProvider value={{ unstyled: true, pt: Tailwind }}>
          <BlitzProvider>{children}</BlitzProvider>
        </PrimeReactProvider>
      </body>
    </html>
  )
}
