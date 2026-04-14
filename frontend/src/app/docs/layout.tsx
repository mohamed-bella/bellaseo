export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full overflow-y-auto bg-white overflow-x-hidden">
      {children}
    </div>
  );
}
