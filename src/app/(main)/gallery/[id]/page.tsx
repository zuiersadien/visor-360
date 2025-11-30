"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@blitzjs/rpc"
import getFileById from "@/src/app/queries/getFileById"
import Video360 from "@/src/app/components/Video360"
import {
  AutoComplete,
  AutoCompleteChangeEvent,
  AutoCompleteSelectEvent,
} from "primereact/autocomplete"
import { File, GpsPoint } from "@prisma/client"
import PointTemplate from "@/src/app/components/PointTemplate"
import { formatDistance } from "@/src/app/utis/formatDistance"
import LegendMenu from "@/src/app/components/ProjectLegendCard"
import GpsMap from "@/src/app/components/GpsMap"
import GpsPointCommentCard from "@/src/app/components/GpsPointCommentCard"
import getCurrentUser from "@/src/app/users/queries/getCurrentUser"
import { Button } from "primereact/button"

interface Params {
  id?: string
}

export default function GalleryPreviewPage() {
  const params = useParams() as Params

  const [currentUser] = useQuery(getCurrentUser, null)

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
    queryParams!, // usas ! para decirle TS que nunca es undefined aquí
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
    setSelectedLegendPoint(pos)
  }, [])

  /** ----------------------------------
   * 6) Memo real para evitar rerenders
   ---------------------------------- */
  const projectLegend = useMemo(() => {
    return file?.project?.ProjectLegend ?? []
  }, [file?.project?.ProjectLegend])

  const [visibleGroups, setVisibleGroups] = useState<Record<number, boolean>>({})

  /** ----------------------------------
   * 7) Render
   ---------------------------------- */
  return (
    <div className="w-full h-full flex p-2 flex-col">
      <div className="w-full p-3 border-b bg-white flex items-center gap-4 shadow-sm rounded-t">
        {/* File name + start place */}
        <div className="flex flex-col justify-center min-w-[180px]">
          <h2 className="text-base font-bold text-gray-800 leading-tight">
            {file?.fileName ?? "Cargando archivo..."}
          </h2>

          {file?.startPlace && (
            <span className="text-xs text-gray-600 leading-tight">
              Inicio: <span className="font-semibold">{file.startPlace}</span>
            </span>
          )}
        </div>

        {/* Search (crece para llenar la fila) */}
        <div className="flex-1">
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
            className="w-full"
            inputClassName="w-full text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            icon="pi pi-refresh"
            text
            className="p-button-sm"
            onClick={() => window.location.reload()}
            // tooltip="Recargar página"
          />
          <Button icon="pi pi-info-circle" text className="p-button-sm" />
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="flex flex-1 overflow-hidden">
        {/* VIDEO */}
        <div className="flex-1 bg-black flex items-center justify-center">
          <Video360
            url={file?.fileName ?? ""}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            points={file?.gpsPoints ?? []}
            startKm={startKm}
          />
        </div>
        <div className="w-1/3 bg-white border-l overflow-auto flex flex-col h-full">
          <div className="flex-1 h-full ">
            <LegendMenu
              projectLegend={projectLegend}
              onSelectPosition={handleSelectLegendPoint as any}
              visibleGroups={visibleGroups}
              setVisibleGroups={setVisibleGroups}
            />
          </div>
          <div className="flex-1 overflow-auto">
            {/* Pasar el userId del usuario logueado */}
            <GpsPointCommentCard
              fileId={fileId || 0}
              userId={currentUser?.id || 2}
              points={file?.gpsPoints ?? []}
              setCurrentTime={setCurrentTime}
              currentTime={currentTime}
            />
          </div>

          <div className="flex-1">
            <GpsMap
              visibleGroups={visibleGroups}
              legend={projectLegend}
              startKm={startKm}
              setCurrentTime={setCurrentTime}
              points={file?.gpsPoints ?? []}
              currentTime={currentTime}
              selectedPosition={selectedLegendPoint}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
