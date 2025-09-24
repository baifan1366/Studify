export default async function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center bg-[#F8F9FF]">
        {children}
      </main>
    </div>
  );
}
