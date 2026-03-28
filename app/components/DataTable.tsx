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
import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
} from "docx";
import { saveAs } from "file-saver";

type Props = {
  data: any[];
  fileBase64: string;
};

export default function DataTable({ data, fileBase64 }: Props) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<any[]>([]);
  const [columnFilters, setColumnFilters] = useState<any[]>([]);

  // =====================
  // 🔥 CLEAN DATA
  // =====================
  function cleanValueByKey(key: string, value: any) {
    if (!value) return "";

    let str = String(value).trim();

    // if (key === "Designation") {
    //   return str.toUpperCase().replace(/\./g, "").replace(/\s+/g, "");
    // }

    if (key === "State" || key === "District") {
      return str.toLowerCase().replace(/\s+/g, " ").trim();
    }

    return str;
  }

  const cleanedData = useMemo(() => {
    return data.map((row) => {
      const newRow: any = {};
      Object.keys(row).forEach((key) => {
        newRow[key] = cleanValueByKey(key, row[key]);
      });
      return newRow;
    });
  }, [data]);

  // =====================
  // 🔥 COLUMNS
  // =====================
  const columns: ColumnDef<any>[] = useMemo(() => {
    return Object.keys(cleanedData[0] || {}).map((key) => ({
      accessorKey: key,

      header: ({ column }) => (
        <div className="flex flex-col gap-1">
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-semibold text-left hover:text-blue-600"
          >
            {key}
            {column.getIsSorted() === "asc" && " 🔼"}
            {column.getIsSorted() === "desc" && " 🔽"}
          </button>

          <input
            value={(column.getFilterValue() as string) ?? ""}
            onChange={(e) => column.setFilterValue(e.target.value)}
            placeholder="Search..."
            className="border px-2 py-1 text-xs rounded focus:ring-1 focus:ring-blue-500"
          />
        </div>
      ),

      cell: (info) => info.getValue() || "-",
    }));
  }, [cleanedData]); // 🔥 important

  // =====================
  // 🔥 TABLE
  // =====================
  const table = useReactTable({
    data: cleanedData,
    columns,
    state: {
      globalFilter,
      sorting,
      columnFilters,
    },
    onGlobalFilterChange: (val) => {
      setGlobalFilter(val);
      table.setPageIndex(0);
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),

    autoResetPageIndex: false,
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  const filteredRows = table.getFilteredRowModel().rows;

  // =====================
  // 🔥 PAGINATION
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

  useEffect(() => {
    table.setPageIndex(0);
  }, [globalFilter, columnFilters]);

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

    return Object.entries(counts)
      .map(([value, count]) => ({
        value,
        display: value,
        count,
      }))
      .sort((a, b) => b.count - a.count);
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
    const wb = XLSX.utils.book_new();

    countFields.forEach((field) => {
      const data = getCounts(field).map(({ display, count }) => ({
        Value: display,
        Count: count,
      }));

      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, sheet, field);
    });

    XLSX.writeFile(wb, "counts.xlsx");
  }

  // =====================
  // 🔥 DOWNLOAD WORD
  // =====================
  async function downloadCountsWord() {
    const children: any[] = [];

    countFields.forEach((field) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: field, bold: true })],
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

      getCounts(field).forEach(({ display, count }) => {
        rows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph(display)],
              }),
              new TableCell({
                children: [new Paragraph(String(count))],
              }),
            ],
          }),
        );
      });

      children.push(new Table({ rows }));
    });

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "counts.docx");
  }

  const handleDownload = () => {
    if (!fileBase64) return;

    const link = document.createElement("a");
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${fileBase64}`;
    link.download = "merged.xlsx";
    link.click();
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📊 Data Dashboard</h1>

        <button
          onClick={handleDownload}
          className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
        >
          Download Excel
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-y-auto max-h-125">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 border-b text-left">
                      {flexRender(h.column.columnDef.header, h.getContext())}
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
      <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4 bg-white p-4 rounded-xl shadow">
        {/* LEFT: ROWS PER PAGE */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Rows per page:</span>

          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="border px-2 py-1 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* CENTER: PAGE INFO */}
        <div className="text-sm text-gray-600">
          Page{" "}
          <span className="font-semibold text-gray-800">{pageIndex + 1}</span>{" "}
          of <span className="font-semibold text-gray-800">{pageCount}</span>
        </div>

        {/* RIGHT: CONTROLS */}
        <div className="flex gap-2">
          <button
            onClick={safeFirst}
            disabled={pageIndex === 0}
            className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            ⏮
          </button>

          <button
            onClick={safePrev}
            disabled={pageIndex === 0}
            className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            Prev
          </button>

          <button
            onClick={safeNext}
            disabled={pageIndex >= pageCount - 1}
            className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            Next
          </button>

          <button
            onClick={safeLast}
            disabled={pageIndex >= pageCount - 1}
            className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            ⏭
          </button>
        </div>
      </div>

      {/* COUNTS */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4 my-8">
        <h1 className="text-2xl font-bold text-gray-800">📊 Data Counts</h1>
        {/* BUTTONS */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* <button
            onClick={downloadCountsExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-xl shadow hover:bg-green-700"
          >
            ⬇ Excel
          </button> */}

          <button
            onClick={downloadCountsWord}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700"
          >
            ⬇ Word
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
        {countFields.map((field) => (
          <div key={field} className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-2">{field}</h3>

            <div className="max-h-40 overflow-auto text-sm">
              {getCounts(field).map(({ value, count }) => (
                <div key={value} className="flex justify-between border-b">
                  <span>{value}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
