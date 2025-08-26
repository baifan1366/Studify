import { Spinner } from "@/components/ui/spinner";

export default function PricingLoading() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-medium">Cat Photo Generator</h1>
        <p className="text-muted-foreground mt-2">Generate cat photos</p>
      </div>
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2">
          <Spinner className="w-6 h-6" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    </>
  );
}
