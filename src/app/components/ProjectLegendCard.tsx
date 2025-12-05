"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PanelMenu } from "primereact/panelmenu"
import { MenuItem } from "primereact/menuitem"
import { Fieldset } from "primereact/fieldset"
import { Button } from "primereact/button"
import { Toast } from "primereact/toast"
import { InputTextarea } from "primereact/inputtextarea"
import { GpsPoint, Marker, ProjectLegend, File, GpsPointComment } from "@prisma/client"
import { tree } from "next/dist/build/templates/app-page"

type CommentWithReplies = GpsPointComment & {
  replies: GpsPointComment[]
}

interface MenuItemTemplateOptions {
  onClick?: (event: React.MouseEvent) => void
  // otras props si usas
}
type GroupedMarker = {
  markerId: number
  marker: Marker
  items: (ProjectLegend & { marker: Marker })[]
}

type FileWithGpsPoints = File & {
  gpsPoints: (GpsPoint & {
    GpsPointComment: CommentWithReplies[]
  })[]
}

interface LegendMenuProps {
  projectLegend: (ProjectLegend & { marker: Marker })[]
  onSelectPosition: (pos: GpsPoint) => void
  visibleGroups: Record<number, boolean>
  setVisibleGroups: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
  setSelectComment: React.Dispatch<
    React.SetStateAction<(GpsPointComment & { replies: GpsPointComment[] }) | null>
  >
  gpsPoints: (GpsPoint & {
    GpsPointComment: (GpsPointComment & { replies: GpsPointComment[] })[]
  })[]
  setCurrentTime: (v: number) => void
  setOpenPreview: React.Dispatch<React.SetStateAction<boolean>>
}

const LegendMenu: React.FC<LegendMenuProps> = React.memo(function LegendMenu({
  projectLegend,
  onSelectPosition,
  visibleGroups,
  setVisibleGroups,
  gpsPoints,
  setCurrentTime,
  setSelectComment,
  setOpenPreview,
}) {
  const toast = useRef<Toast>(null)

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
      setVisibleGroups((prev) => ({
        ...prev,
        [markerId]: !prev[markerId],
      }))
    },
    [setVisibleGroups]
  )
  const [menuModel, setMenuModel] = useState<MenuItem[]>([])

  useEffect(() => {
    if (groups.length > 0) {
      setVisibleGroups((prev) => {
        if (Object.keys(prev).length === 0) {
          return Object.fromEntries(groups.map((g) => [g.markerId, true]))
        }
        return prev
      })
    }

    setMenuModel(generateMenuModel)
  }, [groups, projectLegend, gpsPoints, visibleGroups]) // <--- Agregado visibleGroups aquí
  const generateMenuModel = () => {
    const commentsItems =
      gpsPoints
        ?.flatMap((gpsPoint) =>
          gpsPoint.GpsPointComment?.filter((comment) => comment.parentId == null) // solo comentarios raíz
            .map((comment) => {
              const repliesCount = gpsPoint.GpsPointComment.filter(
                (c) => c.parentId === comment.id
              ).length

              const commentLabel =
                comment.comment.length > 40 ? comment.comment.slice(0, 40) + "..." : comment.comment

              return {
                label: `${commentLabel} (${repliesCount} respuesta${
                  repliesCount !== 1 ? "s" : ""
                })`,
                data: { lat: gpsPoint.lat, lon: gpsPoint.lon, comment },
                icon: "pi pi-comment",
                template: () => (
                  <div
                    className="flex flex-row justify-between p-3 rounded-md hover:bg-gray-50 cursor-pointer shadow-sm"
                    style={{ fontSize: "0.875rem" }}
                    title={comment.comment}
                    onClick={(e) => {
                      setCurrentTime(gpsPoint.second)
                    }}
                  >
                    <div className="flex flex-col">
                      <p className="truncate max-w-full mb-2 font-semibold text-gray-900 leading-snug">
                        {comment.comment.length > 80
                          ? comment.comment.slice(0, 80) + "..."
                          : comment.comment}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <span>
                          Lat: <b>{gpsPoint.lat.toFixed(5)}</b>, Lon:{" "}
                          <b>{gpsPoint.lon.toFixed(5)}</b>
                        </span>
                        <span>
                          {repliesCount} respuesta{repliesCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* ---------------- Botón aislado ---------------- */}
                    <div
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        e.nativeEvent.stopImmediatePropagation()
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          e.nativeEvent.stopImmediatePropagation()

                          console.log("Ojo clickeado", comment.id)
                          setSelectComment(comment)
                          setOpenPreview(true)
                        }}
                        className="
                      flex items-center justify-center
                      w-7 h-7
                      rounded-full
                      bg-blue-500 hover:bg-blue-600
                      text-white
                      shadow-sm transition-all hover:shadow-md
                    "
                        title="Ver comentario"
                      >
                        <i className="pi pi-eye text-xs"></i>
                      </button>
                    </div>
                  </div>
                ),
              }
            })
        )
        .flat() ?? []

    return [
      {
        label: "Comentarios",
        icon: "pi pi-comments",
        template: (item: MenuItem, opt: any) => (
          <div
            className="flex items-center p-1 gap-2 text-sm rounded"
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName !== "INPUT") {
                opt.onClick?.(e)
              }
            }}
          >
            <i className="pi pi-map-marker text-sm" />
            <span>{item.label}</span>
          </div>
        ),
        items:
          commentsItems.length > 0
            ? commentsItems
            : [
                {
                  label: "No hay comentarios",
                  disabled: true,
                },
              ],
      },

      ...groups.map(({ marker, items }) => {
        const enabled = visibleGroups[marker.id] ?? false

        return {
          label: marker.name,
          icon: "pi pi-map-marker",
          expanded: true,
          disabled: !enabled,
          template: (item: MenuItem, opt: MenuItemTemplateOptions) => (
            <div
              className={`flex items-center gap-2 p-2 text-sm rounded ${
                enabled ? "cursor-pointer hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
              }`}
              onClick={(e) => {
                if (!enabled) return
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
              />
              <i className="pi pi-map-marker text-sm" />
              <span>{item.label}</span>
            </div>
          ),
          items: items.map((item) => ({
            label: `ID ${item.id}`,
            data: item,
            icon: "pi pi-circle",
            disabled: !enabled,
            template: (subItem: MenuItem) => (
              <div
                className={`flex flex-col gap-1 p-2 pl-4 rounded text-xs ${
                  enabled ? "cursor-pointer hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
                }`}
                onClick={() => enabled && onSelectPosition(item as any)}
              >
                <div className="flex items-center gap-2">
                  <i className="pi pi-map-marker text-sm text-blue-500" />
                  <span className="font-semibold">{subItem.data.description}</span>
                </div>
                <div className="ml-6 text-[11px] text-gray-600 leading-tight">
                  <div>
                    <span className="font-medium">ID:</span> {item.id}
                  </div>
                  <div>
                    <span className="font-medium">Lat:</span> {item.lat}
                  </div>
                  <div>
                    <span className="font-medium">Lon:</span> {item.lon}
                  </div>
                </div>
              </div>
            ),
          })),
        }
      }),
    ]
  }

  const legendTemplate = (
    <div>
      <span className="font-bold">Leyenda</span>
    </div>
  )

  return (
    <>
      <PanelMenu model={menuModel} className="!w-full " />
    </>
  )
})

export default LegendMenu
