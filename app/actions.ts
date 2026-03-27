"use server";

import * as XLSX from "xlsx";

// 🔥 Normalize key
const normalize = (str: string) => str.replace(/\s|_/g, "").toLowerCase();

// 🔥 Column mapping (important)
const COLUMN_MAP: Record<string, string[]> = {
  name: ["name", "employee name"],
  designation: ["designation", "post"],
  district: ["district"],
  state: ["state"],
  mode: ["mode"],
  "course director": ["course director", "director"],
  "program name": ["program name", "program"],
  mission: ["mission"],
  remarks: ["remarks", "comment"],
};

// 🔥 Detect header + fix multiline rows
function parseSheet(sheet: XLSX.WorkSheet) {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  if (!rows.length) return [];

  // detect header
  let headerIndex = 0;
  let maxScore = 0;

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const score = rows[i].filter(
      (c) => typeof c === "string" && c.trim() !== "",
    ).length;

    if (score > maxScore) {
      maxScore = score;
      headerIndex = i;
    }
  }

  const rawHeaders = rows[headerIndex];

  const headers = rawHeaders.map((h: any) => normalize(String(h)));

  const dataRows = rows.slice(headerIndex + 1);

  const parsed: any[] = [];
  let lastRow: any = null;

  for (const row of dataRows) {
    const obj: any = {};

    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });

    const values = Object.values(obj).filter((v) => v !== "");

    if (values.length === 0) continue;

    // 🔥 multiline row fix
    if (values.length === 1 && lastRow) {
      const key = Object.keys(obj).find((k) => obj[k] !== "");
      if (key) {
        lastRow[key] = (lastRow[key] || "") + " " + obj[key];
      }
    } else {
      parsed.push(obj);
      lastRow = obj;
    }
  }

  return parsed;
}

// 🔥 Map row → required format
function mapRow(row: any) {
  const output: any = {
    "Sl no": "",
    Name: "",
    Designation: "",
    District: "",
    State: "",
    Mode: "",
    "Course director": "",
    "Program name": "",
    Mission: "",
    Remarks: "",
  };

  Object.entries(COLUMN_MAP).forEach(([target, possibleKeys]) => {
    for (const key of Object.keys(row)) {
      if (possibleKeys.includes(key)) {
        output[
          Object.keys(output).find((k) => normalize(k) === normalize(target))!
        ] = row[key];
      }
    }
  });

  return output;
}

export async function mergeExcelFiles(formData: FormData) {
  try {
    const files = formData.getAll("files") as File[];

    let allRows: any[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const wb = XLSX.read(buffer, { type: "buffer" });

      // 🔥 HANDLE MULTIPLE SHEETS
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];

        const parsed = parseSheet(sheet);

        if (parsed.length > 0) {
          allRows.push(...parsed);
        }
      }
    }

    // 🔥 Map to required structure
    let finalData = allRows.map(mapRow);

    // 🔥 Add serial number
    finalData = finalData.map((row, i) => ({
      "Sl no": i + 1,
      ...row,
    }));

    const ws = XLSX.utils.json_to_sheet(finalData);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Final");

    const buffer = XLSX.write(wb, {
      type: "buffer",
      bookType: "xlsx",
    });

    return {
      success: true,
      file: buffer.toString("base64"),
      data: finalData,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message,
    };
  }
}
