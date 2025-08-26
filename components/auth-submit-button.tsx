"use client";

import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";

export default function AuthSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" aria-disabled={pending}>
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}
