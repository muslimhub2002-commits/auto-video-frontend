import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  AudioLines,
  Bot,
  Clapperboard,
  Layers3,
  PlayCircle,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { MarketingShell } from '@/components/marketing/marketing-shell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Auto Video Generator | AI Creator Studio',
  description:
    'Generate scripts, visuals, voice-overs, and publish-ready videos from one AI-native production studio.',
};

const pillars = [
  {
    icon: Bot,
    title: 'Script intelligence',
    description:
      'Turn a rough idea into structured scenes, hooks, pacing, and CTA beats without bouncing between tools.',
  },
  {
    icon: Layers3,
    title: 'Scene-by-scene control',
    description:
      'Dial in imagery, overlays, motion, audio beds, and text timing with the same pipeline used for rendering.',
  },
  {
    icon: UploadCloud,
    title: 'Publish-ready delivery',
    description:
      'Keep the final mile inside the workspace with export flows designed for YouTube, TikTok, Meta, and more.',
  },
];

const workflow = [
  {
    step: '01',
    title: 'Build the narrative spine',
    description: 'Generate the script, break it into scenes, and tune the pacing before a single frame renders.',
  },
  {
    step: '02',
    title: 'Materialize the visuals',
    description: 'Blend prompts, stock, filters, overlays, and motion effects into a consistent visual system.',
  },
  {
    step: '03',
    title: 'Layer the sound design',
    description: 'Pair voice-overs, soundtrack decisions, and sound effects with timing that survives final render.',
  },
  {
    step: '04',
    title: 'Render and distribute',
    description: 'Ship vertical or long-form outputs with metadata and platform-specific publishing flows already wired in.',
  },
];

const studioSignals = [
  'Short-form and long-form in one pipeline',
  'Voice, captions, overlays, and motion are first-class',
  'Built for iteration instead of template lock-in',
];

export default function Home() {
  return (
    <MarketingShell activePath="/">
      <main className="px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl space-y-8 lg:space-y-10">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="rounded-[2rem] border border-slate-200/80 bg-white/88 p-6 shadow-[0_28px_90px_-60px_rgba(99,102,241,0.18)] backdrop-blur-xl sm:p-8 lg:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600">
                <Sparkles className="h-4 w-4" />
                AI-native production studio
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl lg:text-7xl">
                Build script-to-screen videos without stitching five products together.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Auto Video Generator gives your team one environment for writing the story,
                generating the scenes, shaping the sound, rendering the output, and pushing it to
                the channels that matter.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/signup">
                    Start building
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-950"
                >
                  <Link href="/login">Open workspace</Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {studioSignals.map((signal) => (
                  <div
                    key={signal}
                    className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-4 text-sm leading-6 text-slate-700"
                  >
                    {signal}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-[2rem] border border-slate-200/80 bg-white/88 p-6 shadow-[0_28px_90px_-60px_rgba(99,102,241,0.18)] backdrop-blur-xl sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Studio workflow
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                      One pipeline from hook to distribution.
                    </h2>
                  </div>
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-indigo-600">
                    <PlayCircle className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {workflow.slice(0, 3).map((item) => (
                    <div
                      key={item.step}
                      className="flex gap-4 rounded-3xl border border-slate-200 bg-slate-50/90 px-4 py-4"
                    >
                      <div className="text-sm font-semibold text-indigo-600">{item.step}</div>
                      <div>
                        <h3 className="text-base font-medium text-slate-950">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/88 p-5 backdrop-blur-xl">
                  <div className="inline-flex rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                    <AudioLines className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">Audio that stays in sync</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Voice-over, soundtrack, timing offsets, and sound effects are managed as part of
                    the render model instead of ad hoc post-processing.
                  </p>
                </div>
                <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/88 p-5 backdrop-blur-xl">
                  <div className="inline-flex rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                    <Clapperboard className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">Render-first architecture</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    The editor experience is aligned with the actual generation pipeline, so what you
                    configure is what the renderer and upload flows receive.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {pillars.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-[1.75rem] border border-slate-200/80 bg-white/88 p-6 backdrop-blur-xl"
              >
                <div className="inline-flex rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-slate-950">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-[2rem] border border-slate-200/80 bg-white/88 p-6 backdrop-blur-xl sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Built for real production work
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Not a prompt toy. A creator operating system.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                The application theme is intentionally editorial and cinematic because the product is
                about managing narrative structure, visual tone, audio texture, and publishing
                constraints together. The UI should feel like a studio desk, not a generic dashboard.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {workflow.map((item) => (
                <div
                  key={item.step}
                  className="rounded-[1.75rem] border border-slate-200/80 bg-white/88 p-5 backdrop-blur-xl"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600">
                    Stage {item.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-indigo-100 bg-[linear-gradient(135deg,rgba(224,231,255,0.95),rgba(238,242,255,0.98),rgba(255,255,255,0.96))] p-6 shadow-[0_28px_90px_-60px_rgba(99,102,241,0.2)] backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Ready to move faster
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                  Start with the idea. Leave with a rendered asset and a distribution path.
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/signup">Create your account</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-indigo-200 bg-white/80 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
                >
                  <Link href="/privacy">Review privacy commitments</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}
