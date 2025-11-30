"use client"

import { useEffect, useState } from "react"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Dialog } from "primereact/dialog"
import { Button } from "primereact/button"
import { InputText } from "primereact/inputtext"
import { Dropdown } from "primereact/dropdown"
import { ProjectLegend, Marker } from "@prisma/client"

export default function ProjectLegendCrud({ projectId }: { projectId: number }) {
  const [data, setData] = useState<ProjectLegend[]>([])
  const [markers, setMarkers] = useState<Marker[]>([])

  const [dialog, setDialog] = useState(false)
  const [edit, setEdit] = useState<ProjectLegend | null>(null)

  const [descripcion, setDescripcion] = useState("")
  const [lat, setLat] = useState("")
  const [lon, setLon] = useState("")
  const [markerId, setMarkerId] = useState<number | null>(null)

  const load = async () => {
    const res = await fetch("/api/project-legend")
    const json = await res.json()
    setData(json.filter((x: ProjectLegend) => x.projectId === projectId))
  }

  const loadMarkers = async () => {
    const res = await fetch("/api/marker")
    const json = await res.json()
    setMarkers(json)
  }

  useEffect(() => {
    load()
    loadMarkers()
  }, [])

  const save = async () => {
    const payload = {
      descripcion,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      markerId,
      projectId,
    }

    if (edit) {
      await fetch(`/api/project-legend/${edit.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
    } else {
      await fetch(`/api/project-legend`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    }

    setDialog(false)
    reset()
    load()
  }

  const reset = () => {
    setDescripcion("")
    setLat("")
    setLon("")
    setMarkerId(null)
    setEdit(null)
  }

  const remove = async (row: ProjectLegend) => {
    await fetch(`/api/project-legend/${row.id}`, { method: "DELETE" })
    load()
  }

  const openEdit = (row: any) => {
    setEdit(row)
    setDescripcion(row.descripcion || "")
    setLat(row.lat?.toString() || "")
    setLon(row.lon?.toString() || "")
    setMarkerId(row.markerId || null)
    setDialog(true)
  }

  return (
    <div>
      <div className="flex w-full justify-end">
        <Button
          label="Agregar Legend"
          icon="pi pi-plus"
          className="mb-3"
          size="small"
          onClick={() => {
            reset()
            setDialog(true)
          }}
        />
      </div>

      <DataTable value={data}>
        <Column field="id" header="ID" sortable />
        <Column field="descripcion" header="Descripción" sortable />
        <Column field="lat" header="Latitud" sortable />
        <Column field="lon" header="Longitud" sortable />
        <Column field="marker.name" header="Tipo" sortable />

        <Column
          header="Acciones"
          body={(row) => (
            <div className="flex gap-2">
              <Button icon="pi pi-pencil" text rounded onClick={() => openEdit(row)} />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                onClick={() => remove(row)}
              />
            </div>
          )}
        />
      </DataTable>

      <Dialog
        header={edit ? "Editar Legend" : "Nuevo Legend"}
        visible={dialog}
        onHide={() => setDialog(false)}
        footer={<Button label="Guardar" icon="pi pi-check" onClick={save} />}
      >
        <div className="flex flex-col gap-4 p-3">
          <div>
            <label>Descripción</label>
            <InputText
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label>Latitud</label>
            <InputText value={lat} onChange={(e) => setLat(e.target.value)} className="w-full" />
          </div>

          <div>
            <label>Longitud</label>
            <InputText value={lon} onChange={(e) => setLon(e.target.value)} className="w-full" />
          </div>

          <div>
            <label>Tipo / Marker</label>
            <Dropdown
              options={markers}
              optionLabel="name"
              optionValue="id"
              value={markerId}
              onChange={(e) => setMarkerId(e.value)}
              placeholder="Seleccionar tipo"
              className="w-full"
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
