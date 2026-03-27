"use client";

import { useState } from "react";
import { mergeExcelFiles } from "./actions";
import DataTable from "./components/DataTable";

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [fileBase64, setFileBase64] = useState("");

  const handleMerge = async () => {
    if (!files.length) return;

    setLoading(true);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await mergeExcelFiles(formData);

    setLoading(false);

    if (res.success) {
      setData(res.data!);
      setFileBase64(res.file);
    } else {
      alert(res.message);
    }
  };

  const handleDownload = () => {
    if (!fileBase64) return;

    const link = document.createElement("a");
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${fileBase64}`;
    link.download = "merged.xlsx";
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Excel Merger
          </h1>
          <p className="text-gray-500 text-sm">
            Upload multiple Excel files, merge them, preview & download.
          </p>
        </div>

        {/* CARD */}
        <div className="bg-white rounded-2xl shadow p-6 border">
          {/* FILE UPLOAD */}
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-500 transition">
            <input
              type="file"
              multiple
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) =>
                setFiles(Array.from(e.target.files || []))
              }
            />

            <p className="text-gray-600 font-medium">
              Click to upload or drag & drop
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supports .xlsx, .xls
            </p>
          </label>

          {/* FILE LIST */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Selected Files:
              </p>

              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-gray-100 px-3 py-2 rounded-lg"
                >
                  <span className="text-sm text-gray-700">
                    {file.name}
                  </span>

                  <button
                    onClick={() =>
                      setFiles((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                    className="text-red-500 text-xs hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleMerge}
              disabled={loading || files.length === 0}
              className={`px-5 py-2 rounded-lg text-white font-medium transition ${
                loading || files.length === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Merging..." : "Merge Files"}
            </button>

            {data.length > 0 && (
              <button
                onClick={handleDownload}
                className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
              >
                Download Excel
              </button>
            )}
          </div>
        </div>

        {/* TABLE */}
        {data.length > 0 && (
          <div className="mt-8 bg-white p-4 rounded-2xl shadow border">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Preview Data
            </h2>

            <DataTable data={data} />
          </div>
        )}
      </div>
    </div>
  );
}