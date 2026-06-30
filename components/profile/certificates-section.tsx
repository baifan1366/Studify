"use client";

import { useEffect, useState } from "react";
import { Award, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Certificate = {
  public_id: string;
  issued_at: string;
  course: { title?: string } | null;
};

export function CertificatesSection() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch("/api/profile/certificates", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        if (active) setCertificates(data.certificates || []);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") toast.error("Could not load certificates");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  if (loading) {
    return <div className="mb-6 flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (!certificates.length) return null;

  const showTitle = async (certificateId: string) => {
    setSelecting(certificateId);
    const response = await fetch("/api/profile/certificates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificateId }),
    });
    setSelecting(null);
    response.ok ? toast.success("Community title updated") : toast.error("Could not update title");
  };

  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Award className="h-5 w-5 text-amber-500" /> Course certificates
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {certificates.map((certificate) => (
          <div key={certificate.public_id} className="rounded-lg border border-amber-200/70 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-950/20">
            <div className="font-medium">{certificate.course?.title || "Completed course"}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Issued {new Date(certificate.issued_at).toLocaleDateString()}
            </div>
            <Button className="mt-3" size="sm" variant="outline" onClick={() => showTitle(certificate.public_id)} disabled={selecting === certificate.public_id}>
              {selecting === certificate.public_id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Show title in community
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
