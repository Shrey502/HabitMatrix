import './globals.css'
import Sidebar from '../components/Sidebar'
import CinematicBackground from '../components/CinematicBackground'
import FocusDeck from '../components/FocusDeck'
import { Providers } from '../components/Providers'
import { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 flex h-screen relative overflow-hidden">
        <Providers>
          <CinematicBackground />
          <Sidebar />
          <main className="flex-1 p-8 overflow-y-auto z-10 relative">
            {children}
          </main>
          <FocusDeck />
        </Providers>
      </body>
    </html>
  )
}