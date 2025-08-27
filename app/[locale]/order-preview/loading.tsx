import { Spinner } from "@/components/ui/spinner";

export default function OrderPreviewLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-2">
        <Spinner className="w-6 h-6" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
