import StoreShell from "@/app/components/StoreShell"

export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <StoreShell>{children}</StoreShell>
}
