import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import Layout from '@/components/Layout/Layout'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EstatePro - Modern Real Estate Platform',
  description: 'Discover amazing properties with interactive 3D tours and virtual walkthroughs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <Layout>
                {children}
              </Layout>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
