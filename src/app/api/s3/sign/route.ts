// src/app/api/upload-url/route.ts (o en pages/api si usas pages)
// Next.js 13+ (app router) o ajusta según versión

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { createPresignedPost } from "@aws-sdk/s3-presigned-post"
import { NextResponse } from "next/server"

export const s3 = new S3Client({
  region: process.env.AWS_REGION, // región cualquiera para MinIO, puede ser fija
  endpoint: process.env.S3_ENDPOINT, // tu MinIO local
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true, // importante para MinIO
})

export async function getFileContent(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
  })

  const response = await s3.send(command)

  // response.Body es un stream de Node.js
  const streamToString = (stream: any): Promise<string> =>
    new Promise((resolve, reject) => {
      const chunks: any[] = []
      stream.on("data", (chunk: any) => chunks.push(chunk))
      stream.on("error", reject)
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
    })

  if (!response.Body) throw new Error("No body in response")

  const bodyContents = await streamToString(response.Body)
  return bodyContents
}

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
