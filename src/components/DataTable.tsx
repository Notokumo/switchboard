import { useState, type ReactNode } from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp } from "lucide-react"
import { cn } from "../lib/utils"

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Hide this column on narrow viewports, where the panel is ~800px wide. */
    narrow?: boolean
  }
}

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T, any>[]
  onRowClick?: (row: T) => void
  empty?: ReactNode
  initialSorting?: SortingState
  className?: string
}

export function DataTable<T>({
  data,
  columns,
  onRowClick,
  empty,
  initialSorting = [],
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting)

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="border-b border-line">
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                const canSort = header.column.getCanSort()
                const size = header.column.columnDef.size
                const narrow = header.column.columnDef.meta?.narrow

                return (
                  <th
                    key={header.id}
                    className={cn(
                      "label whitespace-nowrap px-4 py-2.5 font-normal",
                      narrow && "hidden xl:table-cell",
                    )}
                    style={size ? { width: size } : undefined}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 transition-colors hover:text-bone"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === "asc" ? (
                          <ArrowUp size={10} className="text-amber" />
                        ) : sorted === "desc" ? (
                          <ArrowDown size={10} className="text-amber" />
                        ) : null}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row.original)}
              className={cn(
                "row-hover border-b border-line/60 last:border-0",
                onRowClick && "cursor-pointer",
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={cn(
                    "px-4 py-3 align-middle",
                    cell.column.columnDef.meta?.narrow && "hidden xl:table-cell",
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.getRowModel().rows.length === 0 && empty ? empty : null}
    </div>
  )
}

export function TextCell({
  primary,
  secondary,
  mono = false,
}: {
  primary: ReactNode
  secondary?: ReactNode
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <div className={cn("truncate text-[13px] text-bone", mono && "font-mono text-[12px]")}>
        {primary}
      </div>
      {secondary ? (
        <div className="mt-0.5 truncate font-mono text-[10px] tracking-[0.06em] text-fog-dim">
          {secondary}
        </div>
      ) : null}
    </div>
  )
}
