"use client";

import { useRouter, useSearchParams } from "next/navigation";

const options = [
  { value: "createdAt_desc", label: "Recently Created" },
  { value: "name_asc", label: "Name (A–Z)" },
  { value: "name_desc", label: "Name (Z–A)" },
  { value: "resort_asc", label: "Location (A–Z)" },
  { value: "resort_desc", label: "Location (Z–A)" },
];

export function SortSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "createdAt_desc";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    router.replace(`/dashboard?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
