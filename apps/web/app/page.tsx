export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-bold text-white">
          WTF Growth OS
        </h1>
        <p className="text-xl text-slate-300">
          Phase 1: Call Lab
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <a
            href="/call-lab"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Try Call Lab Lite
          </a>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
