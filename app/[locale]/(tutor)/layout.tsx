import LayoutWrapper from "@/components/tutor/layout/layout-wrapper";

export default function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutWrapper>
      {children}
    </LayoutWrapper>
  );
}
