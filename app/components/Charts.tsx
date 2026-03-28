"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

type Props = {
  data: any[];
};

export default function DataTable({ data }: Props) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<any[]>([]);

  // =====================
  // 🔥 COLUMNS
  // =====================
  const columns: ColumnDef<any>[] = Object.keys(data[0] || {}).map((key) => ({
    accessorKey: key,
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="flex items-center gap-1 font-semibold"
      >
        {key}
        {column.getIsSorted() === "asc" && "🔼"}
        {column.getIsSorted() === "desc" && "🔽"}
      </button>
    ),
    cell: (info) => info.getValue() || "-",
  }));

  // =====================
  // 🔥 TABLE
  // =====================
  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: (value) => {
      setGlobalFilter(value);
      table.setPageIndex(0);
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const filteredRows = table.getFilteredRowModel().rows;

  // =====================
  // 🔥 SAFE PAGINATION
  // =====================
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  const safeNext = () => {
    if (pageIndex < pageCount - 1) table.nextPage();
  };

  const safePrev = () => {
    if (pageIndex > 0) table.previousPage();
  };

  const safeLast = () => {
    table.setPageIndex(Math.max(pageCount - 1, 0));
  };

  const safeFirst = () => {
    table.setPageIndex(0);
  };

  // 🔥 Reset page on filter
  useEffect(() => {
    table.setPageIndex(0);
  }, [globalFilter, table.getState().columnFilters]);

  // 🔥 Clamp page (FINAL FIX)
  useEffect(() => {
    if (pageIndex >= pageCount) {
      table.setPageIndex(Math.max(pageCount - 1, 0));
    }
  }, [filteredRows.length]);

  // =====================
  // 🔥 COUNTS
  // =====================
  function getCounts(key: string) {
    const counts: Record<string, number> = {};

    filteredRows.forEach((row) => {
      const value = row.original[key] || "Unknown";
      counts[value] = (counts[value] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }

  const countFields = [
    "District",
    "State",
    "Designation",
    "Name",
    "Program name",
    "Mode",
  ];

  // =====================
  // 🔥 DOWNLOAD EXCEL
  // =====================
  function downloadCountsExcel() {
    const workbook = XLSX.utils.book_new();
    const common: any[] = [];

    countFields.forEach((field) => {
      getCounts(field).forEach(([value, count]) => {
        common.push({ Field: field, Value: value, Count: count });
      });
    });

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(common),
      "All Counts",
    );

    countFields.forEach((field) => {
      const sheet = getCounts(field).map(([value, count]) => ({
        Value: value,
        Count: count,
      }));

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(sheet),
        field.substring(0, 30),
      );
    });

    XLSX.writeFile(workbook, "counts.xlsx");
  }

  // =====================
  // 🔥 DOWNLOAD WORD
  // =====================
  async function downloadCountsWord() {
    const sections: any[] = [];

    const common: Paragraph[] = [
      new Paragraph({
        children: [new TextRun({ text: "All Counts", bold: true, size: 32 })],
      }),
    ];

    countFields.forEach((field) => {
      common.push(
        new Paragraph({
          children: [new TextRun({ text: field, bold: true })],
        }),
      );

      getCounts(field).forEach(([value, count]) => {
        common.push(
          new Paragraph({
            children: [new TextRun(`${value} : ${count}`)],
          }),
        );
      });
    });

    sections.push({ children: common });

    const doc = new Document({ sections });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "counts.docx");
  }

  return (
    <div className="mt-6">
      {/* SEARCH */}
      <input
        placeholder="Search..."
        value={globalFilter ?? ""}
        onChange={(e) => table.setGlobalFilter(e.target.value)}
        className="border px-3 py-2 rounded-lg mb-4 w-80"
      />

      {/* DOWNLOAD */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={downloadCountsExcel}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Excel
        </button>
        <button
          onClick={downloadCountsWord}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Word
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="border px-2 py-2">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    <input
                      onChange={(e) =>
                        header.column.setFilterValue(e.target.value)
                      }
                      className="w-full mt-1 border text-xs"
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-4">
                  No data found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border px-2 py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between mt-4 items-center">
        <div>
          Rows:
          <select
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            value={table.getState().pagination.pageSize}
            className="ml-2 border"
          >
            {[10, 20, 50, 100].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          Page {pageIndex + 1} of {pageCount}
        </div>

        <div className="flex gap-2">
          <button onClick={safeFirst} disabled={pageIndex === 0}>
            ⏮
          </button>
          <button onClick={safePrev} disabled={pageIndex === 0}>
            Prev
          </button>
          <button onClick={safeNext} disabled={pageIndex >= pageCount - 1}>
            Next
          </button>
          <button onClick={safeLast} disabled={pageIndex >= pageCount - 1}>
            ⏭
          </button>
        </div>
      </div>

      {/* COUNTS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        {countFields.map((field) => (
          <div key={field} className="border p-3 rounded">
            <h3 className="font-semibold mb-2">{field}</h3>
            {getCounts(field).map(([v, c]) => (
              <div key={v} className="flex justify-between text-sm">
                <span>{v}</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
