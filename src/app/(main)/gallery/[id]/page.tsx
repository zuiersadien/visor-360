"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import { invalidateQuery, useQuery } from "@blitzjs/rpc"
import getFileById from "@/src/app/queries/getFileById"
import Video360 from "@/src/app/components/Video360"
import {
  AutoComplete,
  AutoCompleteChangeEvent,
  AutoCompleteSelectEvent,
} from "primereact/autocomplete"
import { File, GpsPoint, Project } from "@prisma/client"
import PointTemplate from "@/src/app/components/PointTemplate"
import { formatDistance } from "@/src/app/utis/formatDistance"
import GpsMap from "@/src/app/components/GpsMap"
import { uploadFileDirectlyToS3 } from "@/src/app/lib/uploadToS3"
import CommentPreviewDialog from "@/src/app/components/CommentPreviewDialog"
import NewCommentDialog from "@/src/app/components/NewCommentDialog"
import { FullPageLoading } from "@/src/app/components/FullPageLoading"
import SidebarLegend from "@/src/app/components/SidebarLegend"
import getTags from "@/src/app/queries/getTags"
import { Tag } from "primereact/tag"

interface Params {
  id?: string
}

export default function GalleryPreviewPage() {
  const params = useParams() as Params

  /** ----------------------------------
   * 1) Obtener fileId solo 1 vez
   ---------------------------------- */
  const fileId = useMemo(() => {
    const id = params.id
    return id ? Number(id) : null
  }, [params.id])

  const queryParams = fileId !== null ? { id: fileId } : undefined

  const [file, { isLoading, error }] = useQuery(
    getFileById,
    queryParams!, // TS sabe que no es undefined
    { enabled: fileId !== null }
  )
  useEffect(() => {
    if (file?.startPlace != null) {
      setStartKm(Number(file?.startPlace))
    }
  }, [file?.startPlace])
  /** ----------------------------------
   * 3) Estados generales
   ---------------------------------- */
  const [currentTime, setCurrentTime] = useState(0)
  const [startKm, setStartKm] = useState(0)

  /** ----------------------------------
   * 4) AutoComplete search
   ---------------------------------- */
  const [search, setSearch] = useState("")
  const [filteredSuggestions, setFilteredSuggestions] = useState<GpsPoint[]>([])

  const searchPoints = useCallback(
    (e: { query: string }) => {
      if (!file?.gpsPoints) return

      const query = e.query.trim().toLowerCase()

      const results = file.gpsPoints.filter((p) => {
        const dist = startKm + p.totalDistance
        return formatDistance(dist).includes(query)
      })

      setFilteredSuggestions(results.slice(0, 30))
    },
    [file?.gpsPoints, startKm]
  )

  /** ----------------------------------
   * 5) Legend click
   ---------------------------------- */
  const [selectedLegendPoint, setSelectedLegendPoint] = useState<GpsPoint | null>(null)

  const handleSelectLegendPoint = useCallback((pos: GpsPoint) => {
    // Clon para garantizar que React detecte cambio de referencia
    setSelectedLegendPoint({ ...pos })
  }, [])

  /** ----------------------------------
   * 6) Memo real para evitar rerenders
   ---------------------------------- */
  const pointsMarkers = useMemo(() => {
    return file?.project?.PointMarker ?? []
  }, [file?.project?.PointMarker])

  const [visibleGroups, setVisibleGroups] = useState<Record<number, boolean>>({})

  const [openPreviewDialog, setOpenPreviewDialog] = useState(false)
  const [openNewCommentDialog, setOpenNewCommentDialog] = useState(false)

  const [tagsOptions, { isLoading: isLoadingTags }] = useQuery(getTags, undefined)

  const [selectComment, setSelectComment] = useState<any | null>(null)

  const [newPosition, setNewPosition] = useState<[number, number] | null>(null)

  if (error) {
    return <div>Error cargando datos: {error.message}</div>
  }

  if (isLoading && isLoadingTags) return <FullPageLoading />
  return (
    <div className="w-full h-full flex p-2 flex-col">
      {/* CONTENIDO */}
      <div className="flex flex-1 overflow-hidden w-full">
        <div className="flex flex-col w-1/2">
          <div className="w-full p-3 border-b bg-white flex items-center gap-4 shadow-sm rounded-t">
            {/* Aquí el texto y demás */}
            <div className="flex flex-col justify-center ">
              <h2 className="text-base font-bold text-gray-800 leading-tight">
                {file?.fileName ?? "Cargando archivo..."}
              </h2>

              {file?.startPlace && (
                <span className="text-xs text-gray-600 leading-tight">
                  Inicio: <span className="font-semibold">{file.startPlace}</span>
                </span>
              )}
            </div>

            {/* El autocomplete */}
            <div className="flex-2 w-full">
              <AutoComplete
                value={search}
                suggestions={filteredSuggestions}
                completeMethod={searchPoints}
                field=""
                itemTemplate={(e) => <PointTemplate p={e} startKm={startKm} />}
                onChange={(e: AutoCompleteChangeEvent) => setSearch(e.value)}
                onSelect={(e: AutoCompleteSelectEvent<GpsPoint>) => {
                  const p = e.value as GpsPoint
                  setSearch(formatDistance(startKm + p.totalDistance))
                  setCurrentTime(p.second)
                }}
                placeholder="Buscar distancia..."
                size={"small"}
                className="!w-full"
                inputClassName="!w-full text-sm"
              />
            </div>

            <div>
              {file?.tags.map((tag) => (
                <Tag
                  key={tag.id}
                  value={tag.name}
                  style={{
                    backgroundColor: `#${tag.color}`,
                    color: "white",
                  }}
                  rounded
                ></Tag>
              ))}
            </div>
          </div>

          <Video360
            url={file?.fileName ?? ""}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            points={file?.gpsPoints ?? []}
            startKm={startKm}
          />
        </div>

        <CommentPreviewDialog
          visible={openPreviewDialog}
          pointMarker={selectComment}
          tags={tagsOptions || []}
          defaultTags={file?.tags || []}
          onHide={() => {
            setOpenPreviewDialog(false)
          }}
          onSubmitReply={async (comment, pdf, tags, parentId) => {
            try {
              let urlFile = null

              const createdById = 1
              if (pdf) {
                urlFile = await uploadFileDirectlyToS3(pdf, pdf.name)
              }

              const res = await fetch("/api/point-marker/reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  parentId,
                  comment,
                  urlFile,
                  createdById,
                  tags,
                }),
              })

              if (!res.ok) throw new Error("Error creando respuesta")

              console.log("Respuesta creada:", await res.json())
              setOpenPreviewDialog(false)

              await invalidateQuery(getFileById, queryParams!)
            } catch (error) {
              console.error("Error en submit respuesta:", error)
            }
          }}
        ></CommentPreviewDialog>
        <NewCommentDialog
          tags={tagsOptions || []}
          defaultTags={file?.tags || []}
          visible={openNewCommentDialog}
          newPosition={newPosition}
          onHide={() => {
            setOpenNewCommentDialog(false)
          }}
          onSubmit={async ({ comment, tags, marker, file: pdf }) => {
            try {
              let urlFile = null

              const createdById = 1

              // 🔹 Subir archivo si existe
              if (pdf) {
                urlFile = await uploadFileDirectlyToS3(pdf, pdf?.name)
              }

              // 🔹 Guardar comentario en la base de datos
              const res = await fetch("/api/point-marker", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  comment,
                  createdById,
                  urlFile,
                  projectId: file?.projectId,
                  markerId: marker?.id,
                  lat: newPosition?.[0],
                  lon: newPosition?.[1],
                  tags: tags.map((e) => e.id),
                }),
              })

              if (!res.ok) throw new Error("Error creando comentario")

              console.log("Comentario creado:", await res.json())
              setOpenNewCommentDialog(false)

              await invalidateQuery(getFileById, queryParams!)
            } catch (error) {
              console.error("Error en submit comentario:", error)
            }
          }}
        ></NewCommentDialog>

        <div className="w-1/2 bg-white border-l h-full flex flex-col overflow-auto">
          <SidebarLegend
            tags={tagsOptions || []}
            pointsMarkers={(pointsMarkers as any) || []}
            onSelectPosition={handleSelectLegendPoint}
            visibleGroups={visibleGroups}
            setVisibleGroups={setVisibleGroups}
          />

          <div className=" shadow-lg p-4  rounded-xl w-full h-full flex-1 min-h-0  ">
            <GpsMap
              newPosition={newPosition}
              setNewPosition={setNewPosition}
              visibleGroups={visibleGroups}
              legend={pointsMarkers}
              startKm={startKm}
              setCurrentTime={setCurrentTime}
              points={file?.gpsPoints ?? []}
              currentTime={currentTime}
              selectedPosition={selectedLegendPoint}
              setOpenPreview={setOpenPreviewDialog}
              setSelectComment={setSelectComment}
              setOpenNewCommentDialog={setOpenNewCommentDialog}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
