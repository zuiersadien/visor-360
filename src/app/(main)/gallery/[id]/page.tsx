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
import { File, GpsPoint, GpsPointComment, Project, ProjectLegend } from "@prisma/client"
import PointTemplate from "@/src/app/components/PointTemplate"
import { formatDistance } from "@/src/app/utis/formatDistance"
import LegendMenu from "@/src/app/components/ProjectLegendCard"
import GpsPointCommentCard from "@/src/app/components/GpsPointCommentCard"
import { Button } from "primereact/button"
import dynamic from "next/dynamic"
import GpsMap from "@/src/app/components/GpsMap"
import { uploadFileDirectlyToS3 } from "@/src/app/lib/uploadToS3"
import { Marker, point } from "leaflet"
import { ProgressSpinner } from "primereact/progressspinner"
import CommentPreviewDialog from "@/src/app/components/CommentPreviewDialog"
import NewCommentDialog from "@/src/app/components/NewCommentDialog"
import { FullPageLoading } from "@/src/app/components/FullPageLoading"
import { Card } from "primereact/card"
import SidebarLegend from "@/src/app/components/SidebarLegend"

type CommentWithReplies = GpsPointComment & {
  replies: GpsPointComment[]
}

type FileWithRelations = File & {
  project:
    | (Project & {
        ProjectLegend: (ProjectLegend & {
          marker: Marker
        })[]
      })
    | null
  gpsPoints: (GpsPoint & {
    GpsPointComment: CommentWithReplies[]
  })[]
}
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
  const projectLegend = useMemo(() => {
    return file?.project?.ProjectLegend ?? []
  }, [file?.project?.ProjectLegend])

  const [visibleGroups, setVisibleGroups] = useState<Record<number, boolean>>({})

  const [openPreviewDialog, setOpenPreviewDialog] = useState(false)
  const [openNewCommentDialog, setOpenNewCommentDialog] = useState(false)

  const [selectComment, setSelectComment] = useState<
    (GpsPointComment & { replies: GpsPointComment[] }) | null
  >(null)

  if (error) {
    return <div>Error cargando datos: {error.message}</div>
  }

  if (isLoading) return <FullPageLoading />
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
                className="!w-full"
                inputClassName="!w-full text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-1">
              <Button
                icon="pi pi-refresh"
                text
                className="p-button-sm"
                onClick={() => window.location.reload()}
              />
              <Button icon="pi pi-info-circle" text className="p-button-sm" />
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
          comment={selectComment}
          onHide={() => {
            setOpenPreviewDialog(false)
          }}
          onSubmitReply={async (comment, pdf) => {
            try {
              let urlFile = null

              const createdBy = 3
              if (pdf) {
                urlFile = await uploadFileDirectlyToS3(pdf, pdf.name)
              }

              const res = await fetch("/api/gps-point-comment/reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  commentId: selectComment?.id,
                  comment,
                  createdBy,
                  urlFile,
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
          visible={openNewCommentDialog}
          onHide={() => {
            setOpenNewCommentDialog(false)
          }}
          onSubmit={async ({ comment, file: pdf }) => {
            try {
              let urlFile = null
              const gpsPointId = file?.gpsPoints.find(
                (e) => e.second === Math.trunc(currentTime)
              )?.id

              const createdBy = 3

              // 🔹 Subir archivo si existe
              if (pdf) {
                urlFile = await uploadFileDirectlyToS3(pdf, pdf?.name)
              }

              // 🔹 Guardar comentario en la base de datos
              const res = await fetch("/api/gps-point-comment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  comment,
                  gpsPointId,
                  createdBy,
                  urlFile,
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
            projectLegend={projectLegend}
            handleSelectLegendPoint={handleSelectLegendPoint}
            visibleGroups={visibleGroups}
            setVisibleGroups={setVisibleGroups}
            file={file}
            setCurrentTime={setCurrentTime}
            setSelectComment={setSelectComment}
            setOpenPreviewDialog={setOpenPreviewDialog}
          />

          <div className=" shadow-lg p-4  rounded-xl w-full h-full flex-1 min-h-0  ">
            <GpsMap
              visibleGroups={visibleGroups}
              legend={projectLegend}
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
