import { useMemo, useRef, useEffect } from "react";
import { formatDisplayText } from "@/utils/helper";

const normalize = (str: string) =>
  str.toLowerCase().replace(/\s+/g, "");

export function useCounts(filteredRows: any[]) {
  const cacheRef = useRef<Map<string, any>>(new Map());

  // 🔥 clear cache when filtered data changes
  useEffect(() => {
    cacheRef.current.clear();
  }, [filteredRows]);

  // 🔥 preprocess rows (BIG performance boost)
  const preprocessedRows = useMemo(() => {
    return filteredRows.map((row) => {
      const map: Record<string, any> = {};

      for (const k in row.original) {
        map[normalize(k)] = row.original[k];
      }

      return map;
    });
  }, [filteredRows]);

  const getCounts = (key: string) => {
    const cacheKey = normalize(key);

    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey);
    }

    const counts: Record<
      string,
      { display: string; count: number }
    > = {};

    for (let i = 0; i < preprocessedRows.length; i++) {
      const rawValue = preprocessedRows[i][cacheKey];

      const value =
        rawValue && String(rawValue).trim() !== ""
          ? String(rawValue).trim()
          : "Unknown";

      const groupKey = value.toLowerCase();

      if (counts[groupKey]) {
        counts[groupKey].count++;
      } else {
        counts[groupKey] = {
          display: formatDisplayText(value),
          count: 1,
        };
      }
    }

    const result = Object.values(counts)
      .map(({ display, count }) => ({
        value: display,
        display,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    cacheRef.current.set(cacheKey, result);

    return result;
  };

  const getTotal = (key: string) => {
    const counts = getCounts(key);

    let total = 0;

    for (let i = 0; i < counts.length; i++) {
      const item = counts[i];

      if (
        item.display &&
        item.display.toLowerCase() !== "unknown"
      ) {
        total += item.count;
      }
    }

    return total;
  };

  return { getCounts, getTotal };
}