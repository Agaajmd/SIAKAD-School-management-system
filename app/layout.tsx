import type React from "react"
import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { Providers } from "@/components/providers"
import "./globals.css"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  metadataBase: new URL('https://school-management.app'),
  title: {
    default: "School Management - Sistem Manajemen Sekolah Digital #1 Indonesia",
    template: "%s | School Management"
  },
  description: "Sistem manajemen sekolah terbaik di Indonesia untuk mengelola akademik, siswa, guru, dan administrasi sekolah. Platform all-in-one dengan fitur e-learning, absensi digital, rapor online, dan laporan real-time. Gratis untuk 30 hari!",
  keywords: [
    "sistem manajemen sekolah",
    "school management system",
    "aplikasi sekolah indonesia",
    "e-learning indonesia",
    "absensi siswa online",
    "rapor digital sekolah",
    "manajemen akademik sekolah",
    "sistem informasi sekolah",
    "software sekolah terbaik",
    "aplikasi pendidikan",
    "SIS sekolah",
    "learning management system",
    "aplikasi guru",
    "portal siswa online",
    "administrasi sekolah digital"
  ],
  authors: [{ name: "School Management Team", url: "https://school-management.app" }],
  creator: "School Management",
  publisher: "School Management",
  category: "Education",
  classification: "Education Management Software",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://school-management.app",
    siteName: "School Management",
    title: "School Management - Sistem Manajemen Sekolah Digital #1 Indonesia",
    description: "Platform all-in-one untuk mengelola akademik, siswa, guru, dan administrasi sekolah dengan mudah dan efisien. Gratis 30 hari!",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "School Management System - Sistem Manajemen Sekolah Digital"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    site: "@schoolmanagement",
    creator: "@schoolmanagement",
    title: "School Management - Sistem Manajemen Sekolah Digital #1",
    description: "Platform all-in-one untuk mengelola akademik, siswa, guru, dan administrasi sekolah.",
    images: ["/og-image.png"]
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: [
      { url: "/apple-icon.png" },
      { url: "/apple-icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://school-management.app",
    languages: {
      'id-ID': 'https://school-management.app',
      'en-US': 'https://school-management.app/en',
    },
  },
  other: {
    "google-site-verification": "your-google-verification-code",
    "msvalidate.01": "your-bing-verification-code",
    "facebook-domain-verification": "your-facebook-verification-code",
  },
}

export const viewport: Viewport = {
  themeColor: "#c4b5fd",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "School Management",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "IDR"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "1250"
    },
    "description": "Sistem manajemen sekolah terbaik di Indonesia untuk mengelola akademik, siswa, guru, dan administrasi sekolah."
  }

  return (
    <html lang="id">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${plusJakartaSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen liquid-glass-bg`}
        vaul-drawer-wrapper=""
      >
        <Providers>
          {children}
        </Providers>
        <Toaster 
          position="top-center" 
          richColors 
          closeButton
          expand={false}
          gap={12}
          visibleToasts={3}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: "w-full max-w-md flex items-center gap-3 p-4 rounded-2xl shadow-xl border bg-white toast-enter",
              title: "text-sm font-semibold text-slate-800",
              description: "text-xs text-slate-500",
              actionButton: "bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200",
              cancelButton: "bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200",
              closeButton: "bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full p-1 transition-all duration-200 border-0 hover:scale-110",
              success: "!bg-gradient-to-r !from-emerald-50 !to-green-50 !border-emerald-200 !text-emerald-800 [&>div>svg]:!text-emerald-500",
              error: "!bg-gradient-to-r !from-red-50 !to-rose-50 !border-red-200 !text-red-800 [&>div>svg]:!text-red-500",
              warning: "!bg-gradient-to-r !from-amber-50 !to-yellow-50 !border-amber-200 !text-amber-800 [&>div>svg]:!text-amber-500",
              info: "!bg-gradient-to-r !from-blue-50 !to-cyan-50 !border-blue-200 !text-blue-800 [&>div>svg]:!text-blue-500",
            },
            duration: 2000,
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
