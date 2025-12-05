"use client"

import React, { useEffect, useMemo, useState, useCallback } from "react"
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  CircleMarker,
  useMapEvent,
  Tooltip,
} from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

import DraggablePointer from "./DraggablePointer"
import { GpsPoint, GpsPointComment, Marker as IMarker, ProjectLegend } from "@prisma/client"
import { Comment } from "postcss"
import CommentPreviewDialog from "./CommentPreviewDialog"
import NewCommentDialog from "./NewCommentDialog"

const formatDistance = (meters: number) => {
  const km = Math.floor(meters / 1000)
  const m = meters % 1000
  return `${km}k + ${m.toFixed(2)}m`
}

interface MarkerWithIcon {
  id: number
  position: [number, number]
  marker?: IMarker
  icon?: L.Icon
}

/* ---------------------------------------
    Icono default Leaflet configurado 1 vez
---------------------------------------- */
L.Marker.prototype.options.icon = L.icon({
  iconUrl: "/images/marker-icon.png",
  shadowUrl: "/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

/* ---------------------------------------
    EFECTO SOLO PARA VOLAR AL PUNTO SELECCIONADO
---------------------------------------- */
const SelectedPositionEffect = React.memo(function SelectedPositionEffect({
  selectedPosition,
}: {
  selectedPosition?: { lat: number; lon: number } | null
}) {
  const map = useMap()

  useEffect(() => {
    if (!selectedPosition) return

    const { lat, lng } = map.getCenter()
    const same =
      Math.abs(lat - selectedPosition.lat) < 0.00001 &&
      Math.abs(lng - selectedPosition.lon) < 0.00001

    if (!same) {
      map.setView([selectedPosition.lat, selectedPosition.lon], 18, { animate: true })
    }
  }, [selectedPosition]) // ❗ NO incluir "map"

  return null
})

/* ---------------------------------------
    ICONOS DE LEYENDA MEMOIZADOS
---------------------------------------- */
const LegendMarkers = React.memo(function LegendMarkers({
  legend,
  visibleGroups,
  selectedPosition,
}: {
  legend: ProjectLegend[]
  visibleGroups: Record<number, boolean>
  selectedPosition?: { lat: number; lon: number } | null
}) {
  const iconsById = useMemo(() => {
    const map = new Map<number, L.Icon | undefined>()

    legend.forEach((item) => {
      if (map.has(item.id)) return
      try {
        map.set(
          item.id,
          L.icon({
            iconUrl: (item as any).marker.icon,
            iconSize: [25, 25],
            iconAnchor: [12, 25],
          })
        )
      } catch {
        map.set(item.id, undefined)
      }
    })

    return map
  }, [legend])

  return (
    <>
      {legend
        .filter((item) => visibleGroups[item.markerId] ?? true)
        .map((item) => (
          <MarkerWithAutoTooltip
            key={item.id}
            item={item as any}
            icon={iconsById.get(item.id)}
            selectedPosition={selectedPosition}
          />
        ))}
    </>
  )
})

/* ---------------------------------------
    MARKER CON TOOLTIP AUTOMÁTICO SOLO AL CAMBIAR DE SELECCIÓN
---------------------------------------- */
const MarkerWithAutoTooltip = React.memo(function MarkerWithAutoTooltip({
  item,
  icon,
  selectedPosition,
}: {
  item: ProjectLegend & { marker: IMarker }
  icon?: L.Icon
  selectedPosition?: { lat: number; lon: number } | null
}) {
  const markerRef = React.useRef<L.Marker>(null)

  const isSelected = selectedPosition
    ? Math.abs(item.lat - selectedPosition.lat) < 0.00001 &&
      Math.abs(item.lon - selectedPosition.lon) < 0.00001
    : false

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openTooltip()
    }
  }, [isSelected])

  return (
    <Marker position={[item.lat, item.lon]} icon={icon} ref={markerRef}>
      <Tooltip direction="top" offset={[0, -5]}>
        <div style={{ textAlign: "center" }}>
          <strong>{item.marker.name}</strong>
          <br />
          <span>Lat: {item.lat.toFixed(5)}</span>
          <br />
          <span>Lon: {item.lon.toFixed(5)}</span>
          {item.description && (
            <>
              <br />
              <em>{item.description}</em>
            </>
          )}
        </div>
      </Tooltip>
    </Marker>
  )
})

/* ---------------------------------------
    MARCADOR DE REPRODUCCIÓN (Posición en tiempo)
---------------------------------------- */
const PointsLayer = React.memo(function PointsLayer({
  points,
  setCurrentTime,
}: {
  points: (GpsPoint & {
    GpsPointComment?: { comment: string }[]
    fileName?: string // o el campo que tengas para archivo
  })[]
  setCurrentTime: (v: number) => void
}) {
  const map = useMap()

  useEffect(() => {
    const layer = L.layerGroup()

    points.forEach((p) => {
      const commentText = p.GpsPointComment?.map((c) => c.comment).join("; ") ?? ""
      const hasComment = commentText.trim().length > 0

      // Contenido tooltip: comentario + lat/lon + archivo si existe
      const tooltipContent = `
        <div style="font-size: 12px; max-width: 200px;">
          ${hasComment ? `<div><strong>Comentario:</strong> ${commentText}</div>` : ""}
          <div><strong>Lat:</strong> ${p.lat.toFixed(5)}</div>
          <div><strong>Lon:</strong> ${p.lon.toFixed(5)}</div>
          ${p.fileName ? `<div><strong>Archivo:</strong> ${p.fileName}</div>` : ""}
        </div>
      `

      if (hasComment) {
        const messageIcon = L.divIcon({
          html: `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#007bff" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          `,
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 24],
          popupAnchor: [0, -24],
        })

        const marker = L.marker([p.lat, p.lon], { icon: messageIcon })

        marker.on("click", () => {
          setCurrentTime(p.second)
          marker.openTooltip()
        })

        marker.bindTooltip(tooltipContent, { direction: "top", offset: [0, -10], opacity: 0.9 })

        layer.addLayer(marker)
      } else {
        const circle = L.circleMarker([p.lat, p.lon], {
          radius: 5,
          color: "#ff4444",
          fillColor: "#ff4444",
          fillOpacity: 0.8,
          opacity: 0.8,
        })

        circle.on("click", () => setCurrentTime(p.second))

        circle.bindTooltip(tooltipContent, { direction: "top", offset: [0, -10], opacity: 0.9 })

        layer.addLayer(circle)
      }
    })

    layer.addTo(map)
    return () => {
      map.removeLayer(layer)
    }
  }, [points, setCurrentTime])

  return null
})
const MarkerUpdater = React.memo(function MarkerUpdater({
  points,
  currentTime,
  setCurrentTime,
  startKm,
  setOpenPreview,
  setSelectComment,
  setOpenNewCommentDialog,
}: {
  points: (GpsPoint & { GpsPointComment: GpsPointComment[] })[]
  currentTime: number
  setCurrentTime: (v: number) => void
  startKm: number
  setOpenNewCommentDialog: React.Dispatch<React.SetStateAction<boolean>>

  setOpenPreview: (v: any) => void
  setSelectComment: React.Dispatch<
    React.SetStateAction<(GpsPointComment & { replies: GpsPointComment[] }) | null>
  >
}) {
  const map = useMap()

  // 📌 Encuentra el punto más cercano al tiempo actual
  const position = useMemo(() => {
    if (!points.length) return null
    return points.reduce((prev, curr) =>
      Math.abs(curr.second - currentTime) < Math.abs(prev.second - currentTime) ? curr : prev
    )
  }, [points, currentTime])

  // 📌 Mover mapa solo cuando cambia el punto actual
  useEffect(() => {
    if (!position) return
    map.setView([position.lat, position.lon], map.getZoom(), {
      animate: true,
    })
  }, [position])

  // 📌 Icon del marcador (creado una sola vez)
  const customIcon = useMemo(
    () =>
      L.divIcon({
        html: `
          <svg width="20" height="30" viewBox="0 0 20 30">
            <path d="M10 0C6 8 0 20 10 30C20 20 14 8 10 0Z"
              fill="#22c55e" stroke="#15803d" stroke-width="2"/>
          </svg>
        `,
        iconSize: [20, 30],
        iconAnchor: [10, 30],
        className: "",
      }),
    []
  )

  return (
    <>
      <PointsLayer points={points} setCurrentTime={setCurrentTime} />

      {position && (
        <Marker
          position={[position.lat, position.lon]}
          icon={customIcon}
          bubblingMouseEvents={false} // evita que el mapa capture los clics
        >
          <Tooltip
            permanent
            direction="top"
            offset={[0, -25]}
            interactive={true} // ← permite clics dentro del tooltip
            className="tooltip-interactive"
          >
            <div className="font-semibold text-[12px]">
              Lat: {position.lat.toFixed(5)} <br />
              Lon: {position.lon.toFixed(5)} <br />
              Dist: {formatDistance(startKm + position.totalDistance)} <br />
              {/* Comentarios */}
              {position.GpsPointComment.length > 0 ? (
                <div className="mt-1 text-[11px]">
                  <strong>Comentario:</strong>{" "}
                  {position.GpsPointComment[0].comment.length > 40
                    ? position.GpsPointComment[0].comment.slice(0, 40) + "..."
                    : position.GpsPointComment[0].comment}
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-gray-600">Sin comentarios</div>
              )}
              {/* Botones */}
              <div className="mt-2 flex justify-center gap-2 pointer-events-auto">
                {position.GpsPointComment?.length > 0 ? (
                  // 🔵 Tiene comentarios → Ojo
                  <button
                    className="text-blue-600 hover:text-blue-800 pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenPreview(true)
                      setSelectComment(position?.GpsPointComment[0])
                      console.log("Ver comentarios", position.id)
                    }}
                  >
                    <i className="pi pi-eye text-[16px]" />
                  </button>
                ) : (
                  // 🟢 No tiene comentarios → +
                  <button
                    className="text-green-600 hover:text-green-800 pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation()

                      setOpenNewCommentDialog(true)
                      console.log("Agregar comentario", position.id)
                    }}
                  >
                    <i className="pi pi-plus text-[16px]" />
                  </button>
                )}
              </div>
            </div>
          </Tooltip>
        </Marker>
      )}
    </>
  )
})
const AddMarkersOnClick = React.memo(function AddMarkersOnClick({
  addingMode,
  setAddingMode,
  setMarkers,
}: {
  addingMode: boolean
  setAddingMode: (v: boolean) => void
  setMarkers: React.Dispatch<React.SetStateAction<MarkerWithIcon[]>>
}) {
  useMapEvent("click", (e) => {
    if (!addingMode) return

    const icon = L.icon({
      iconUrl: "https://cdn-icons-pNG.flaticon.com/512/684/684908.png",
      iconSize: [38, 38],
      iconAnchor: [19, 38],
    })

    const newMarker: MarkerWithIcon = {
      id: Date.now(),
      position: [e.latlng.lat, e.latlng.lng],
      icon,
    }

    setMarkers((prev) => [...prev, newMarker])
    setAddingMode(false)
  })

  return null
})

export default function GpsMap({
  points,
  currentTime,
  setCurrentTime,
  startKm,
  legend,
  selectedPosition,
  visibleGroups,
  setOpenPreview,
  setSelectComment,
  setOpenNewCommentDialog,
}: {
  points: (GpsPoint & { GpsPointComment: GpsPointComment[] })[]

  setSelectComment: React.Dispatch<
    React.SetStateAction<(GpsPointComment & { replies: GpsPointComment[] }) | null>
  >

  setOpenNewCommentDialog: React.Dispatch<React.SetStateAction<boolean>>
  currentTime: number
  setCurrentTime: (v: number) => void
  setOpenPreview: React.Dispatch<React.SetStateAction<boolean>>
  startKm: number
  legend: ProjectLegend[]
  selectedPosition?: { lat: number; lon: number } | null
  visibleGroups: Record<number, boolean>
}) {
  const polyline = useMemo(() => points.map((p) => [p.lat, p.lon]) as [number, number][], [points])

  const center = useMemo<[number, number]>(() => {
    if (!points.length) return [0, 0]
    return [points[0].lat, points[0].lon]
  }, [points])

  const memoSetCurrentTime = useCallback((v: number) => setCurrentTime(v), [setCurrentTime])

  const [markers, setMarkers] = useState<MarkerWithIcon[]>([])
  const [addingMode, setAddingMode] = useState(false)

  if (!points.length) {
    return <div className="text-center text-white">Cargando puntos...</div>
  }

  return (
    <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />

      <Polyline positions={polyline} pathOptions={{ color: "black", weight: 10, opacity: 0.3 }} />
      <Polyline positions={polyline} pathOptions={{ color: "white", weight: 1 }} />

      <DraggablePointer
        markers={markers}
        setMarkers={setMarkers as any}
        addingMode={addingMode}
        setAddingMode={setAddingMode}
      />

      <SelectedPositionEffect selectedPosition={selectedPosition} />

      <LegendMarkers
        legend={legend}
        visibleGroups={visibleGroups}
        selectedPosition={selectedPosition}
      />

      <MarkerUpdater
        points={points}
        currentTime={currentTime}
        setCurrentTime={memoSetCurrentTime}
        startKm={startKm}
        setOpenPreview={setOpenPreview}
        setSelectComment={setSelectComment}
        setOpenNewCommentDialog={setOpenNewCommentDialog}
      />

      <AddMarkersOnClick
        addingMode={addingMode}
        setAddingMode={setAddingMode}
        setMarkers={setMarkers}
      />

      {markers.map((m) => (
        <Marker key={m.id} position={m.position} icon={m.icon}>
          <Tooltip></Tooltip>
        </Marker>
      ))}
    </MapContainer>
  )
}
