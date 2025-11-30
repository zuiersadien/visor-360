"use client"

import { Button } from "primereact/button"
import { Dialog } from "primereact/dialog"
import { useState } from "react"
import GalleryForm from "../../components/GalleryForm"
import GalleryTable from "../../components/GalleryTable"

export default function GalleryPage() {
  const openCreate = () => {
    setModalOpen(true)
  }

  const [modalOpen, setModalOpen] = useState(false)
  return (
    <div className="flex w-full flex-col h-full p-2">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Galeria</h1>
        <Button size="small" label="Nuevo Elemento" icon="pi pi-plus" onClick={openCreate} />
      </div>

      <GalleryTable></GalleryTable>

      <Dialog
        header={"Nuevo Elemento"}
        visible={modalOpen}
        style={{ width: "30rem" }}
        modal
        onHide={() => setModalOpen(false)}
      >
        <GalleryForm />
      </Dialog>
    </div>
  )
}
