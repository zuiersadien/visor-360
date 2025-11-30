import "./styles/globals.css"
import "primereact/resources/themes/lara-light-cyan/theme.css"
import "primereact/resources/primereact.min.css"
import "primeicons/primeicons.css"

import { BlitzProvider } from "./blitz-client"
import { PrimeReactProvider } from "primereact/api"
import { PrimeProvider } from "./providers/PrimeProvider"
import { Button } from "primereact/button"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PrimeReactProvider>
          <BlitzProvider>
            <PrimeProvider>{children}</PrimeProvider>
          </BlitzProvider>
        </PrimeReactProvider>
      </body>
    </html>
  )
}
