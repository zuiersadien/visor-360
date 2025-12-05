// components/CommentPreviewDialog.tsx
"use client"
import React, { useState, useRef, useEffect } from "react"
import { Dialog } from "primereact/dialog"
import { InputTextarea } from "primereact/inputtextarea"
import { Button } from "primereact/button"
import { Toast } from "primereact/toast"
import { GpsPointComment } from "@prisma/client"
import { useSignedUrlForKey } from "../useSignedUrlForKey"

interface CommentPreviewDialogProps {
  visible: boolean
  comment: (GpsPointComment & { replies?: GpsPointComment[] }) | null
  onHide: () => void
  onSubmitReply: (text: string, file: File | null) => Promise<void>
  getSignedUrlForReply?: (key: string) => Promise<string>
}

const CommentPreviewDialog: React.FC<CommentPreviewDialogProps> = ({
  visible,
  comment,
  onHide,
  onSubmitReply,
  getSignedUrlForReply,
}) => {
  const [replyText, setReplyText] = useState("")
  const [replyFile, setReplyFile] = useState<File | null>(null)

  // Estado para mostrar preview de archivo (comentario principal o respuestas)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Estado para la clave del archivo de respuesta para obtener signed URL
  const [previewReplyFileKey, setPreviewReplyFileKey] = useState<string | null>(null)

  const toast = useRef<Toast>(null)

  // Signed URL para archivo del comentario principal
  const signedUrl = useSignedUrlForKey(comment?.urlFile ?? null)

  // Signed URL para archivo de respuesta seleccionado (cuando previewReplyFileKey cambia)
  const previewReplySignedUrl = useSignedUrlForKey(previewReplyFileKey)

  // Cuando cambie el signedUrl del archivo de respuesta, actualizar previewUrl para mostrar en iframe
  useEffect(() => {
    if (previewReplySignedUrl) {
      setPreviewUrl(previewReplySignedUrl)
    }
  }, [previewReplySignedUrl])

  // Reset formulario y preview cuando cambia visibilidad o comentario
  useEffect(() => {
    if (!visible) {
      setReplyText("")
      setReplyFile(null)
      setPreviewUrl(null)
      setPreviewReplyFileKey(null)
    }
  }, [visible, comment])

  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      toast.current?.show({
        severity: "warn",
        summary: "Texto vacío",
        detail: "Debes escribir algo para responder.",
      })
      return
    }

    try {
      await onSubmitReply(replyText, replyFile)
      setReplyText("")
      setReplyFile(null)
      toast.current?.show({
        severity: "success",
        summary: "Respuesta enviada",
        detail: "Tu respuesta fue enviada correctamente.",
      })
    } catch (error) {
      console.error("Error enviando respuesta:", error)
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo enviar la respuesta.",
      })
    }
  }

  // Manejar clic en "Ver archivo adjunto" de respuestas
  const handlePreviewReplyFile = async (fileKeyOrUrl: string) => {
    try {
      if (getSignedUrlForReply) {
        const url = await getSignedUrlForReply(fileKeyOrUrl)
        setPreviewUrl(url)
        setPreviewReplyFileKey(null)
        return
      }
      // Si no tienes función externa, usar hook para obtener signed URL con la clave
      setPreviewReplyFileKey(fileKeyOrUrl)
    } catch (err) {
      console.error("Error generando signed url para reply:", err)
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo obtener la vista previa del archivo.",
      })
    }
  }

  return (
    <Dialog
      header={
        <div className="flex flex-col">
          <span className="text-base font-semibold">Vista previa del comentario</span>
          {comment?.id && <span className="text-xs text-gray-500">ID: #{comment.id}</span>}
        </div>
      }
      visible={visible}
      style={{ width: "48rem", maxHeight: "80vh" }}
      onHide={onHide}
      modal
      breakpoints={{ "640px": "95vw" }}
      className="p-dialog-scrollable"
    >
      <Toast ref={toast} />

      <div className="flex flex-col gap-5 p-1 max-h-[65vh] overflow-auto">
        {/* Comentario principal */}
        <div className="p-4 bg-gray-50 rounded-lg shadow-inner text-sm max-h-36 overflow-auto">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{comment?.comment}</p>
        </div>

        {/* Vista previa del archivo principal (PDF) */}
        {signedUrl && (
          <div className="flex justify-center">
            <iframe
              src={signedUrl}
              className="border rounded shadow-md"
              style={{ width: "100%", height: "300px", maxWidth: "450px" }}
              title="Vista previa PDF"
            />
          </div>
        )}

        {/* Vista previa dinámica para archivo de respuesta */}
        {previewUrl && (
          <div className="flex justify-center">
            <div style={{ width: "100%", maxWidth: 600 }}>
              <div className="text-xs text-gray-600 mb-2">Vista previa del archivo</div>
              <iframe
                src={previewUrl}
                className="border rounded shadow-md"
                style={{ width: "100%", height: "420px" }}
                title="Preview archivo"
              />
              <div className="flex justify-end mt-2">
                <Button
                  label="Cerrar vista previa"
                  icon="pi pi-times"
                  className="p-button-secondary"
                  onClick={() => {
                    setPreviewUrl(null)
                    setPreviewReplyFileKey(null)
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Respuestas */}
        {comment?.replies && comment.replies.length > 0 && (
          <div className="p-3 bg-white border rounded-lg shadow-sm max-h-48 overflow-auto">
            <h4 className="text-sm font-semibold mb-3">Respuestas</h4>

            {comment.replies.map((reply) => (
              <div
                key={reply.id}
                className="mb-3 p-2 border-l-4 border-blue-400 bg-blue-50 rounded text-xs"
              >
                <p className="text-gray-700 whitespace-pre-wrap">{reply.comment}</p>

                {reply?.urlFile && (
                  <div className="mt-1 flex items-center gap-2">
                    <a
                      href="#"
                      className="text-blue-600 text-xs underline"
                      onClick={(e) => {
                        e.preventDefault()
                        handlePreviewReplyFile(reply.urlFile)
                      }}
                    >
                      📎 Ver archivo adjunto
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Formulario para responder */}
        <div className="flex flex-col gap-3 pt-2">
          <InputTextarea
            rows={1}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escribe tu respuesta..."
            className="text-sm"
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
            label={replyFile ? "Archivo seleccionado" : "Adjuntar archivo (PDF)"}
            severity={replyFile ? "success" : "secondary"}
            outlined
            onClick={() => document.getElementById("reply-file")?.click()}
          />

          <div className="flex gap-2">
            <Button icon="pi pi-send" label="Enviar respuesta" onClick={handleSubmitReply} />
            <Button label="Cerrar" icon="pi pi-times" severity="secondary" text onClick={onHide} />
          </div>
        </div>
      </div>
    </Dialog>
  )
}

export default CommentPreviewDialog
