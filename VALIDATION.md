
# Using `@/lib/validation/profileSchema.ts` with Zod & React Hook Form

This guide explains **how to apply** the `profileSchema` in a **Next.js + TypeScript** project using **Zod** and **React Hook Form** for form validation.

---

## **1. Create the Schema**

Create a schema file at:  
`@/lib/validation/profileSchema.ts`

```ts
import { z } from "zod";

export const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username cannot exceed 20 characters"),
  email: z.string().email("Invalid email"),
  bio: z.string().max(200, "Bio can't be longer than 200 characters").optional(),
  age: z
    .number()
    .min(13, "You must be at least 13 years old")
    .optional(),
});

export type ProfileSchema = z.infer<typeof profileSchema>;
```

---

## **2. Apply the Schema in React Hook Form**

In your **form component** or **profile page**, integrate the schema using `zodResolver`.

### Example: `app/(dashboard)/profile/page.tsx`

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, ProfileSchema } from "@/lib/validation/profileSchema";

export default function ProfilePage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema), // ✅ Apply schema here
    mode: "onBlur",
  });

  const onSubmit = async (data: ProfileSchema) => {
    console.log("Validated data:", data);

    const res = await fetch("/api/profile", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error("Failed to update profile");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 max-w-md mx-auto">
      {/* Username */}
      <div>
        <label>Username</label>
        <input {...register("username")} className="border p-2 w-full rounded" />
        {errors.username && <p className="text-red-500">{errors.username.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label>Email</label>
        <input {...register("email")} className="border p-2 w-full rounded" />
        {errors.email && <p className="text-red-500">{errors.email.message}</p>}
      </div>

      {/* Bio */}
      <div>
        <label>Bio</label>
        <textarea {...register("bio")} className="border p-2 w-full rounded" />
        {errors.bio && <p className="text-red-500">{errors.bio.message}</p>}
      </div>

      {/* Age */}
      <div>
        <label>Age</label>
        <input
          type="number"
          {...register("age", { valueAsNumber: true })}
          className="border p-2 w-full rounded"
        />
        {errors.age && <p className="text-red-500">{errors.age.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {isSubmitting ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}
```

---

## **3. Apply Schema on the API Side (Optional but Recommended)**

Even though the client validates, you should **also validate on the server** for security.

### Example: `app/api/profile/route.ts`

```ts
import { NextResponse } from "next/server";
import { profileSchema } from "@/lib/validation/profileSchema";

export async function POST(req: Request) {
  const body = await req.json();
  const result = profileSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Example: Update database or Supabase
  // await db.user.update(...)

  return NextResponse.json({ success: true, data: result.data });
}
```

---

## **4. Where to Place the Schema**

| **Location**                     | **Purpose**                     | **Example** |
|----------------------------------|---------------------------------|-------------|
| `@/lib/validation/profileSchema.ts` | Centralized schema definition   | ✅ Store rules here |
| Form component / page           | Apply schema in `useForm`       | `resolver: zodResolver(profileSchema)` |
| API route                      | Reuse schema for server validation | `profileSchema.safeParse(body)` |

This ensures you **reuse the same schema everywhere** without duplicating logic.

---

## **5. Summary**

- **Create schema** in `@/lib/validation/profileSchema.ts`.
- **Use schema** in React Hook Form via `zodResolver`.
- **Revalidate on the server** using `safeParse`.
- Keeps validation **centralized**, **consistent**, and **type-safe**.

---

## **Next Steps**

- Integrate `setError` from React Hook Form for better API error handling.
- Extend `profileSchema` later with **password**, **profile image**, or other fields.
