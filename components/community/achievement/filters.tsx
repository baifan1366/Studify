"use client";
import React from "react";

interface FiltersProps {
  filter: string;
  setFilter: (filter: string) => void;
}

export default function Filters({ filter, setFilter }: FiltersProps) {
  return (
    <div className="mb-6 flex border-b border-gray-200">
      {["all", "unlocked", "locked"].map((f) => (
        <button
          key={f}
          onClick={() => setFilter(f)}
          className={`px-4 py-2 text-sm font-medium ${
            filter === f
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </div>
  );
}
