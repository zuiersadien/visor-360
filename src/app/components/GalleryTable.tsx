"use client"

import React, { useEffect, useState } from "react"
import { useQuery } from "@blitzjs/rpc"
import { Column } from "primereact/column"
import { DataTable } from "primereact/datatable"
import { Button } from "primereact/button"
import { Tag } from "primereact/tag"
import getFiles from "../queries/getFiles"
import { useRouter } from "next/navigation"
import getTags from "../queries/getTags"
type GalleryTableProps = {
  reloadSignal?: number
  onEdit?: (data: any) => void
}

export default function GalleryTable({ reloadSignal, onEdit }: GalleryTableProps) {
  const [isClient, setIsClient] = useState(false) // para evitar hydration errors
  const [files, { isLoading, error, refetch }] = useQuery(getFiles, undefined, {
    enabled: true,
  })

  const router = useRouter()

  useEffect(() => {
    setIsClient(true) // Marca que ya estamos en cliente
  }, [])

  useEffect(() => {
    if (reloadSignal !== undefined) {
      refetch()
    }
  }, [reloadSignal, refetch])

  // Funciones handlers
  const handleOpen = (fileId: number) => {
    router.push(`/gallery/${fileId}`)
  }

  const handleDelete = (fileId: number) => {
    alert(`Eliminar archivo con id ${fileId} (funcionalidad pendiente)`)
  }

  const handleEdit = (rowData: any) => {
    if (onEdit) onEdit(rowData)
  }

  // Renderizado botones
  const openButton = (rowData: any) => (
    <Button
      size="small"
      icon="pi pi-external-link"
      rounded
      text
      aria-label="Abrir archivo"
      onClick={() => handleOpen(rowData.id)}
      className="p-button-text p-button-rounded p-button-info"
    />
  )

  const deleteButton = (rowData: any) => (
    <Button
      size="small"
      icon="pi pi-trash"
      severity="danger"
      rounded
      text
      aria-label="Eliminar archivo"
      onClick={() => handleDelete(rowData.id)}
      className="p-button-text p-button-rounded"
    />
  )

  const editButton = (rowData: any) => (
    <Button
      size="small"
      icon="pi pi-pencil"
      rounded
      text
      aria-label="Editar archivo"
      onClick={() => handleEdit(rowData)}
      className="p-button-text p-button-rounded p-button-warning"
    />
  )

  // Renderizado tags
  const [tags] = useQuery(getTags, undefined)

  const tagsBodyTemplate = (rowData: any) => {
    if (!rowData.tags || rowData.tags.length === 0) {
      return <span className="text-gray-500">Sin tags</span>
    }

    if (!tags || tags.length === 0) {
      // Aquí puedes mostrar "Cargando..." o algo mientras tags se cargan
      return <span className="text-gray-400 italic">Cargando tags...</span>
    }

    const mappedTags = rowData.tags
      .map((tagId: number) => tags.find((t: any) => t.id === tagId))
      .filter(Boolean)

    if (mappedTags.length === 0) {
      return <span className="text-gray-500">Sin tags</span>
    }

    return (
      <div className="flex flex-wrap gap-1">
        {mappedTags.map((tag: any, index: number) => (
          <Tag
            key={tag.id ?? index}
            value={tag.name}
            severity="success"
            rounded
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
          />
        ))}
      </div>
    )
  }
  if (!isClient) {
    return null
  }

  return (
    <div className="p-4 bg-white shadow-md rounded-md">
      {error && <div className="p-error mb-3">Error al cargar los archivos.</div>}

      <DataTable
        size="small"
        value={files}
        tableStyle={{ minWidth: "60rem" }}
        loading={isLoading}
        emptyMessage="No se encontraron archivos."
        responsiveLayout="scroll"
        className="shadow-sm"
      >
        <Column field="id" header="ID" style={{ width: "4rem" }} />
        <Column field="fileName" header="Nombre" style={{ minWidth: "15rem" }} />
        <Column field="project.name" header="Proyecto" style={{ minWidth: "12rem" }} />
        <Column
          field="duration"
          header="Duración (s)"
          style={{ width: "8rem", textAlign: "right" }}
        />
        <Column
          field="startPlace"
          header="Km. Inicio"
          style={{ width: "10rem", textAlign: "right" }}
        />
        <Column header="Tags" body={tagsBodyTemplate} style={{ minWidth: "12rem" }} />
        <Column header="Abrir" body={openButton} style={{ width: "4rem", textAlign: "center" }} />
        <Column header="Editar" body={editButton} style={{ width: "4rem", textAlign: "center" }} />
        <Column
          header="Eliminar"
          body={deleteButton}
          style={{ width: "4rem", textAlign: "center" }}
        />
      </DataTable>
    </div>
  )
}
