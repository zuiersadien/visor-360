"use client"

import { useQuery } from "@blitzjs/rpc"
import { Column } from "primereact/column"
import { DataTable } from "primereact/datatable"
import { Button } from "primereact/button"
import getFiles from "../queries/getFiles"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function GalleryTable({ reloadSignal }: { reloadSignal?: number }) {
  const [files, { isLoading, error, refetch }] = useQuery(getFiles, undefined, {
    enabled: true,
  })

  useEffect(() => {
    if (reloadSignal !== undefined) {
      refetch()
    }
  }, [reloadSignal, refetch])

  const router = useRouter()

  const handleOpen = (fileId: number) => {
    router.push(`/gallery/${fileId}`)
  }

  // Función para eliminar (por ahora no hace nada)
  const handleDelete = (fileId: number) => {
    alert(`Eliminar archivo con id ${fileId} (funcionalidad pendiente)`)
  }

  const openButton = (rowData: any) => (
    <Button
      size="small"
      icon="pi pi-external-link"
      rounded
      text
      onClick={() => handleOpen(rowData.id)}
    />
  )

  const deleteButton = (rowData: any) => (
    <Button
      size="small"
      icon="pi pi-trash"
      severity="danger"
      rounded
      text
      onClick={() => handleDelete(rowData.id)}
    />
  )

  return (
    <div>
      <DataTable size="small" value={files} tableStyle={{ minWidth: "50rem" }}>
        <Column field="id" header="ID" />
        <Column field="fileName" header="Nombre" />
        <Column field="project.name" header="Proyecto" />
        <Column field="duration" header="Duración (s)" />
        <Column field="startPlace" header="Kilometro de Inicio" />
        <Column header="Abrir" body={openButton} />
        <Column header="Eliminar" body={deleteButton} />
      </DataTable>
    </div>
  )
}
