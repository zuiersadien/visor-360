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
import { Marker as IMarker, ProjectLegend } from "@prisma/client"

function formatDistance(meters: number) {
  const km = Math.floor(meters / 1000)
  const m = meters % 1000
  return `${km}k + ${m.toFixed(2)}m`
}

interface GpsPoint {
  lat: number
  lon: number
  second: number
  totalDistance: number
}

interface MarkerWithIcon {
  id: number
  position: [number, number]
  marker?: IMarker
  icon?: L.Icon
}

interface Props {
  points: GpsPoint[]
  currentTime: number
  setCurrentTime: (v: number) => void
  startKm: number
  legend: ProjectLegend[]
  selectedPosition?: { lat: number; lon: number } | null
  visibleGroups: Record<number, boolean>
}

L.Marker.prototype.options.icon = L.icon({
  iconUrl: "/images/marker-icon.png",
  shadowUrl: "/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

// -- SelectedPositionEffect (memoizado) --
const SelectedPositionEffect = React.memo(function SelectedPositionEffect({
  selectedPosition,
}: {
  selectedPosition?: { lat: number; lon: number } | null
}) {
  const map = useMap()

  useEffect(() => {
    if (!selectedPosition) return

    const center = map.getCenter()
    const same =
      Math.abs(center.lat - selectedPosition.lat) < 0.00001 &&
      Math.abs(center.lng - selectedPosition.lon) < 0.00001

    if (!same) {
      map.setView([selectedPosition.lat, selectedPosition.lon], 18, { animate: true })
    }
  }, [selectedPosition, map])

  return null
})

// -- LegendMarkers (memoizado) --
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
    for (const item of legend) {
      try {
        map.set(
          item.id,
          L.icon({
            iconUrl: item.marker.icon,
            iconSize: [25, 25],
            iconAnchor: [16, 32],
          })
        )
      } catch {
        map.set(item.id, undefined)
      }
    }
    return map
  }, [legend])

  return (
    <>
      {legend
        .filter((item) => visibleGroups[item.markerId] ?? true)
        .map((item) => (
          <MarkerWithAutoTooltip
            key={item.id}
            item={item}
            icon={iconsById.get(item.id)}
            selectedPosition={selectedPosition}
          />
        ))}
    </>
  )
})

// -- MarkerWithAutoTooltip (memoizado) --
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

  const isSelected = useMemo(() => {
    if (!selectedPosition) return false
    return (
      Math.abs(item.lat - selectedPosition.lat) < 0.00001 &&
      Math.abs(item.lon - selectedPosition.lon) < 0.00001
    )
  }, [item.lat, item.lon, selectedPosition])

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

// -- MarkerUpdater (memoizado) --
const MarkerUpdater = React.memo(function MarkerUpdater({
  points,
  currentTime,
  setCurrentTime,
  startKm,
}: {
  points: GpsPoint[]
  currentTime: number
  setCurrentTime: (v: number) => void
  startKm: number
}) {
  const map = useMap()

  const position = useMemo(() => {
    if (!points.length) return null
    return points.reduce((prev, curr) =>
      Math.abs(curr.second - currentTime) < Math.abs(prev.second - currentTime) ? curr : prev
    )
  }, [points, currentTime])

  useEffect(() => {
    if (!position) return
    map.setView([position.lat, position.lon], map.getZoom(), { animate: true })
  }, [position, map])

  const distanceFromStart = position ? startKm + position.totalDistance : 0
  const formattedDistance = formatDistance(distanceFromStart)

  const customIcon = useMemo(
    () =>
      L.divIcon({
        html: `
      <svg width="20" height="30" viewBox="0 0 20 30" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 0C6 8 0 20 10 30C20 20 14 8 10 0Z" fill="#22c55e" stroke="#15803d" stroke-width="2"/>
      </svg>
    `,
        className: "",
        iconSize: [20, 30],
        iconAnchor: [10, 30],
      }),
    []
  )

  return (
    <>
      {points.map((p) => (
        <CircleMarker
          key={p.second}
          center={[p.lat, p.lon]}
          radius={2}
          color="#ff4444"
          fillColor="#ff4444"
          fillOpacity={0.8}
          opacity={0.8}
          eventHandlers={{
            click: () => setCurrentTime(p.second),
          }}
        />
      ))}

      {position && (
        <Marker position={[position.lat, position.lon]} icon={customIcon}>
          <Tooltip direction="top" offset={[0, -25]} interactive={false}>
            <div style={{ fontWeight: "bold" }}>
              Lat: {position.lat.toFixed(5)} <br />
              Lon: {position.lon.toFixed(5)} <br />
              Dist: {formattedDistance}
            </div>
          </Tooltip>
        </Marker>
      )}
    </>
  )
})

// -- AddMarkersOnClick (memoizado) --
const AddMarkersOnClick = React.memo(function AddMarkersOnClick({
  addingMode,
  setAddingMode,
  markers,
  setMarkers,
}: {
  addingMode: boolean
  setAddingMode: (v: boolean) => void
  markers: MarkerWithIcon[]
  setMarkers: React.Dispatch<React.SetStateAction<MarkerWithIcon[]>>
}) {
  useMapEvent("click", (e) => {
    if (!addingMode) return

    const icon = L.icon({
      iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
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

// -- Componente principal --
export default function GpsMap({
  points,
  currentTime,
  setCurrentTime,
  startKm,
  legend,
  selectedPosition,
  visibleGroups,
}: Props) {
  const polyline = useMemo(() => points.map((p) => [p.lat, p.lon]) as [number, number][], [points])
  const center: [number, number] = useMemo(() => [points[0].lat, points[0].lon], [points])

  const [addingMode, setAddingMode] = useState(false)
  const [markers, setMarkers] = useState<MarkerWithIcon[]>([])

  const memoSetCurrentTime = useCallback(
    (v: number) => {
      setCurrentTime(v)
    },
    [setCurrentTime]
  )

  // Evitar render innecesario si no hay puntos
  if (!points.length) {
    return <div style={{ color: "white", textAlign: "center" }}>Cargando puntos...</div>
  }

  return (
    <div style={{ overflow: "hidden", height: "100%", width: "100%" }}>
      <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />

        <Polyline positions={polyline} pathOptions={{ color: "black", weight: 10, opacity: 0.3 }} />
        <Polyline positions={polyline} pathOptions={{ color: "white", weight: 1 }} />

        <DraggablePointer
          markers={markers}
          setMarkers={setMarkers}
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
        />

        <AddMarkersOnClick
          addingMode={addingMode}
          setAddingMode={setAddingMode}
          markers={markers}
          setMarkers={setMarkers}
        />

        {markers.map((m) => (
          <Marker key={m.id} position={m.position} icon={m.icon}>
            <Tooltip>{/* tooltip opcional */}</Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
