import Image from 'next/image';
import Link from 'next/link';

interface ToolPageHeaderProps {
  osLogoSrc: string;
  osLogoAlt: string;
  toolLogoSrc: string;
  toolLogoAlt: string;
  osLogoWidth?: number;
  osLogoHeight?: number;
  toolLogoWidth?: number;
  toolLogoHeight?: number;
}

export function ToolPageHeader({
  osLogoSrc,
  osLogoAlt,
  toolLogoSrc,
  toolLogoAlt,
  osLogoWidth = 120,
  osLogoHeight = 120,
  toolLogoWidth = 120,
  toolLogoHeight = 120,
}: ToolPageHeaderProps) {
  return (
    <div className="w-full bg-black border-b border-[#333333] py-4">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-4 md:gap-6">
          {/* OS Logo */}
          <div className="relative h-12 w-auto md:h-16">
            <Image
              src={osLogoSrc}
              alt={osLogoAlt}
              width={osLogoWidth}
              height={osLogoHeight}
              className="h-full w-auto object-contain"
            />
          </div>

          {/* Separator */}
          <div className="h-8 w-px bg-[#333333] md:h-12" />

          {/* Tool Logo */}
          <div className="relative h-12 w-auto md:h-16">
            <Image
              src={toolLogoSrc}
              alt={toolLogoAlt}
              width={toolLogoWidth}
              height={toolLogoHeight}
              className="h-full w-auto object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
