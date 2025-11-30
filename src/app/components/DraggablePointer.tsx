import { useState } from "react"
import { Marker, Popup, useMapEvent } from "react-leaflet"
import L from "leaflet"

interface Props {
  markers: any[]
  addingMode: any
  setAddingMode: any
  setMarkers: any
}
export default function DraggablePointer({
  markers,

  setMarkers,
  addingMode,
  setAddingMode,
}: Props) {
  return (
    <>
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={m.position}
          draggable
          icon={m.icon}
          eventHandlers={{
            dragend: (e) => {
              const pos = e.target.getLatLng()
              setMarkers((prev) =>
                prev.map((mk) => (mk.id === m.id ? { ...mk, position: [pos.lat, pos.lng] } : mk))
              )
            },
          }}
        >
          <Popup>
            Pointer #{m.id}
            <br />
            <button onClick={() => setMarkers((prev) => prev.filter((mk) => mk.id !== m.id))}>
              ❌ Eliminar
            </button>
          </Popup>
        </Marker>
      ))}
    </>
  )
}
