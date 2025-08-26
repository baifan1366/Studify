export default function Content({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-screen-lg py-6 px-6 w-full flex items-center justify-between mx-auto">
      {children}
    </div>
  );
}
