import { NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { s3 } from "../sign/route"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const key = url.searchParams.get("key")

  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 })
  }

  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
  })

  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })

  return NextResponse.json({ url: signedUrl })
}
