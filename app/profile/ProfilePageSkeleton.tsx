function SkeletonLine({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-slate-200/80 ${className}`} />;
}

export function ProfilePageSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-100" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading profile overview.</span>

      <div className="hidden w-72 shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-linear-to-b from-stone-100 via-white to-slate-100 lg:flex">
        <div className="border-b border-slate-200/80 p-4">
          <div className="rounded-[28px] border border-slate-200 bg-white/90 p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-3xl bg-slate-200/80" />
              <div className="flex-1 space-y-2">
                <SkeletonLine className="h-4 w-32" />
                <SkeletonLine className="h-3 w-24" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="rounded-[28px] bg-linear-to-r from-slate-900 to-slate-700 p-4">
            <SkeletonLine className="h-4 w-36 bg-white/35" />
            <SkeletonLine className="mt-3 h-3 w-full bg-white/25" />
            <SkeletonLine className="mt-2 h-3 w-4/5 bg-white/25" />
          </div>

          {[0, 1, 2].map((section) => (
            <div key={`profile-sidebar-skeleton-${section}`} className="rounded-[28px] border border-slate-200 bg-white/90 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-3xl bg-slate-200/80" />
                <SkeletonLine className="h-4 w-28" />
              </div>
              <div className="mt-4 space-y-3">
                {[0, 1].map((item) => (
                  <div key={`profile-sidebar-skeleton-${section}-${item}`} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                    <SkeletonLine className="h-4 w-24" />
                    <SkeletonLine className="mt-2 h-3 w-full" />
                    <SkeletonLine className="mt-2 h-3 w-5/6" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative overflow-hidden border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-200/80 lg:hidden" />
            <div className="h-12 w-12 animate-pulse rounded-4xl bg-slate-200/80" />
            <div className="space-y-2">
              <SkeletonLine className="h-5 w-36" />
              <SkeletonLine className="hidden h-3 w-64 md:block" />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#fff7ed_100%)]">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
            <section className="relative overflow-hidden rounded-[36px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.55)] lg:p-8">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex-1 space-y-4">
                  <SkeletonLine className="h-6 w-36" />
                  <div className="space-y-3">
                    <SkeletonLine className="h-10 w-3/4 max-w-lg rounded-2xl" />
                    <SkeletonLine className="h-4 w-full max-w-2xl rounded-xl" />
                    <SkeletonLine className="h-4 w-5/6 max-w-xl rounded-xl" />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[0, 1, 2].map((item) => (
                      <div key={`profile-hero-chip-skeleton-${item}`} className="rounded-full border border-slate-200 bg-white px-3 py-2">
                        <SkeletonLine className="h-4 w-28" />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-2xl bg-slate-900 px-4 py-2.5">
                      <SkeletonLine className="h-4 w-36 bg-white/30" />
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
                      <SkeletonLine className="h-4 w-40" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:min-w-120">
                  {[0, 1, 2].map((item) => (
                    <div key={`profile-generation-skeleton-${item}`} className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4">
                      <SkeletonLine className="h-3 w-24" />
                      <SkeletonLine className="mt-4 h-10 w-16 rounded-2xl" />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.95fr)]">
              <div className="rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.55)]">
                <SkeletonLine className="h-4 w-32" />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={`profile-metric-skeleton-${item}`} className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3">
                          <SkeletonLine className="h-3 w-24" />
                          <SkeletonLine className="h-10 w-16 rounded-2xl" />
                        </div>
                        <div className="h-11 w-11 animate-pulse rounded-3xl bg-slate-200/80" />
                      </div>
                      <SkeletonLine className="mt-4 h-3 w-full" />
                      <SkeletonLine className="mt-2 h-3 w-5/6" />
                      <SkeletonLine className="mt-4 h-4 w-16" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                {[0, 1].map((block) => (
                  <div key={`profile-side-block-skeleton-${block}`} className="rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.55)]">
                    <SkeletonLine className="h-4 w-32" />
                    <div className="mt-4 space-y-3">
                      {[0, 1, 2].map((item) => (
                        <div key={`profile-side-block-skeleton-${block}-${item}`} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                          <SkeletonLine className="h-3 w-24" />
                          <SkeletonLine className="mt-3 h-5 w-40 rounded-xl" />
                          <SkeletonLine className="mt-3 h-3 w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.55)]">
                <SkeletonLine className="h-4 w-32" />
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={`profile-platform-skeleton-${item}`} className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4">
                      <SkeletonLine className="h-6 w-20 rounded-full" />
                      <SkeletonLine className="mt-4 h-10 w-14 rounded-2xl" />
                      <SkeletonLine className="mt-3 h-3 w-full" />
                      <SkeletonLine className="mt-2 h-3 w-4/5" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.55)]">
                <SkeletonLine className="h-4 w-36" />
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[0, 1, 2].map((item) => (
                    <div key={`profile-health-stat-skeleton-${item}`} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                      <SkeletonLine className="h-3 w-20" />
                      <SkeletonLine className="mt-4 h-10 w-14 rounded-2xl" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  {[0, 1, 2].map((item) => (
                    <div key={`profile-health-row-skeleton-${item}`} className="rounded-[24px] border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-2">
                          <SkeletonLine className="h-4 w-24" />
                          <SkeletonLine className="h-3 w-40" />
                        </div>
                        <div className="space-y-2">
                          <SkeletonLine className="h-4 w-16" />
                          <SkeletonLine className="h-3 w-12" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}