import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Success - Studify",
  description: "Order completed successfully",
  keywords: ["order success", "payment", "checkout", "education"],
  openGraph: {
    title: "Success - Studify",
    description: "Order completed successfully",
    type: "website",
  },
};

export default function SuccessPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-green-600 mb-2">
        Payment Successful!
      </h1>
    </div>
  );
}
