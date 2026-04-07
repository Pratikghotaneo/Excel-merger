import { useQuery } from "@tanstack/react-query";

export function useCountsApi(rows: any[], fields: string[]) {
  return useQuery({
    queryKey: ["counts", rows.length], // simple key
    queryFn: async () => {
      const res = await fetch("/api/counts", {
        method: "POST",
        body: JSON.stringify({
          rows,
          fields,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      return res.json();
    },
    enabled: rows.length > 0,
  });
}