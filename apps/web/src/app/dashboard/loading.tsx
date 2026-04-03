export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-10 animate-pulse">
      <div className="space-y-3">
        <div className="h-3 w-32 rounded bg-white/10" />
        <div className="h-10 w-64 rounded bg-white/10" />
        <div className="h-4 max-w-md rounded bg-white/5" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/5 border border-white/10" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-3xl bg-white/5 border border-white/10" />
        <div className="h-72 rounded-3xl bg-white/5 border border-white/10" />
      </div>
      <div className="h-40 rounded-2xl bg-white/5 border border-white/10" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/5 border border-white/10" />
        ))}
      </div>
    </div>
  );
}
