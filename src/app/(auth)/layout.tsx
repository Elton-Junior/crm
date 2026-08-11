import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-4">
        <Link href="/" className="text-sm font-medium">
          CRM
        </Link>
      </header>
      {children}
    </div>
  );
}
