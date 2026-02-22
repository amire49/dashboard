export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
      
      {/* Status Badge */}
      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-2 mb-6">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
        <span className="text-green-400 text-sm font-medium">System Online</span>
      </div>

      {/* Title */}
      <h1 className="text-5xl font-bold text-white mb-2">ERAS Dashboard</h1>
      <p className="text-gray-400 text-lg mb-10">Emergency Report and Alert System</p>

      {/* Cards */}
      <div className="flex gap-4 mb-10">
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-8 py-6 text-center">
          <p className="text-green-400 text-2xl font-bold">✓ Alive</p>
          <p className="text-gray-500 text-sm mt-1">Dashboard</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-8 py-6 text-center">
          <p className="text-yellow-400 text-2xl font-bold">...</p>
          <p className="text-gray-500 text-sm mt-1">Backend</p>
        </div>
      </div>

      {/* Ping Button */}
      <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
        Ping Backend
      </button>

      <p className="text-gray-600 text-xs mt-10">ERAS — Adama Science and Technology University</p>
    </main>
  );
}