"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/utils/styles";

type Data = {
  url: string;
};

export default function PaidContentCard({ className }: { className?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<Data | null>(null);

  async function handleRegenerate() {
    setIsLoading(true);
    const response = await fetch("/api/generator", {
      method: "POST",
      body: JSON.stringify({
        prompt: "A meme about a cat",
      }),
    });
    const data = await response.json();
    setData(data[0]);
    setIsLoading(false);
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <h2 className="font-medium">Subscription based, unlimited cat photos</h2>
      <p className="text-muted-foreground">Create unlimited cat photos.</p>
      <Button className="mt-4" onClick={handleRegenerate} disabled={isLoading}>
        <Spinner variant="primary" isLoading={isLoading} />
        {isLoading ? "Generating..." : "Generate Cat Photo"}
      </Button>
      {data && (
        <picture>
          <img
            src={data.url}
            alt="meme"
            className="mt-8 w-full object-contain h-[500px]"
          />
        </picture>
      )}
    </Card>
  );
}
