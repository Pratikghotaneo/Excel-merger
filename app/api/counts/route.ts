import { NextRequest } from "next/server";

const normalize = (str: string) =>
  str.toLowerCase().replace(/\s+/g, "");

export async function POST(req: NextRequest) {
  try {
    const { rows, fields } = await req.json();

    const result: Record<string, any> = {};

    // 🔥 init
    fields.forEach((field: string) => {
      result[field] = {
        counts: {},
        total: 0,
      };
    });

    // 🚀 SINGLE LOOP (FAST)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      for (let f = 0; f < fields.length; f++) {
        const field = fields[f];
        const normalizedField = normalize(field);

        let rawValue: any = null;

        for (const k in row) {
          if (normalize(k) === normalizedField) {
            rawValue = row[k];
            break;
          }
        }

        const value =
          rawValue && String(rawValue).trim() !== ""
            ? String(rawValue).trim()
            : "Unknown";

        const key = value.toLowerCase();

        if (!result[field].counts[key]) {
          result[field].counts[key] = {
            display: value,
            count: 0,
          };
        }

        result[field].counts[key].count++;

        if (key !== "unknown") {
          result[field].total++;
        }
      }
    }

    // 🔥 sort results
    fields.forEach((field: string) => {
      result[field].counts = Object.values(result[field].counts).sort(
        (a: any, b: any) => b.count - a.count
      );
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}