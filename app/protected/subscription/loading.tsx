import { Spinner } from "@/components/ui/spinner";

export default function PricingLoading() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-medium">Subscriptions</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription plans
          </p>
        </div>
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
