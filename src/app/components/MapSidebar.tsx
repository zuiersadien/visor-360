"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PanelMenu } from "primereact/panelmenu"
import { Button } from "primereact/button"
import { Dialog } from "primereact/dialog"
import { InputTextarea } from "primereact/inputtextarea"
import { Toast } from "primereact/toast"
import { useSignedUrl } from "@/src/hooks/useSignedUrl"
import { uploadFileDirectlyToS3 } from "../lib/uploadToS3"
import { GpsPoint, Marker, ProjectLegend } from "@prisma/client"
import { MenuItem } from "primereact/menuitem"

type GroupedMarker = {
  markerId: number
  marker: Marker
  items: (ProjectLegend & { marker: Marker })[]
}

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

interface Props {
  projectLegend: (ProjectLegend & { marker: Marker })[]
  fileId: number
  currentUser: User | null
  file: { gpsPoints: GpsPoint[] }
  currentTime: number
  setCurrentTime: (t: number) => void
  onSelectPosition: (pos: { lat: number; lon: number }) => void
}

function buildTree(comments: Comment[]): Comment[] {
  const map = new Map<number, Comment>()
  const roots: Comment[] = []

  comments.forEach((c) => map.set(c.id, { ...c, replies: [] }))
  comments.forEach((c) => {
    if (c.parentId) {
      const parent = map.get(c.parentId)
      if (parent) parent.replies.push(map.get(c.id)!)
    } else {
      roots.push(map.get(c.id)!)
    }
  })

  return roots
}

const MapSidebar = ({
  projectLegend,
  fileId,
  currentUser,
  file,
  currentTime,
  setCurrentTime,
  onSelectPosition,
}: Props) => {
  const toast = useRef<Toast>(null)

  // Estados
  const [visibleGroups, setVisibleGroups] = useState<Record<number, boolean>>({})
  const [comments, setComments] = useState<Comment[]>([])
  const [openComment, setOpenComment] = useState<Comment | null>(null)

  const [replyText, setReplyText] = useState("")
  const [replyFile, setReplyFile] = useState<File | null>(null)

  const [newCommentModalOpen, setNewCommentModalOpen] = useState(false)
  const [newCommentText, setNewCommentText] = useState("")
  const [newCommentFile, setNewCommentFile] = useState<File | null>(null)

  // URL firmado para vista previa PDF (solo para comentario abierto)
  const fileUrl = useSignedUrl(openComment?.urlFile ?? null)

  // Agrupar leyenda por markerId
  const groups = useMemo(() => {
    const map = new Map<number, GroupedMarker>()

    for (const item of projectLegend) {
      if (!map.has(item.markerId)) {
        map.set(item.markerId, {
          markerId: item.markerId,
          marker: item.marker,
          items: [],
        })
      }
      map.get(item.markerId)!.items.push(item)
    }

    return Array.from(map.values())
  }, [projectLegend])

  // Inicializar visibleGroups solo una vez
  useEffect(() => {
    if (projectLegend.length > 0 && Object.keys(visibleGroups).length === 0) {
      const initial = Object.fromEntries(projectLegend.map((pl) => [pl.markerId, true]))
      setVisibleGroups(initial)
    }
  }, [projectLegend, visibleGroups])

  // Cargar comentarios desde API
  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/gps-point-comment/list?fileId=${fileId}`)
      const data: Comment[] = await res.json()
      setComments(buildTree(data))
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los comentarios",
      })
    }
  }, [fileId])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  // Toggle visibleGroups
  const toggleGroup = useCallback((markerId: number) => {
    setVisibleGroups((prev) => ({
      ...prev,
      [markerId]: !prev[markerId],
    }))
  }, [])

  // Enviar respuesta a comentario abierto
  const submitReply = useCallback(async () => {
    if (!openComment || !replyText.trim()) {
      toast.current?.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "La respuesta está vacía",
      })
      return
    }

    let uploadedFileUrl: string | null = null
    if (replyFile) {
      uploadedFileUrl = await uploadFileDirectlyToS3(
        replyFile,
        `reply-${Date.now()}-${replyFile.name}`
      )
    }

    await fetch("/api/gps-point-comment", {
      method: "POST",
      body: JSON.stringify({
        comment: replyText,
        urlFile: uploadedFileUrl,
        gpsPointId: openComment.gpsPoint.id,
        createdBy: currentUser?.id ?? 3,
        parentId: openComment.id,
      }),
      headers: { "Content-Type": "application/json" },
    })

    setReplyText("")
    setReplyFile(null)
    setOpenComment(null)
    loadComments()
  }, [openComment, replyText, replyFile, currentUser, loadComments])

  // Enviar nuevo comentario raíz
  const submitNewComment = useCallback(async () => {
    if (!newCommentText.trim()) {
      toast.current?.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "El comentario está vacío",
      })
      return
    }

    const currentGpsPoint = file.gpsPoints.find((p) => p.second === Math.trunc(currentTime)) ?? null
    if (!currentGpsPoint) {
      toast.current?.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "No hay punto GPS en este tiempo",
      })
      return
    }

    let uploadedFileUrl: string | null = null
    if (newCommentFile) {
      uploadedFileUrl = await uploadFileDirectlyToS3(
        newCommentFile,
        `comment-${Date.now()}-${newCommentFile.name}`
      )
    }

    await fetch("/api/gps-point-comment", {
      method: "POST",
      body: JSON.stringify({
        comment: newCommentText,
        urlFile: uploadedFileUrl,
        gpsPointId: currentGpsPoint.id,
        createdBy: currentUser?.id ?? 3,
      }),
      headers: { "Content-Type": "application/json" },
    })

    setNewCommentText("")
    setNewCommentFile(null)
    setNewCommentModalOpen(false)
    loadComments()
  }, [newCommentText, newCommentFile, file.gpsPoints, currentTime, currentUser, loadComments])

  // Construir el modelo combinado para PanelMenu
  const menuModel: MenuItem[] = useMemo(() => {
    // Items de leyenda (grupos)
    const legendMenuItems = groups.map(({ marker, items }) => {
      const enabled = visibleGroups[marker.id] ?? true

      return {
        label: marker.name,
        icon: "pi pi-map-marker",
        expanded: true,
        disabled: !enabled,

        template: (item, opt) => (
          <div
            className={`flex items-center gap-2 p-2 text-sm rounded
              ${enabled ? "cursor-pointer hover:bg-gray-100" : "opacity-40 cursor-not-allowed"}`}
            onClick={(e) => {
              if (!enabled) return
              if ((e.target as HTMLElement).tagName !== "INPUT") {
                opt.onClick?.(e)
              }
            }}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => toggleGroup(marker.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <i className="pi pi-map-marker text-sm" />
            <span>{item.label}</span>
          </div>
        ),

        items: items.map((item) => ({
          label: `ID ${item.id}`,
          data: item,
          icon: "pi pi-circle",
          disabled: !enabled,

          template: (subItem) => (
            <div
              className={`flex flex-col gap-1 p-2 pl-4 rounded text-xs
                ${enabled ? "cursor-pointer hover:bg-gray-100" : "opacity-40 cursor-not-allowed"}`}
              onClick={() => enabled && onSelectPosition(item)}
            >
              <div className="flex items-center gap-2">
                <i className="pi pi-map-marker text-sm text-blue-500" />
                <span className="font-semibold">{subItem.data.description}</span>
              </div>
              <div className="ml-6 text-[11px] text-gray-600 leading-tight">
                <div>
                  <span className="font-medium">ID:</span> {item.id}
                </div>
                <div>
                  <span className="font-medium">Lat:</span> {item.lat}
                </div>
                <div>
                  <span className="font-medium">Lon:</span> {item.lon}
                </div>
              </div>
            </div>
          ),
        })),
      }
    })

    // Items de comentarios
    const commentsMenuItem: MenuItem = {
      label: "Comentarios",
      icon: "pi pi-comments",
      expanded: true,
      template: (item, opt) => (
        <div
          className="flex items-center gap-2 p-2 text-sm rounded cursor-pointer hover:bg-gray-100"
          onClick={(e) => {
            if ((e.target as HTMLElement).tagName !== "INPUT") {
              opt.onClick?.(e)
            }
          }}
        >
          <i className="pi pi-comments text-sm" />
          <span>{item.label}</span>
          <Button
            icon="pi pi-plus"
            size="small"
            className="ml-auto"
            onClick={(e) => {
              e.stopPropagation()
              setNewCommentModalOpen(true)
            }}
            text
          />
        </div>
      ),
      items: comments.map((c) => ({
        icon: "pi pi-comment",
        label: c.comment.slice(0, 30) + (c.comment.length > 30 ? "..." : ""),
        data: c,
        template: () => (
          <div
            className="flex items-center justify-between p-1 rounded hover:bg-gray-100 cursor-pointer"
            style={{ fontSize: "0.75rem" }}
            title={c.comment}
            onClick={() => setOpenComment(c)}
          >
            <span className="truncate max-w-xs">
              {c.comment.slice(0, 30) + (c.comment.length > 30 ? "..." : "")}
            </span>
            <div className="flex gap-1 items-center">
              <span className="text-xs text-gray-500 italic whitespace-nowrap">
                {c.replies.length} {c.replies.length === 1 ? "respuesta" : "respuestas"}
              </span>
              <Button
                icon="pi pi-eye"
                className="p-button-text p-button-sm"
                aria-label="Preview comentario"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenComment(c)
                }}
              />
              <Button
                icon="pi pi-map-marker"
                className="p-button-text p-button-sm"
                aria-label="Centrar punto"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectPosition({ lat: c.gpsPoint.lat, lon: c.gpsPoint.lon })
                }}
              />
            </div>
          </div>
        ),
      })),
    }

    return [...legendMenuItems, commentsMenuItem]
  }, [
    groups,
    visibleGroups,
    toggleGroup,
    comments,
    setNewCommentModalOpen,
    setOpenComment,
    onSelectPosition,
  ])

  return (
    <div className="h-full p-2 w-full flex flex-col">
      <Toast ref={toast} />

      <div className="flex-grow overflow-auto">
        <PanelMenu model={menuModel} className="!w-full" />
      </div>

      {/* Modal para nuevo comentario raíz */}
      <Dialog
        header="Nuevo comentario"
        visible={newCommentModalOpen}
        style={{ width: "35rem" }}
        onHide={() => {
          setNewCommentModalOpen(false)
          setNewCommentText("")
          setNewCommentFile(null)
        }}
        modal
        blockScroll
      >
        <div className="flex flex-col gap-3">
          <InputTextarea
            rows={3}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Escribe tu comentario"
          />

          <input
            type="file"
            id="new-comment-file"
            className="hidden"
            accept="application/pdf"
            onChange={(e) => setNewCommentFile(e.target.files?.[0] ?? null)}
          />

          <Button
            icon={newCommentFile ? "pi pi-check" : "pi pi-paperclip"}
            label={newCommentFile ? "Archivo listo" : "Adjuntar archivo (PDF)"}
            text
            onClick={() => document.getElementById("new-comment-file")?.click()}
          />

          <Button label="Enviar" icon="pi pi-send" onClick={submitNewComment} />
        </div>
      </Dialog>

      {/* Modal para responder comentario */}
      <Dialog
        header={`Responder a comentario #${openComment?.id ?? ""}`}
        visible={openComment !== null}
        style={{ width: "50rem", maxHeight: "80vh" }}
        onHide={() => {
          setOpenComment(null)
          setReplyText("")
          setReplyFile(null)
        }}
        modal
        blockScroll
      >
        <div className="flex flex-col gap-4">
          {/* Texto del comentario original */}
          <div className="p-3 bg-gray-100 rounded text-sm max-h-28 overflow-auto">
            {openComment?.comment}
          </div>

          {/* Preview archivo PDF centrado */}
          {openComment?.urlFile && fileUrl && (
            <div className="flex justify-center">
              <iframe
                src={fileUrl}
                className="border rounded"
                style={{ width: "100%", height: "300px", maxWidth: "400px" }}
                title="Vista previa PDF"
              />
            </div>
          )}

          {/* Respuestas (replies) */}
          {openComment?.replies.length ? (
            <div className="max-h-40 overflow-auto border-t pt-2">
              <h4 className="text-sm font-semibold mb-2">Respuestas</h4>
              {openComment.replies.map((r) => (
                <div key={r.id} className="border-l pl-3 mb-2 text-xs">
                  <div>{r.comment}</div>
                  {r.urlFile && (
                    <a
                      href={r.urlFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-xs"
                    >
                      📎 Archivo adjunto
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {/* Área para escribir nueva respuesta */}
          <div className="flex flex-col gap-2">
            <InputTextarea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Escribe tu respuesta"
            />

            <input
              type="file"
              id="reply-file"
              className="hidden"
              accept="application/pdf"
              onChange={(e) => setReplyFile(e.target.files?.[0] ?? null)}
            />

            <Button
              icon={replyFile ? "pi pi-check" : "pi pi-paperclip"}
              label={replyFile ? "Archivo listo" : "Adjuntar archivo (PDF)"}
              text
              onClick={() => document.getElementById("reply-file")?.click()}
            />

            <Button icon="pi pi-send" label="Enviar respuesta" onClick={submitReply} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default React.memo(MapSidebar)
