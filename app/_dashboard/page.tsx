"use client";

import { useEffect, useState } from "react";
import Charts from "../components/Charts";

export default function DashboardPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("mergedData");
    if (stored) {
      setData(JSON.parse(stored));
    }
  }, []);

  if (!data.length) {
    return <p className="p-6">No data found. Upload first.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold p-6">Dashboard</h1>
      <Charts data={data} />
    </div>
  );
}
