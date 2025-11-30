import { useQuery } from "@blitzjs/rpc"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import getMarkers from "../queries/getMarkers"

interface Marker {
  id: number
  name: string
  icon: string
}

interface CardMarkerProps {
  onMarkerClick?: (marker: Marker) => void
}

export default function CardMarker({ onMarkerClick }: CardMarkerProps) {
  const [markers, { isLoading, error }] = useQuery(getMarkers, undefined, {
    enabled: true,
  })

  if (isLoading) return <div>Cargando marcadores...</div>
  if (error) return <div>Error cargando marcadores</div>

  const iconBody = (row: Marker) => (
    <img src={row.icon} alt={row.name} style={{ width: 16, height: 16 }} />
  )

  return (
    <>
      <div className="marker-table-wrapper">
        <DataTable
          value={markers}
          size="small"
          stripedRows
          scrollable
          scrollHeight="300px"
          showGridlines
          selectionMode="single"
          showHeaders={false}
          cellClassName={() => "bg-red"}
          onRowClick={(e: any) => onMarkerClick?.(e.data)}
        >
          <Column body={iconBody} style={{ width: "40px" }} />
          <Column field="name" header="Nombre" />
        </DataTable>
      </div>
    </>
  )
}
