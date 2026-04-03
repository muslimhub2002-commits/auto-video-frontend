import Link from 'next/link';
import { Video, Shield, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Privacy Policy | Auto Video Generator',
  description: 'Privacy Policy for Auto Video Generator – how we collect, use, and protect your personal information.',
};

const sections = [
  {
    id: 'information-we-collect',
    title: '1. Information We Collect',
    content: [
      {
        subtitle: '1.1 Information You Provide',
        body: 'When you create an account or use our services, we collect information you provide directly to us, including: your name, email address, password (stored in hashed form), billing information (processed securely by our payment providers), profile information, and any content you upload or create using our platform such as scripts, video projects, and generated assets.',
      },
      {
        subtitle: '1.2 Information Collected Automatically',
        body: 'We automatically collect certain information when you use our services, including: log data (IP address, browser type, pages visited, time spent), device information (hardware model, operating system, unique device identifiers), usage data (features used, actions taken, video generation history), and cookies and similar tracking technologies to maintain your session and preferences.',
      },
      {
        subtitle: '1.3 Information from Third Parties',
        body: 'We may receive information about you from third-party services you connect to our platform, such as YouTube, TikTok, or social media accounts linked for content publishing. We only collect the information necessary to provide the integration features you authorize.',
      },
    ],
  },
  {
    id: 'how-we-use',
    title: '2. How We Use Your Information',
    content: [
      {
        subtitle: '2.1 To Provide and Improve Our Services',
        body: 'We use your information to operate, maintain, and improve Auto Video Generator, process your video generation requests, personalize your experience, send transactional emails and service notifications, provide customer support, and detect and prevent fraudulent or abusive activity.',
      },
      {
        subtitle: '2.2 AI and Machine Learning',
        body: 'Content you submit — such as scripts, prompts, and preferences — may be used to improve the accuracy and quality of our AI models. You may opt out of this use in your account settings. We do not use your personal video projects to train third-party AI providers without your explicit consent.',
      },
      {
        subtitle: '2.3 Communications',
        body: 'We may send you promotional emails about new features, special offers, and updates. You can opt out of marketing communications at any time by clicking the unsubscribe link in any email or adjusting your notification preferences in your account settings. Transactional and security-related emails cannot be opted out of while your account remains active.',
      },
    ],
  },
  {
    id: 'sharing',
    title: '3. Sharing of Your Information',
    content: [
      {
        subtitle: '3.1 Service Providers',
        body: 'We share your information with trusted third-party service providers who assist us in operating our platform, including cloud hosting providers (AWS), AI inference providers, payment processors (Stripe), email service providers, and analytics tools. These providers are contractually obligated to use your data only for the purpose of providing services to us.',
      },
      {
        subtitle: '3.2 Third-Party Platforms',
        body: 'When you use features that publish content to third-party platforms (YouTube, TikTok, etc.), the content you choose to publish and any associated metadata is shared with those platforms according to their own privacy policies. We are not responsible for how those platforms handle your data.',
      },
      {
        subtitle: '3.3 Legal Requirements',
        body: 'We may disclose your information if required by law, regulation, legal process, or governmental request. We may also disclose information to enforce our Terms of Service, protect our rights and property, prevent or investigate fraud or security issues, or protect the safety of our users or the public.',
      },
      {
        subtitle: '3.4 Business Transfers',
        body: 'In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred to the acquiring entity. We will notify you via email and/or a prominent notice on our website of any such change.',
      },
    ],
  },
  {
    id: 'data-retention',
    title: '4. Data Retention',
    content: [
      {
        subtitle: '',
        body: 'We retain your personal information for as long as your account is active or as needed to provide you with our services. You may delete your account at any time, after which we will delete or anonymize your personal data within 30 days, except where we are required to retain data for legal, regulatory, or legitimate business purposes (such as billing records, which are retained for 7 years in accordance with applicable tax laws). Generated video assets stored in your account are deleted within 90 days after account closure.',
      },
    ],
  },
  {
    id: 'your-rights',
    title: '5. Your Privacy Rights',
    content: [
      {
        subtitle: '5.1 Access and Portability',
        body: 'You have the right to access the personal information we hold about you and to receive a copy in a machine-readable format. You can export your data at any time from your account settings page.',
      },
      {
        subtitle: '5.2 Correction',
        body: 'You have the right to request correction of inaccurate or incomplete personal information we hold about you. You can update most information directly in your account settings.',
      },
      {
        subtitle: '5.3 Deletion',
        body: 'You have the right to request deletion of your personal information. You may delete your account at any time via the account settings page. Upon deletion, we will remove your personal data in accordance with our retention policy described above.',
      },
      {
        subtitle: '5.4 Objection and Restriction',
        body: 'You may object to or request restriction of our processing of your personal information, including objecting to the use of your data for marketing purposes or AI model improvement. To exercise these rights, contact us at privacy@autovideogenerator.com.',
      },
      {
        subtitle: '5.5 California Residents (CCPA)',
        body: 'California residents have additional rights under the California Consumer Privacy Act, including the right to know what personal information we collect and how it is used, the right to opt out of the sale of personal information (we do not sell personal information), and the right to non-discrimination for exercising your privacy rights.',
      },
      {
        subtitle: '5.6 European Residents (GDPR)',
        body: 'If you are located in the European Economic Area, you have the right to lodge a complaint with your local data protection authority. Our legal basis for processing your data includes contract performance (providing our services), legitimate interests, consent (for marketing and optional AI training), and legal obligations.',
      },
    ],
  },
  {
    id: 'security',
    title: '6. Security',
    content: [
      {
        subtitle: '',
        body: 'We implement industry-standard security measures to protect your information, including TLS/SSL encryption for data in transit, AES-256 encryption for sensitive data at rest, password hashing using bcrypt, multi-factor authentication support, regular security audits and vulnerability assessments, and role-based access controls for our internal team. However, no method of transmission over the Internet or electronic storage is 100% secure. We encourage you to use a strong, unique password and enable two-factor authentication on your account.',
      },
    ],
  },
  {
    id: 'cookies',
    title: '7. Cookies and Tracking Technologies',
    content: [
      {
        subtitle: '',
        body: 'We use cookies, pixels, and similar technologies to authenticate your session, remember your preferences, analyze usage patterns, and deliver relevant content. You can control cookie preferences through your browser settings or our cookie consent manager. Disabling certain cookies may affect the functionality of our services. We do not currently respond to "Do Not Track" signals from browsers.',
      },
    ],
  },
  {
    id: 'childrens-privacy',
    title: '8. Children\'s Privacy',
    content: [
      {
        subtitle: '',
        body: 'Our services are not directed to individuals under the age of 13 (or 16 in the European Union). We do not knowingly collect personal information from children. If we become aware that a child under the applicable age has provided us with personal information, we will delete that information promptly. If you believe a child has provided us with personal information, please contact us at privacy@autovideogenerator.com.',
      },
    ],
  },
  {
    id: 'changes',
    title: '9. Changes to This Policy',
    content: [
      {
        subtitle: '',
        body: 'We may update this Privacy Policy from time to time. When we make material changes, we will notify you by email or by posting a prominent notice on our website at least 30 days before the changes take effect. Your continued use of our services after the effective date constitutes your acceptance of the updated policy.',
      },
    ],
  },
  {
    id: 'contact',
    title: '10. Contact Us',
    content: [
      {
        subtitle: '',
        body: 'If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us at:\n\nAuto Video Generator\nEmail: privacy@autovideogenerator.com\nData Protection Officer: dpo@autovideogenerator.com\n\nWe will respond to all privacy-related inquiries within 30 days.',
      },
    ],
  },
];

export default function PrivacyPolicyPage() {
  const lastUpdated = 'April 3, 2026';

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-gray-900/50 sticky top-0 z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Video className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Auto Video Generator</span>
          </Link>
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

      <main className="flex-1">
        {/* Hero */}
        <div className="border-b bg-white/60 dark:bg-gray-900/60 py-12">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Shield className="h-4 w-4" />
                Your Privacy Matters
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                We are committed to protecting your personal information and your right to privacy.
                This policy explains how we collect, use, and safeguard your data.
              </p>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-500">
                Last updated: {lastUpdated}
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-[260px_1fr] lg:gap-12">

            {/* Table of Contents — sticky sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-xl border bg-white p-5 shadow-sm dark:bg-gray-900">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Table of Contents
                </h2>
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-primary/5 hover:text-primary dark:text-gray-400 dark:hover:text-primary"
                    >
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      {section.title.replace(/^\d+\.\s/, '')}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <article className="space-y-10">
              {/* Intro */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  This Privacy Policy describes how <strong>Auto Video Generator</strong> ("we", "us", or "our")
                  collects, uses, and shares information about you when you access or use our website,
                  mobile applications, and services (collectively, the "Services"). By using our Services,
                  you agree to the collection and use of information in accordance with this policy.
                </p>
              </div>

              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-900">
                    <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-gray-100">
                      {section.title}
                    </h2>
                    <div className="space-y-5">
                      {section.content.map((item, idx) => (
                        <div key={idx}>
                          {item.subtitle && (
                            <h3 className="mb-2 font-semibold text-gray-800 dark:text-gray-200">
                              {item.subtitle}
                            </h3>
                          )}
                          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                            {item.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ))}

              {/* Related links */}
              <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-900">
                <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">Related Documents</h2>
                <div className="flex flex-wrap gap-3">
                  <Link href="/terms" className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-primary/5 hover:text-primary dark:text-gray-300">
                    <ChevronRight className="h-4 w-4" />
                    Terms of Service
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 backdrop-blur-sm dark:bg-gray-900/50">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} Auto Video Generator. All rights reserved.{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-primary">Privacy Policy</Link>
          {' · '}
          <Link href="/terms" className="underline underline-offset-2 hover:text-primary">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
