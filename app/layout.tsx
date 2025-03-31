import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Factory Distributing Station Simulation',
  description: 'A simulation of a factory distributing station with rotating arm and stacked magazine',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 