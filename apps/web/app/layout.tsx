import type { Metadata } from "next";
import { Inter, Anton, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const anton = Anton({
  weight: '400',
  subsets: ["latin"],
  variable: '--font-anton'
});
const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
  variable: '--font-poppins'
});

export const metadata: Metadata = {
  title: "WTF Growth OS - Call Lab",
  description: "Sales call diagnostic and coaching platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${anton.variable} ${poppins.variable}`}>{children}</body>
    </html>
  );
}
