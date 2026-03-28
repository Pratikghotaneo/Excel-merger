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
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
} from "docx";
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

  // reset on filter
  useEffect(() => {
    table.setPageIndex(0);
  }, [globalFilter, table.getState().columnFilters]);

  // clamp page
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
  // 🔥 DOWNLOAD WORD
  // =====================
  async function downloadCountsWord() {
    const sections: any[] = [];

    const children: any[] = [];

    // 🔥 TITLE
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Counts Report",
            bold: true,
            size: 32,
          }),
        ],
        spacing: { after: 300 },
      }),
    );

    // 🔥 EACH FIELD AS TABLE
    countFields.forEach((field) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: field, bold: true })],
          spacing: { after: 200 },
        }),
      );

      const rows = [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph("Value")],
            }),
            new TableCell({
              children: [new Paragraph("Count")],
            }),
          ],
        }),
      ];

      getCounts(field).forEach(([value, count]) => {
        rows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph(value)],
              }),
              new TableCell({
                children: [new Paragraph(String(count))],
              }),
            ],
          }),
        );
      });

      children.push(
        new Table({
          rows,
          width: { size: 100, type: "pct" },
        }),
      );

      children.push(new Paragraph("")); // spacing
    });

    sections.push({ children });

    const doc = new Document({ sections });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "counts.docx");
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Data Dashboard</h1>

      {/* SEARCH + BUTTONS */}
      <div className="flex flex-wrap justify-between gap-3 mb-4">
        <input
          placeholder="Search..."
          value={globalFilter ?? ""}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          className="border px-4 py-2 rounded-xl w-80 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="overflow-auto max-h-170">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 border-b">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      <input
                        onChange={(e) =>
                          header.column.setFilterValue(e.target.value)
                        }
                        placeholder="Filter..."
                        className="mt-1 w-full border px-2 py-1 rounded text-xs"
                      />
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-6">
                    No data found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-blue-50`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2 border-b">
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
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between mt-4 items-center bg-white p-4 rounded-xl shadow">
        <div>
          Rows:
          <select
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            value={table.getState().pagination.pageSize}
            className="ml-2 border px-2 py-1 rounded"
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
      <div className="flex justify-end gap-4 mt-6">
        <div className="">
          <button
            onClick={downloadCountsWord}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700"
          >
            ⬇ Download Word
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
        {countFields.map((field) => (
          <div key={field} className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-2">{field}</h3>
            <div className="max-h-40 overflow-auto text-sm">
              {getCounts(field).map(([v, c]) => (
                <div key={v} className="flex justify-between border-b">
                  <span>{v}</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
