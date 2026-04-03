import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#070707] text-zinc-100">
      <main className="mx-auto flex max-w-lg flex-col gap-10 px-6 py-16">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
            RepeatOS · Web
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white swiss-bold sm:text-4xl">
            Frontend test hub
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Use these routes on your deployed Next.js URL (not the API host). The API only serves JSON
            and the widget bundle.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          <li>
            <Link
              href="/frontend"
              className="block rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Short route
              </span>
              <span className="mt-1 block text-base">/frontend → dashboard</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard"
              className="block rounded-2xl border border-white/10 px-5 py-4 text-sm font-semibold text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Direct
              </span>
              <span className="mt-1 block text-base">/dashboard</span>
            </Link>
          </li>
          <li>
            <Link
              href="/blisscafe"
              className="block rounded-2xl border border-white/10 px-5 py-4 text-sm font-semibold text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Sample hosted menu
              </span>
              <span className="mt-1 block text-base">/blisscafe (slug demo)</span>
            </Link>
          </li>
        </ul>
      </main>
    </div>
  );
}
