import type { Metadata } from "next";
import { Inter, Anton, Poppins } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { Footer } from "@/components/Footer";
import { GlobalHeaderWrapper } from "@/components/navigation/GlobalHeaderWrapper";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
// Anton + Poppins are decorative/heading faces used only on specific pages.
// Preloading them globally (next/font default) emits <link rel=preload as=font>
// on every page — including ones that never render them — which Chrome flags as
// "preloaded but not used". They still load on demand (display: swap) where used.
const anton = Anton({
  weight: '400',
  subsets: ["latin"],
  variable: '--font-anton',
  preload: false,
});
const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
  variable: '--font-poppins',
  preload: false,
});

export const metadata: Metadata = {
  title: "SalesOS Intelligence Tools Dashboard | TimKilroy.com",
  description: "Access your SalesOS workspace with Discovery Lab, Call Lab and performance tools for smarter sales research, better calls and more wins in one central app.",
  icons: {
    icon: '/logos/favicon.png',
    shortcut: '/logos/favicon.png',
    apple: '/logos/favicon.png',
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
        <Script id="gtm-script" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5T985Z8');`}
        </Script>
      </head>
      <body className={`${inter.className} ${anton.variable} ${poppins.variable} min-h-screen flex flex-col`}>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5T985Z8"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <GlobalHeaderWrapper />
        <div className="flex-1">
          {children}
        </div>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
