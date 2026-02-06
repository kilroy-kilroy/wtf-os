import Link from 'next/link';
import { Globe, Linkedin, Instagram, Youtube, Newspaper, Mail } from 'lucide-react';

export function Footer() {
  const socialLinks = [
    { href: 'https://timkilroy.com', icon: Globe, label: 'Website' },
    { href: 'https://linkedin.com/in/timkilroy', icon: Linkedin, label: 'LinkedIn' },
    { href: 'https://instagram.com/timkilroy', icon: Instagram, label: 'Instagram' },
    { href: 'https://youtube.com/@agencygrowthcoach', icon: Youtube, label: 'YouTube' },
    { href: 'https://agencyinnercircle.com', icon: Newspaper, label: 'Newsletter' },
    { href: 'https://timkilroy.com/contact', icon: Mail, label: 'Contact' },
  ];

  return (
    <footer className="w-full border-t border-[#333333] bg-black mt-auto">
      <div className="container mx-auto px-4 py-8">
        {/* Social Icons */}
        <div className="flex justify-center items-center gap-6 mb-4">
          {socialLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#666666] hover:text-[#FFDE59] transition-colors duration-200"
              aria-label={link.label}
            >
              <link.icon size={20} strokeWidth={1.5} />
            </Link>
          ))}
        </div>

        {/* Copyright and Privacy */}
        <div className="text-center text-[13px] text-[#666666] space-y-2">
          <p>Copyright © 2018–2026 KLRY, LLC. All rights reserved.</p>
          <div>
            <Link
              href="/privacy"
              className="hover:text-[#FFDE59] transition-colors duration-200"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
