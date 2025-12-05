import { useState } from "react"
import LegendMenu from "./ProjectLegendCard"

export default function SidebarLegend({
  projectLegend,
  handleSelectLegendPoint,
  visibleGroups,
  setVisibleGroups,
  file,
  setCurrentTime,
  setSelectComment,
  setOpenPreviewDialog,
}) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl m-2 shadow-lg border border-gray-200 flex flex-col">
        {/* Header */}
        <div
          className="bg-gradient-to-r px-4 py-1 flex justify-between items-center cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <i className="pi pi-list text-base"></i>
            Leyenda
          </h2>

          {/* Icono */}
          <i
            className={`pi pi-chevron-${isOpen ? "up" : "down"} transition-transform duration-300`}
          ></i>
        </div>

        {/* Contenido con colapso */}
        <div
          className={`
            overflow-hidden transition-all duration-300
            ${isOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}
          `}
        >
          {/* Contenido interno (usa scroll) */}
          <div className="p-2 overflow-auto max-h-64">
            <LegendMenu
              projectLegend={projectLegend}
              onSelectPosition={handleSelectLegendPoint}
              visibleGroups={visibleGroups}
              setVisibleGroups={setVisibleGroups}
              gpsPoints={file?.gpsPoints || []}
              setCurrentTime={setCurrentTime}
              setSelectComment={setSelectComment}
              setOpenPreview={setOpenPreviewDialog}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
