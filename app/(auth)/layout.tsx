import Content from "@/components/content";

export default function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Content>{children}</Content>;
}
