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
import { useDebounce } from "use-debounce";
import * as XLSX from "xlsx";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import { useCountsApi } from "@/hooks/useCountApi";

type Props = {
  data: any[];
  fileBase64: string;
};

export default function DataTable({ data, fileBase64 }: Props) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<any[]>([]);
  const [columnFilters, setColumnFilters] = useState<any[]>([]);

  // ✅ DEBOUNCE (BIG PERFORMANCE BOOST)
  const [debouncedFilter] = useDebounce(globalFilter, 300);

  // =====================
  // 🔥 CLEAN DATA
  // =====================
  function cleanValueByKey(key: string, value: any) {
    if (!value) return "";

    let str = String(value).trim();

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
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
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
            className="border px-2 py-1 text-xs rounded"
          />
        </div>
      ),

      cell: (info) => info.getValue() || "-",
    }));
  }, [cleanedData]);

  // =====================
  // 🔥 TABLE
  // =====================
  const table = useReactTable({
    data: cleanedData,
    columns,
    state: {
      globalFilter: debouncedFilter, // ✅ use debounced value
      sorting,
      columnFilters,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),

    autoResetPageIndex: false,
  });

  const filteredRows = table.getFilteredRowModel().rows;

  // =====================
  // 🔥 FIELDS
  // =====================
  const countFields = [
    "District",
    "State",
    "Designation",
    "Mission",
    "Program name",
    "Mode",
  ];

  // =====================
  // 🚀 API COUNTS
  // =====================
  const { data: countsMap, isLoading } = useCountsApi(
    filteredRows.map((r) => r.original),
    countFields
  );

  // =====================
  // 🔥 PAGINATION
  // =====================
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  useEffect(() => {
    table.setPageIndex(0);
  }, [debouncedFilter, columnFilters]);

  // =====================
  // 🔥 DOWNLOAD WORD
  // =====================
 async function downloadCountsWord() {
  if (!countsMap) return;

  const children: any[] = [];

  countFields.forEach((field) => {
    const data = countsMap[field];

    // 🔤 SORT ALPHABETICALLY
    const sortedCounts = [...data.counts].sort((a, b) =>
      (a.display || "").localeCompare(b.display || "", undefined, {
        sensitivity: "base",
      })
    );

    // 🔠 TITLE CASE (ALL WORDS CAPITAL)
    const toTitleCase = (str: string) => {
      if (!str) return "Unknown";
      return str
        .toLowerCase()
        .split(" ")
        .map((word) =>
          word ? word.charAt(0).toUpperCase() + word.slice(1) : ""
        )
        .join(" ");
    };

    // 🔥 SECTION TITLE
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: field,
            bold: true,
            size: 28,
          }),
        ],
      })
    );

    // 🔥 TABLE ROWS
    const rows: TableRow[] = [
      // ✅ HEADER
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Value", bold: true })],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Count", bold: true })],
              }),
            ],
          }),
        ],
      }),

      // 🔥 TOTAL ROW (TOP)
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "TOTAL", bold: true })],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(data.total),
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ];

    // 🔥 DATA ROWS (SORTED + TITLE CASE)
    sortedCounts.forEach((item: any) => {
      const displayText =
        item.display && item.display.trim() !== ""
          ? toTitleCase(item.display)
          : "Unknown";

      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(displayText)],
            }),
            new TableCell({
              children: [new Paragraph(String(item.count))],
            }),
          ],
        })
      );
    });

    // 🔥 TABLE
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows,
      })
    );

    // 🔥 SPACING
    children.push(
      new Paragraph({
        text: "",
        spacing: { after: 300 },
      })
    );
  });

  // 🔥 DOCUMENT
  const doc = new Document({
    sections: [{ children }],
  });

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
  <div className="p-6 bg-gray-50 min-h-screen">
    {/* HEADER */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <h1 className="text-2xl font-bold text-gray-800">
        📊 Data Dashboard
      </h1>

      <button
        onClick={handleDownload}
        className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
      >
        ⬇ Download Excel
      </button>
    </div>

    {/* TABLE CARD */}
    <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
      <div className="overflow-auto max-h-[500px]">
        <table className="min-w-full text-sm">
          {/* HEADER */}
          <thead className="bg-gray-100 sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-4 py-3 text-left font-semibold text-gray-700 border-b"
                  >
                    {flexRender(
                      h.column.columnDef.header,
                      h.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* BODY */}
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getAllColumns().length}
                  className="text-center py-8 text-gray-500"
                >
                  No data found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } hover:bg-blue-50 transition`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-2 border-b text-gray-700"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
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
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-3 bg-gray-50 border-t">
        {/* LEFT */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Rows per page:</span>

          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) =>
              table.setPageSize(Number(e.target.value))
            }
            className="border px-2 py-1 rounded-md"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* CENTER */}
        <div className="text-sm text-gray-600">
          Page{" "}
          <span className="font-semibold text-gray-800">
            {table.getState().pagination.pageIndex + 1}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-gray-800">
            {table.getPageCount()}
          </span>
        </div>

        {/* RIGHT */}
        <div className="flex gap-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            ⏮
          </button>

          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            Prev
          </button>

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            Next
          </button>

          <button
            onClick={() =>
              table.setPageIndex(table.getPageCount() - 1)
            }
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>

    {/* COUNTS */}
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
         <h2 className="text-xl font-bold text-gray-800 mb-4">
        📊 Data Insights
      </h2>

      
  

    {/* Word */}
    <button
      onClick={downloadCountsWord}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
    >
      ⬇ Word
    </button>
    </div>


     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
  {isLoading && (
    <p className="text-gray-500">Loading...</p>
  )}

  {countsMap &&
    countFields.map((field) => {
      const data = countsMap[field];

      // 🔤 SORT ALPHABETICALLY
      const sortedCounts = [...data.counts].sort((a, b) =>
        (a.display || "").localeCompare(b.display || "", undefined, {
          sensitivity: "base",
        })
      );

      // 🔠 TITLE CASE
      const toTitleCase = (str: string) => {
        if (!str) return "Unknown";
        return str
          .toLowerCase()
          .split(" ")
          .map((word) =>
            word ? word.charAt(0).toUpperCase() + word.slice(1) : ""
          )
          .join(" ");
      };

      return (
        <div
          key={field}
          className="bg-white rounded-xl shadow p-4 border hover:shadow-md transition"
        >
          <h3 className="font-semibold text-gray-700 mb-2">
            {field}
          </h3>

          <div className="max-h-40 overflow-auto text-sm">
            {sortedCounts.slice(0, 20).map((item: any) => (
              <div
                key={item.display}
                className="flex justify-between border-b py-1"
              >
                <span className="text-gray-600">
                  {item.display && item.display.trim() !== ""
                    ? toTitleCase(item.display)
                    : "Unknown"}
                </span>
                <span className="font-medium">
                  {item.count}
                </span>
              </div>
            ))}

            <div className="flex justify-between font-bold mt-2 text-blue-600">
              <span>Total</span>
              <span>{data.total}</span>
            </div>
          </div>
        </div>
      );
    })}
</div>
    </div>
  </div>
);
}