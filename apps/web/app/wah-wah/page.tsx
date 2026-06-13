import type { Metadata } from "next";
import Image from "next/image";
import { ConsolePanel, ConsoleHeading } from "@/components/console";
import UrlForm from "@/components/wah-wah/UrlForm";

export const metadata: Metadata = {
  title: "The Wah-Wah Detector — what does your homepage actually say?",
  description:
    "Paste your agency homepage and get your Wah-Wah Score: how much of your copy is the sound the adults make in Peanuts cartoons — and one line of what to say instead.",
};

function Header() {
  return (
    <div className="w-full border-b border-[#333333] bg-black py-4">
      <div className="container mx-auto flex items-center justify-center gap-4 px-4 md:gap-6">
        <div className="relative h-12 w-auto md:h-16">
          <Image
            src="/logos/DemandOS All-Caps Logo in WHITE and Red.png"
            alt="DemandOS"
            width={120}
            height={120}
            className="h-full w-auto object-contain"
          />
        </div>
        <div className="h-8 w-px bg-[#333333] md:h-12" />
        <span className="font-anton uppercase tracking-wide text-xl text-[#FFDE59] md:text-2xl">
          Wah-Wah Detector
        </span>
      </div>
    </div>
  );
}

export default function WahWahPage() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-4 py-16 text-center">
        <p className="font-anton uppercase tracking-widest text-[#B3B3B3] text-sm">
          The Wah-Wah Detector
        </p>
        <ConsoleHeading level={1} className="leading-tight normal-case">
          Your homepage is probably going wah wah, wah wah wah.
        </ConsoleHeading>
        <p className="max-w-xl font-poppins text-lg text-[#B3B3B3]">
          That is the sound the adults make in Peanuts cartoons, and it is the sound a
          prospect hears when they read &ldquo;results-driven,&rdquo;
          &ldquo;full-service,&rdquo; and &ldquo;an extension of your team.&rdquo; Those
          words feel safe, and they say nothing. Paste your URL and find out how much of
          your homepage is pure wah-wah.
        </p>
        <ConsolePanel className="w-full">
          <UrlForm />
        </ConsolePanel>
        <p className="font-poppins text-sm text-[#808080]">
          Free, takes 30 seconds, and the robot does not go easy on anyone. Built by{" "}
          <a href="https://timkilroy.com" className="text-[#FFDE59] underline">
            Tim Kilroy
          </a>
          , who has read more agency homepages than any human should and can hum most of
          them from memory.
        </p>
      </main>
    </div>
  );
}
