import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Video, Sparkles, Mic, Image as ImageIcon } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-gray-900/50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Auto Video Generator</span>
          </div>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              AI-Powered Video Generation
            </div>
            <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl">
              Create Stunning Videos
              <br />
              <span className="text-primary">Automatically</span>
            </h1>
            <p className="mb-8 text-xl text-gray-600 dark:text-gray-400">
              Transform your ideas into professional videos using AI. Generate
              scripts, images, and voice-overs with just a few clicks.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Creating Free
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mx-auto mt-24 grid max-w-5xl gap-8 sm:grid-cols-3">
            <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">AI-Directed Videos</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Upload your assets and let AI determine the perfect timing and
                transitions.
              </p>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Script-Driven</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Write a script and AI generates matching images and voice-overs
                automatically.
              </p>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Fully Automated</h3>
              <p className="text-gray-600 dark:text-gray-400">
                One-click video creation with AI-generated scripts, images, and
                narration.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 backdrop-blur-sm dark:bg-gray-900/50">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-400">
          © 2025 Auto Video Generator. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
