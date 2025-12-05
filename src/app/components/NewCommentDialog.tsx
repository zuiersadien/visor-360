import React, { useState, useRef } from "react"
import { Dialog } from "primereact/dialog"
import { InputTextarea } from "primereact/inputtextarea"
import { Button } from "primereact/button"
import { Toast } from "primereact/toast"

interface NewCommentDialogProps {
  visible: boolean
  onHide: () => void
  onSubmit: (data: { comment: string; file: File | null }) => Promise<void>
}

const NewCommentDialog: React.FC<NewCommentDialogProps> = ({ visible, onHide, onSubmit }) => {
  const [commentText, setCommentText] = useState("")
  const [commentFile, setCommentFile] = useState<File | null>(null)
  const toast = useRef<Toast>(null)

  const handleSubmit = async () => {
    if (!commentText.trim()) {
      toast.current?.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "El comentario está vacío",
      })
      return
    }

    await onSubmit({
      comment: commentText,
      file: commentFile,
    })

    setCommentText("")
    setCommentFile(null)
  }

  const handleHide = () => {
    setCommentText("")
    setCommentFile(null)
    onHide()
  }

  return (
    <Dialog
      header="Nuevo comentario"
      visible={visible}
      style={{ width: "35rem" }}
      onHide={handleHide}
      modal
      blockScroll
    >
      <Toast ref={toast} />
      <div className="flex flex-col gap-3">
        <InputTextarea
          rows={3}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Escribe tu comentario"
        />

        <input
          type="file"
          id="new-comment-file"
          className="hidden"
          accept="application/pdf"
          onChange={(e) => setCommentFile(e.target.files?.[0] ?? null)}
        />

        <Button
          icon={commentFile ? "pi pi-check" : "pi pi-paperclip"}
          label={commentFile ? "Archivo listo" : "Adjuntar archivo (PDF)"}
          text
          onClick={() => document.getElementById("new-comment-file")?.click()}
        />

        <div className="flex gap-2">
          <Button label="Enviar" icon="pi pi-send" onClick={handleSubmit} />
          <Button
            label="Cancelar"
            icon="pi pi-times"
            onClick={handleHide}
            className="p-button-secondary"
          />
        </div>
      </div>
    </Dialog>
  )
}

export default NewCommentDialog
