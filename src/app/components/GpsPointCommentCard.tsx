"use client"

import { useEffect, useState, ChangeEvent, useCallback, useMemo, useRef } from "react"
import { InputTextarea } from "primereact/inputtextarea"
import { Button } from "primereact/button"
import { Toast } from "primereact/toast"
import { uploadFileDirectlyToS3 } from "../lib/uploadToS3"
import { GpsPoint } from "@prisma/client"
import React from "react"
import { useSignedUrl } from "@/src/hooks/useSignedUrl"

interface User {
  id: number
  name?: string
}

interface Comment {
  id: number
  comment: string
  urlFile?: string | null
  createdAt: string
  parentId?: number | null
  user: User
  replies: Comment[]
  gpsPoint: GpsPoint
}

interface GpsPointCommentCardProps {
  fileId: number
  userId: number
  setCurrentTime: (t: number) => void
  currentTime: number
  points: GpsPoint[]
}

function buildCommentTree(comments: Comment[]): Comment[] {
  const map = new Map<number, Comment>()
  const roots: Comment[] = []

  comments.forEach((c) => {
    map.set(c.id, { ...c, replies: [] })
  })

  comments.forEach((c) => {
    if (c.parentId) {
      const parent = map.get(c.parentId)
      if (parent) parent.replies.push(map.get(c.id)!)
      else roots.push(map.get(c.id)!)
    } else {
      roots.push(map.get(c.id)!)
    }
  })

  return roots
}

const CommentItem = React.memo(function CommentItem({
  comment,
  setCurrentTime,
  level = 0,
  replyToCommentId,
  setReplyToCommentId,
  userId,
  loadComments,
  toast,
}: {
  comment: Comment
  setCurrentTime: (t: number) => void
  level?: number
  replyToCommentId: number | null
  setReplyToCommentId: React.Dispatch<React.SetStateAction<number | null>>
  userId: number
  loadComments: () => void
  toast: React.RefObject<Toast>
}) {
  const [open, setOpen] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const handleClickTime = useCallback(() => {
    setCurrentTime(comment.gpsPoint.second)
  }, [comment.gpsPoint.second, setCurrentTime])

  const repliesMemo = useMemo(() => {
    if (!open) return null

    return comment.replies.map((reply) => (
      <CommentItem
        key={reply.id}
        comment={reply}
        setCurrentTime={setCurrentTime}
        level={level + 1}
        replyToCommentId={replyToCommentId}
        setReplyToCommentId={setReplyToCommentId}
        userId={userId}
        loadComments={loadComments}
        toast={toast}
      />
    ))
  }, [
    open,
    comment.replies,
    setCurrentTime,
    level,
    replyToCommentId,
    setReplyToCommentId,
    userId,
    loadComments,
    toast,
  ])

  const submitReply = useCallback(async () => {
    if (!replyText.trim()) {
      toast.current?.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "El comentario está vacío",
        life: 3000,
      })
      return
    }

    toast.current?.show({
      severity: "info",
      summary: "Enviando",
      detail: "Enviando respuesta...",
      life: 1500,
    })

    try {
      let urlFile: string | null = null
      if (file) {
        urlFile = await uploadFileDirectlyToS3(file, `comment-reply-${Date.now()}-${file.name}`)
      }

      const res = await fetch("/api/gps-point-comment", {
        method: "POST",
        body: JSON.stringify({
          comment: replyText,
          urlFile,
          gpsPointId: comment.gpsPoint.id,
          createdBy: userId,
          parentId: comment.id,
        }),
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) throw new Error("Error en la respuesta")

      setReplyText("")
      setFile(null)
      setReplyToCommentId(null)
      loadComments()

      toast.current?.show({
        severity: "success",
        summary: "Éxito",
        detail: "Respuesta guardada",
        life: 3000,
      })
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo enviar la respuesta",
        life: 3000,
      })
    }
  }, [
    replyText,
    file,
    comment.gpsPoint.id,
    userId,
    comment.id,
    setReplyToCommentId,
    loadComments,
    toast,
  ])
  const fileUrl = useSignedUrl(comment.urlFile)

  return (
    <div
      className="border-b w-full flex flex-col"
      style={{
        backgroundColor: `hsl(0, 0%, ${98 - level * 4}%)`, // se oscurece según nivel
      }}
    >
      <div className="w-full flex items-start">
        <div className="w-full">
          <div className="flex justify-between items-center">
            <div className="text-sm">{comment.comment}</div>

            <div className="flex items-center gap-2 text-xs">
              <span>{comment.gpsPoint?.second}s</span>
              <Button
                size="small"
                text
                icon="pi pi-history"
                onClick={handleClickTime}
                aria-label="Ir al tiempo"
              />
            </div>
          </div>

          {fileUrl && (
            <a href={fileUrl} target="_blank" className="text-blue-600 text-xs" rel="noreferrer">
              📎 Archivo
            </a>
          )}

          <div className="text-xs text-gray-500">
            {new Date(comment.createdAt).toLocaleString()}
          </div>

          <div className="text-xs mt-1 text-gray-700 font-mono">
            Lat: <span className="font-semibold">{comment.gpsPoint.lat.toFixed(5)}</span>, Lon:{" "}
            <span className="font-semibold">{comment.gpsPoint.lon.toFixed(5)}</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 ml-2">
          {comment.replies.length > 0 && (
            <Button
              size="small"
              text
              icon={open ? "pi pi-chevron-up" : "pi pi-chevron-down"}
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Ocultar respuestas" : "Mostrar respuestas"}
            />
          )}

          <Button
            size="small"
            text
            icon="pi pi-reply"
            onClick={() => {
              if (replyToCommentId === comment.id) setReplyToCommentId(null)
              else setReplyToCommentId(comment.id)
            }}
            aria-label="Responder comentario"
          />
        </div>
      </div>

      {replyToCommentId === comment.id && (
        <div className="ml-4 mt-2 flex flex-col gap-1">
          <InputTextarea
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escribe tu respuesta"
            autoResize
            className="text-sm"
          />

          <div className="flex items-center gap-2">
            <input
              type="file"
              id={`reply-file-${comment.id}`}
              className="hidden"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              icon={file ? "pi pi-check" : "pi pi-paperclip"}
              className="p-button-text p-button-sm"
              severity={!file ? "secondary" : "success"}
              onClick={() => document.getElementById(`reply-file-${comment.id}`)?.click()}
              aria-label="Adjuntar archivo respuesta"
            />
            <Button
              icon="pi pi-send"
              className="p-button-sm"
              onClick={submitReply}
              aria-label="Enviar respuesta"
            />
            <Button
              icon="pi pi-times"
              className="p-button-sm p-button-text"
              onClick={() => setReplyToCommentId(null)}
              aria-label="Cancelar respuesta"
            />
          </div>
        </div>
      )}

      {repliesMemo}
    </div>
  )
})

function GpsPointCommentCardBase({
  fileId,
  userId,
  setCurrentTime,
  points,
  currentTime,
}: GpsPointCommentCardProps) {
  const [comment, setComment] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [replyToCommentId, setReplyToCommentId] = useState<number | null>(null)
  const toast = useRef<Toast>(null)

  const loadComments = useCallback(async () => {
    const res = await fetch(`/api/gps-point-comment/list?fileId=${fileId}`)
    const data: Comment[] = await res.json()
    const nested = buildCommentTree(data)
    setComments(nested)
  }, [fileId])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const submit = useCallback(async () => {
    if (!comment.trim()) {
      toast.current?.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "El comentario está vacío",
        life: 3000,
      })
      return
    }

    const currentGpsPoint = points.find((p) => p.second === currentTime) ?? null
    const gpsPointId = currentGpsPoint?.id ?? null

    if (!gpsPointId) {
      toast.current?.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "No hay punto GPS seleccionado para este tiempo",
        life: 3000,
      })
      return
    }

    toast.current?.show({
      severity: "info",
      summary: "Enviando",
      detail: "Enviando comentario...",
      life: 1500,
    })

    try {
      let urlFile: string | null = null
      if (file) {
        urlFile = await uploadFileDirectlyToS3(file, `comment-${Date.now()}-${file.name}`)
      }

      const res = await fetch("/api/gps-point-comment", {
        method: "POST",
        body: JSON.stringify({
          comment,
          urlFile,
          gpsPointId,
          createdBy: userId,
        }),
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) throw new Error("Error en la respuesta")

      setComment("")
      setFile(null)
      loadComments()

      toast.current?.show({
        severity: "success",
        summary: "Éxito",
        detail: "Comentario guardado",
        life: 3000,
      })
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo enviar el comentario",
        life: 3000,
      })
    }
  }, [comment, file, currentTime, points, userId, loadComments])

  const commentListMemo = useMemo(() => {
    return comments.map((c) => (
      <CommentItem
        key={c.id}
        comment={c}
        setCurrentTime={setCurrentTime}
        replyToCommentId={replyToCommentId}
        setReplyToCommentId={setReplyToCommentId}
        userId={userId}
        loadComments={loadComments}
        toast={toast}
      />
    ))
  }, [comments, setCurrentTime, replyToCommentId, setReplyToCommentId, userId, loadComments])

  return (
    <div className="flex flex-col gap-2 p-2 h-full text-sm relative">
      <Toast ref={toast} position="top-right" />

      {/* FORM COMPACTO */}
      <div className="flex items-center gap-2">
        <input
          type="file"
          className="hidden"
          id="comment-file"
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
        />

        <InputTextarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full text-sm"
          placeholder="Escribe tu comentario"
          rows={1}
          autoResize
        />

        <Button
          icon={file ? "pi pi-check" : "pi pi-paperclip"}
          className="p-button-text p-button-sm"
          severity={!file ? "secondary" : "success"}
          onClick={() => document.getElementById("comment-file")?.click()}
          aria-label="Adjuntar archivo"
        />

        <Button
          icon="pi pi-send"
          className="p-button-sm"
          onClick={submit}
          aria-label="Enviar comentario"
        />
      </div>

      {/* SCROLL SOLO EN ESTA SECCIÓN */}
      <div className="border rounded p-2 max-h-60 overflow-auto text-xs">
        {comments.length === 0 ? (
          <div className="text-center text-gray-500">No hay comentarios.</div>
        ) : (
          commentListMemo
        )}
      </div>
    </div>
  )
}

export default React.memo(GpsPointCommentCardBase)
