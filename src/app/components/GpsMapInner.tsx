"use client"

import React from "react"
import { MapContainer, TileLayer, Polyline } from "react-leaflet"
import "leaflet/dist/leaflet.css"

import { GpsPoint, ProjectLegend } from "@prisma/client"

interface Props {
  points: GpsPoint[]
  currentTime: number
  setCurrentTime: (v: number) => void
  startKm: number
  legend: ProjectLegend[]
  selectedPosition?: { lat: number; lon: number } | null
  visibleGroups: Record<number, boolean>
}

export default function GpsMapInner({ points }: Props) {
  const polyline = points.map((p) => [p.lat, p.lon]) as [number, number][]

  const center: [number, number] = points.length > 0 ? [points[0].lat, points[0].lon] : [0, 0]

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
        <Polyline positions={polyline} pathOptions={{ color: "black", weight: 10, opacity: 0.3 }} />
        <Polyline positions={polyline} pathOptions={{ color: "white", weight: 1 }} />
      </MapContainer>
    </div>
  )
}
