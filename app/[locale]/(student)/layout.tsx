import LayoutWrapper from "@/components/student/layout/layout-wrapper";

export default async function StudentLayout({
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
