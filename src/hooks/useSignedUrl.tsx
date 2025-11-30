import { useEffect, useState } from "react"

export function useSignedUrl(key?: string | null) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!key) return

    async function loadUrl() {
      const res = await fetch(`/api/s3/getSignedUrl?key=${encodeURIComponent(key as any)}`)
      const data = await res.json()
      setSignedUrl(data.url)
    }

    loadUrl()
  }, [key])

  return signedUrl
}
