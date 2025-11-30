import { PrimeReactProvider } from "primereact/api"
import Tailwind from "primereact/passthrough/tailwind"

export function PrimeProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrimeReactProvider value={{ unstyled: true, pt: Tailwind }}>{children}</PrimeReactProvider>
  )
}
