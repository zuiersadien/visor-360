import { s3 } from "@/src/lib/aws-s3"
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { createPresignedPost } from "@aws-sdk/s3-presigned-post"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const fileName = url.searchParams.get("fileName")

  if (!fileName) {
    return NextResponse.json({ error: "Missing fileName" }, { status: 400 })
  }

  try {
    const { url: uploadUrl, fields } = await createPresignedPost(s3, {
      Bucket: process.env.S3_BUCKET_NAME!, // nombre bucket en MinIO local
      Key: `${Date.now()}-${fileName}`,
      Expires: 60,
      Fields: { acl: "public-read" },
    })

    return NextResponse.json({ uploadUrl, fields })
  } catch (error) {
    console.error("S3 signing error:", error)
    return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 })
  }
}
