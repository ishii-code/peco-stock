"use client";

import * as React from "react";

export type SortDirection = "asc" | "desc";

export interface PecoTableColumn<T> {
  key: string;
  header: React.ReactNode;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  width?: string;
}

export interface PecoTableSort {
  key: string;
  direction: SortDirection;
}

export interface PecoTableProps<T> {
  columns: PecoTableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  striped?: boolean;
  sort?: PecoTableSort | null;
  onSortChange?: (sort: PecoTableSort) => void;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={direction === "asc" ? 1 : 0.4}
        d="M4 7l4-4 4 4"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={direction === "desc" ? 1 : 0.4}
        d="M4 9l4 4 4-4"
      />
    </svg>
  );
}

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export function PecoTable<T>({
  columns,
  data,
  rowKey,
  striped = false,
  sort = null,
  onSortChange,
  onRowClick,
  emptyState,
  className = "",
}: PecoTableProps<T>) {
  const handleSort = (col: PecoTableColumn<T>) => {
    if (!col.sortable || !onSortChange) return;
    const next: PecoTableSort =
      sort?.key === col.key && sort.direction === "asc"
        ? { key: col.key, direction: "desc" }
        : { key: col.key, direction: "asc" };
    onSortChange(next);
  };

  return (
    <div
      className={`w-full overflow-x-auto rounded-peco-lg border border-peco-gray-100 bg-white ${className}`}
    >
      <table className="w-full border-collapse text-sm">
        <thead className="bg-peco-gray-50">
          <tr>
            {columns.map((col) => {
              const isSorted = sort?.key === col.key;
              const direction = isSorted ? sort!.direction : null;
              return (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={[
                    "px-4 py-3 font-semibold text-peco-gray-700",
                    alignClass[col.align ?? "left"],
                    col.sortable ? "cursor-pointer select-none" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleSort(col)}
                  aria-sort={
                    !col.sortable
                      ? undefined
                      : isSorted
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                  }
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable ? (
                      <span className="text-peco-gray-500">
                        <SortIcon direction={direction} />
                      </span>
                    ) : null}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-peco-gray-500"
              >
                {emptyState ?? "データがありません"}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const stripe =
                striped && idx % 2 === 1 ? "bg-peco-gray-50/60" : "";
              return (
                <tr
                  key={rowKey(row, idx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={[
                    "border-t border-peco-gray-100 transition-colors",
                    "hover:bg-peco-gray-50",
                    stripe,
                    onRowClick ? "cursor-pointer" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-peco-gray-900 ${alignClass[col.align ?? "left"]}`}
                    >
                      {col.accessor(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default PecoTable;
