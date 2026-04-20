import type { Metadata } from 'next';
import { FileText } from 'lucide-react';
import {
  LegalDocumentLayout,
  type LegalSection,
} from '@/components/marketing/legal-document-layout';
import { MarketingShell } from '@/components/marketing/marketing-shell';

export const metadata: Metadata = {
  title: 'Terms of Service | Auto Video Generator',
  description: 'Terms of Service for Auto Video Generator – the rules and guidelines governing the use of our platform.',
};

const sections: LegalSection[] = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: [
      {
        subtitle: '',
        body: 'By accessing or using Auto Video Generator ("the Service"), you confirm that you are at least 13 years of age (or 16 in the European Union), have read and understand these Terms of Service ("Terms"), agree to be bound by these Terms and our Privacy Policy, and have the legal capacity to enter into a binding agreement. If you are using the Service on behalf of a company or organization, you represent that you have the authority to bind that entity to these Terms.\n\nIf you do not agree to these Terms, you must not access or use our Services.',
      },
    ],
  },
  {
    id: 'description',
    title: '2. Description of Service',
    content: [
      {
        subtitle: '',
        body: 'Auto Video Generator provides an AI-powered platform that enables users to create, edit, and distribute video content. This includes features such as AI script generation, automated image generation, voice-over synthesis, background music selection, video rendering, and integration with third-party platforms for content distribution (collectively, the "Services"). We reserve the right to modify, suspend, or discontinue any part of the Services at any time with or without notice.',
      },
    ],
  },
  {
    id: 'accounts',
    title: '3. Account Registration and Security',
    content: [
      {
        subtitle: '3.1 Account Creation',
        body: 'To access most features of the Service, you must create an account. You agree to provide accurate, current, and complete information during registration and to keep this information updated. You may not create an account using a false identity or for someone other than yourself without authorization.',
      },
      {
        subtitle: '3.2 Account Security',
        body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately at support@autovideogenerator.com if you suspect unauthorized access to your account. We are not liable for any loss resulting from unauthorized use of your account.',
      },
      {
        subtitle: '3.3 One Account Per User',
        body: 'Each user may only maintain one free account. Creating multiple accounts to circumvent usage limits, access free trial benefits multiple times, or for any other reason is prohibited and may result in termination of all associated accounts.',
      },
    ],
  },
  {
    id: 'subscriptions',
    title: '4. Subscriptions, Billing, and Payments',
    content: [
      {
        subtitle: '4.1 Subscription Plans',
        body: 'We offer various subscription plans with different features and usage limits. The details of each plan, including pricing, are available on our pricing page. We reserve the right to change our pricing at any time with 30 days notice to existing subscribers.',
      },
      {
        subtitle: '4.2 Billing',
        body: 'Subscriptions are billed in advance on a monthly or annual basis, depending on the plan you select. By providing a payment method, you authorize us to charge you for all fees associated with your subscription. All fees are in US dollars unless otherwise stated and are non-refundable except as described in our refund policy.',
      },
      {
        subtitle: '4.3 Free Trial',
        body: 'We may offer a free trial period for new users. At the end of the free trial, you will be automatically charged for the subscription plan you selected unless you cancel before the trial ends. We will send a reminder email before your free trial converts to a paid subscription.',
      },
      {
        subtitle: '4.4 Cancellation and Refunds',
        body: 'You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period and your account will remain active until that date. We offer refunds within 14 days of initial purchase if you are not satisfied with the Service, subject to a review of usage. No refunds are issued for partial billing periods or for accounts terminated due to violations of these Terms.',
      },
      {
        subtitle: '4.5 Credits and Usage Limits',
        body: 'Some plans include usage credits (e.g., AI generation credits, render minutes). Unused credits expire at the end of each billing period unless otherwise stated. Overage charges may apply if you exceed plan limits.',
      },
    ],
  },
  {
    id: 'content',
    title: '5. User Content and Intellectual Property',
    content: [
      {
        subtitle: '5.1 Your Content',
        body: 'You retain ownership of any original content you upload to or create using our platform ("User Content"), including scripts, images, or video files you provide. By submitting User Content, you grant us a non-exclusive, worldwide, royalty-free license to host, store, process, and display your content solely for the purpose of providing the Service to you.',
      },
      {
        subtitle: '5.2 AI-Generated Content',
        body: 'Content generated by our AI tools (images, scripts, voice-overs, etc.) is provided to you for use under the terms of your subscription plan. You are responsible for ensuring that your use of AI-generated content complies with applicable laws, including copyright, defamation, and privacy laws. We do not guarantee that AI-generated content is free from third-party intellectual property claims.',
      },
      {
        subtitle: '5.3 Our Intellectual Property',
        body: 'All rights, title, and interest in and to the Service, including our website, software, algorithms, models, brand, and documentation, are and will remain the exclusive property of Auto Video Generator and its licensors. You may not copy, modify, distribute, or create derivative works based on our technology without our express written permission.',
      },
      {
        subtitle: '5.4 DMCA and Copyright Complaints',
        body: 'We respect intellectual property rights and expect our users to do the same. If you believe that content on our platform infringes your copyright, please send a written DMCA notice to dmca@autovideogenerator.com with the required information. Repeat infringers will have their accounts terminated.',
      },
    ],
  },
  {
    id: 'acceptable-use',
    title: '6. Acceptable Use Policy',
    content: [
      {
        subtitle: '6.1 Prohibited Uses',
        body: 'You agree not to use the Service to:\n\n• Generate, distribute, or publish content that is illegal, harmful, hateful, defamatory, obscene, or violates the rights of any third party\n• Create deepfakes or synthetic media that misrepresents real people without their consent\n• Produce spam, misleading advertisements, or deceptive content\n• Generate content that promotes violence, terrorism, or self-harm\n• Harvest or scrape data from our platform using automated tools\n• Attempt to reverse engineer, decompile, or disassemble our software\n• Circumvent or disable any security features or access controls\n• Use the Service to train competing AI models without our written consent\n• Violate any applicable local, national, or international law or regulation',
      },
      {
        subtitle: '6.2 Platform Distribution Compliance',
        body: 'When publishing content to third-party platforms via our integrations (YouTube, TikTok, etc.), you are solely responsible for ensuring that the content and its distribution comply with those platforms\' terms of service and community guidelines. We are not liable for any content removed or accounts suspended by third-party platforms due to policy violations.',
      },
      {
        subtitle: '6.3 Enforcement',
        body: 'We reserve the right to investigate suspected violations and to remove content, suspend accounts, or terminate access at our sole discretion without prior notice if we determine that a violation has occurred.',
      },
    ],
  },
  {
    id: 'third-party',
    title: '7. Third-Party Services and Integrations',
    content: [
      {
        subtitle: '',
        body: 'Our Service integrates with and relies on third-party services including AI providers (OpenAI, Google Gemini, ElevenLabs, etc.), image libraries (Pexels, Pixabay), cloud infrastructure (AWS), payment processors (Stripe), and social media platforms. Your use of these integrations is also governed by the respective third-party\'s terms of service and privacy policies. We are not responsible for the availability, accuracy, or practices of any third-party services. We may update, add, or remove third-party integrations at any time.',
      },
    ],
  },
  {
    id: 'disclaimers',
    title: '8. Disclaimers and Limitation of Liability',
    content: [
      {
        subtitle: '8.1 Disclaimer of Warranties',
        body: 'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR UNINTERRUPTED SERVICE. WE DO NOT WARRANT THAT THE SERVICE WILL MEET YOUR SPECIFIC REQUIREMENTS, THAT AI-GENERATED CONTENT WILL BE ACCURATE OR SUITABLE FOR YOUR PURPOSES, OR THAT THE SERVICE WILL BE ERROR-FREE.',
      },
      {
        subtitle: '8.2 Limitation of Liability',
        body: 'TO THE FULLEST EXTENT PERMITTED BY LAW, AUTO VIDEO GENERATOR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, BUSINESS, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.\n\nOUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU HAVE PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM OR (B) $100 USD.',
      },
      {
        subtitle: '8.3 Indemnification',
        body: 'You agree to indemnify, defend, and hold harmless Auto Video Generator and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys\' fees, arising out of your use of the Service, your User Content, your violation of these Terms, or your violation of any third-party rights.',
      },
    ],
  },
  {
    id: 'privacy',
    title: '9. Privacy',
    content: [
      {
        subtitle: '',
        body: 'Our collection and use of personal information in connection with the Service is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to the data practices described in our Privacy Policy.',
      },
    ],
  },
  {
    id: 'termination',
    title: '10. Termination',
    content: [
      {
        subtitle: '10.1 Termination by You',
        body: 'You may terminate your account at any time by visiting your account settings page and following the account deletion instructions. Upon termination, your right to use the Service will immediately cease.',
      },
      {
        subtitle: '10.2 Termination by Us',
        body: 'We reserve the right to suspend or terminate your account and access to the Service at any time, with or without cause or notice, for reasons including but not limited to violation of these Terms, fraudulent or abusive behavior, extended inactivity, or legal requirements. Upon termination for cause, no refunds will be issued.',
      },
      {
        subtitle: '10.3 Effect of Termination',
        body: 'Upon termination, all licenses granted to you under these Terms will immediately terminate. Provisions of these Terms that by their nature should survive termination (including intellectual property, disclaimers, limitation of liability, and dispute resolution) shall survive.',
      },
    ],
  },
  {
    id: 'changes',
    title: '11. Changes to These Terms',
    content: [
      {
        subtitle: '',
        body: 'We may modify these Terms at any time. When we make material changes, we will provide you with notice via email or a prominent notice on our website at least 30 days before the changes become effective. Your continued use of the Service after the effective date constitutes your acceptance of the revised Terms. If you do not agree to the revised Terms, you must stop using the Service.',
      },
    ],
  },
  {
    id: 'general',
    title: '12. General Provisions',
    content: [
      {
        subtitle: '12.1 Entire Agreement',
        body: 'These Terms, together with our Privacy Policy and any additional terms applicable to specific features, constitute the entire agreement between you and Auto Video Generator regarding the Service and supersede all prior agreements.',
      },
      {
        subtitle: '12.2 Severability',
        body: 'If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will continue in full force and effect.',
      },
      {
        subtitle: '12.3 No Waiver',
        body: 'Our failure to enforce any right or provision of these Terms shall not be deemed a waiver of such right or provision.',
      },
      {
        subtitle: '12.4 Assignment',
        body: 'You may not assign or transfer these Terms or your rights under them without our prior written consent. We may assign our rights and obligations under these Terms without restriction.',
      },
    ],
  },
  {
    id: 'contact',
    title: '13. Contact Us',
    content: [
      {
        subtitle: '',
        body: 'If you have any questions about these Terms of Service, please contact us:\n\nAuto Video Generator\nEmail: legal@autovideogenerator.com\nSupport: support@autovideogenerator.com',
      },
    ],
  },
];

export default function TermsOfServicePage() {
  const lastUpdated = 'April 3, 2026';

  return (
    <MarketingShell activePath="/terms">
      <LegalDocumentLayout
        badgeLabel="Legal agreement"
        title="Terms of Service"
        intro="These terms govern access to the platform, the subscription rules around usage, and the boundaries for how the studio can be used."
        summary="These Terms of Service are a binding agreement between you and Auto Video Generator covering the website, applications, APIs, and related services. They are effective immediately for new users and after notice for existing users."
        lastUpdated={lastUpdated}
        sections={sections}
        relatedLinks={[{ href: '/privacy', label: 'Privacy Policy' }]}
        icon={FileText}
      />
    </MarketingShell>
  );
}
