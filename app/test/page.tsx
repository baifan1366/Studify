// app/test/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

export default function TestPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["todos"],
    queryFn: () =>
      fetch("https://jsonplaceholder.typicode.com/todos?_limit=5").then((res) =>
        res.json()
      ),
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error loading todos</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Todos (React Query Test)</h1>
      <ul className="space-y-2">
        {data.map((todo: Todo) => (
          <li key={todo.id} className="rounded-md border p-2">
            <span className={todo.completed ? "line-through" : ""}>
              {todo.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
