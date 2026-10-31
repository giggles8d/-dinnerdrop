import Nav from '@/components/Nav'
import NativeShell from '@/components/NativeShell'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Nav />
      {children}
      <NativeShell />
    </>
  )
}
