import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StructuredData from "./structured-data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cambria Portal - Client Management Dashboard",
    template: "%s | Cambria Portal"
  },
  description: "Cambria Portal - Professional client management and performance monitoring dashboard. Manage your client portfolio, track ACOS and TACOS goals, and streamline your business operations.",
  keywords: [
    "Cambria",
    "client management",
    "dashboard",
    "ACOS",
    "TACOS",
    "performance monitoring",
    "business operations",
    "client portfolio"
  ],
  authors: [{ name: "Cambria Team" }],
  creator: "Cambria",
  publisher: "Cambria",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://cambria-admin-portal.onrender.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://cambria-admin-portal.onrender.com',
    title: 'Cambria Portal - Client Management Dashboard',
    description: 'Professional client management and performance monitoring dashboard for streamlined business operations.',
    siteName: 'Cambria Portal',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Cambria Portal Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cambria Portal - Client Management Dashboard',
    description: 'Professional client management and performance monitoring dashboard.',
    images: ['/og-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="msapplication-TileColor" content="#3B82F6" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StructuredData />
        {children}
      </body>
    </html>
  );
}
