"use client"

import { PanelMenu } from "primereact/panelmenu"
import { MenuItem } from "primereact/menuitem"
import { File, GpsPoint, Marker, Project, ProjectLegend } from "@prisma/client"
import React, { useCallback, useEffect, useMemo } from "react"
import { Fieldset } from "primereact/fieldset"

type GroupedMarker = {
  markerId: number
  marker: Marker
  items: (ProjectLegend & { marker: Marker })[]
}

type LegendMenuProps = {
  projectLegend: (ProjectLegend & { marker: Marker })[]
  onSelectPosition: (pos: { lat: number; lon: number }) => void
  visibleGroups: Record<number, boolean>
  setVisibleGroups: (s: Record<number, boolean>) => void
}
const LegendMenu = React.memo(function LegendMenu({
  projectLegend,
  onSelectPosition,
  visibleGroups,
  setVisibleGroups,
}: LegendMenuProps) {
  const groups = useMemo(() => {
    const map = new Map<number, GroupedMarker>()

    for (const item of projectLegend) {
      if (!map.has(item.markerId)) {
        map.set(item.markerId, {
          markerId: item.markerId,
          marker: item.marker,
          items: [],
        })
      }
      map.get(item.markerId)!.items.push(item)
    }

    return Array.from(map.values())
  }, [projectLegend])

  const toggleGroup = useCallback(
    (markerId: number) => {
      setVisibleGroups({
        ...visibleGroups,
        [markerId]: !visibleGroups[markerId],
      })
    },
    [visibleGroups, setVisibleGroups]
  )
  useEffect(() => {
    if (projectLegend.length > 0) {
      const initial = Object.fromEntries(projectLegend.map((pl) => [pl.markerId, true]))
      setVisibleGroups(initial)
    }
  }, [projectLegend])
  const menuModel: MenuItem[] = groups.map(({ marker, items }) => {
    const enabled = visibleGroups[marker.id] ?? true

    return {
      label: marker.name,
      icon: "pi pi-map-marker",
      disabled: !enabled,
      template: (item, opt) => (
        <div
          className={`flex items-center gap-2 p-2 text-sm rounded
          ${enabled ? "cursor-pointer hover:bg-gray-100" : "opacity-40 cursor-not-allowed"}
        `}
          onClick={(e) => {
            if (!enabled) return // NO permitir abrir si está deshabilitado
            if ((e.target as HTMLElement).tagName !== "INPUT") {
              opt.onClick?.(e)
            }
          }}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={() => toggleGroup(marker.id)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          />

          <i className="pi pi-map-marker text-sm" />
          <span>{item.label}</span>
        </div>
      ),

      // 🔥 ITEMS DEL GRUPO CON DISABLED DINÁMICO
      items: items.map((item) => ({
        label: `ID ${item.id}`,
        data: item,
        icon: "pi pi-circle",
        disabled: !enabled,
        template: (subItem, opt) => (
          <div
            className={`flex flex-col gap-1 p-2 pl-4 rounded text-xs
            ${enabled ? "cursor-pointer hover:bg-gray-100" : "opacity-40 cursor-not-allowed"}
          `}
            onClick={() => {
              if (!enabled) return // NO permitir selección si está deshabilitado
              onSelectPosition(item)
            }}
          >
            <div className="flex items-center gap-2">
              <i className="pi pi-map-marker text-sm text-blue-500" />
              <span className="font-semibold">{subItem.data.description}</span>
            </div>

            {/* Datos */}
            <div className="ml-6 text-[11px] text-gray-600 leading-tight">
              <div>
                <span className="font-medium">ID:</span> {subItem.data.id}
              </div>
              <div>
                <span className="font-medium">Lat:</span> {subItem.data.lat}
              </div>
              <div>
                <span className="font-medium">Lon:</span> {subItem.data.lon}
              </div>
            </div>
          </div>
        ),
      })),
    }
  })

  const legendTemplate = (
    <div className="flex align-items-center gap-2 p-2 ">
      <span className="font-bold">Leyenda</span>
    </div>
  )
  return (
    <div className="h-full w-full">
      <Fieldset
        legend={legendTemplate}
        className="!m-1 h-full"
        pt={{
          content: {
            className: "h-full overflow-auto !p-1", // 👈 SOLO aquí el scroll
          },
          legend: { className: "!p-0" },
        }}
      >
        <div className="h-56 overflow-auto">
          <PanelMenu model={menuModel} className="!w-full !min-w-0" />
        </div>
      </Fieldset>
    </div>
  )
})

export default LegendMenu
