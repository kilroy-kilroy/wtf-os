import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] bg-black flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <p className="font-anton text-[120px] leading-none text-[#E51B23] mb-2">404</p>
        <h1 className="font-anton text-3xl uppercase text-white mb-4">
          Page Not Found
        </h1>
        <p className="text-[#999] font-poppins mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="font-anton text-sm uppercase bg-[#E51B23] text-white px-6 py-3 rounded hover:bg-[#C41820] transition"
          >
            GO HOME
          </Link>
          <Link
            href="/dashboard"
            className="font-anton text-sm uppercase border border-[#333] text-[#B3B3B3] px-6 py-3 rounded hover:border-[#FFDE59] hover:text-[#FFDE59] transition"
          >
            DASHBOARD
          </Link>
        </div>
      </div>
    </div>
  );
}
