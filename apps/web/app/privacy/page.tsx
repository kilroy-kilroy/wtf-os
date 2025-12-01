'use client';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white font-poppins py-12 px-4">
      {/* Background Effects */}
      <div className="fixed top-0 left-0 right-0 bottom-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(229, 27, 35, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(229, 27, 35, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-anton text-[clamp(28px,4vw,40px)] tracking-[2px] mb-2 leading-none uppercase">
            KLRY LLC <span className="text-[#E51B23]">Privacy Policy</span>
          </h1>
          <p className="text-[#666] text-sm">Effective Date: November 1, 2025</p>
          <p className="text-[#666] text-sm">Company: KLRY LLC</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-[#B3B3B3] mb-8">
            This Privacy Policy explains how KLRY LLC collects, uses, stores, and protects information in connection with our applications, tools, and online services (the &quot;Services&quot;).
          </p>

          <Section number="1" title="Information We Collect">
            <h3 className="text-white font-semibold mt-4 mb-2">1.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-1 text-[#B3B3B3]">
              <li>Name, email, and other account details</li>
              <li>Documents, notes, files, call data, transcripts, or content you upload</li>
              <li>Payment information (processed by third-party providers; we do not store full card numbers)</li>
            </ul>

            <h3 className="text-white font-semibold mt-4 mb-2">1.2 Information Automatically Collected</h3>
            <ul className="list-disc pl-6 space-y-1 text-[#B3B3B3]">
              <li>Device and browser information</li>
              <li>Log data</li>
              <li>IP address</li>
              <li>Usage patterns and feature interactions</li>
              <li>Cookies and analytics data</li>
            </ul>

            <h3 className="text-white font-semibold mt-4 mb-2">1.3 Information from Integrations</h3>
            <p>If you connect third-party services (e.g., CRM, email providers, LinkedIn, Google Drive), we may access and store limited data necessary to provide the Service features you request.</p>
            <p className="mt-2 text-[#FFDE59]">We never access third-party data without your explicit authorization.</p>
          </Section>

          <Section number="2" title="How We Use Information">
            <p>We use collected information to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[#B3B3B3]">
              <li>Operate and provide the Services</li>
              <li>Improve features, functionality, and user experience</li>
              <li>Build and train internal models for quality and performance</li>
              <li>Communicate with you regarding updates or support</li>
              <li>Ensure security, fraud prevention, and compliance</li>
            </ul>
            <p className="mt-4 text-[#E51B23] font-semibold">We do not sell personal information. Ever.</p>
          </Section>

          <Section number="3" title="AI Processing">
            <p>Some Services rely on AI models. User data may be temporarily sent to integrated AI APIs (such as OpenAI, Anthropic, Google, or others).</p>
            <p className="mt-4">We enforce strict contractual and technical controls to prevent providers from using your content to train models unless explicitly stated in their policies.</p>
          </Section>

          <Section number="4" title="Sharing of Information">
            <p>We may share limited information with:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[#B3B3B3]">
              <li>Cloud hosting and infrastructure partners</li>
              <li>Payment processors</li>
              <li>AI API providers</li>
              <li>Analytics and logging providers</li>
              <li>Subcontractors who support operations</li>
            </ul>
            <p className="mt-4">All partners are required to maintain confidentiality and follow reasonable security practices.</p>
            <p className="mt-2">We may disclose information if required by law.</p>
          </Section>

          <Section number="5" title="Data Storage & Retention">
            <p>We store data on secure cloud infrastructure. Retention varies by product and settings.</p>
            <p className="mt-4">
              You may request deletion of your data at any time by contacting us at{' '}
              <a href="mailto:privacy@klry.co" className="text-[#E51B23] hover:text-[#FFDE59] transition-colors">
                privacy@klry.co
              </a>
            </p>
          </Section>

          <Section number="6" title="Your Rights">
            <p>Depending on your jurisdiction, you may have rights to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[#B3B3B3]">
              <li>Access your data</li>
              <li>Correct your data</li>
              <li>Delete your data</li>
              <li>Request restrictions on processing</li>
              <li>Opt-out of marketing communications</li>
              <li>Receive copies of certain data</li>
            </ul>
            <p className="mt-4">We honor all legally valid requests.</p>
          </Section>

          <Section number="7" title="Security">
            <p>We use industry-standard safeguards to protect data. However, no method of transmission or storage is perfectly secure. You use the Services at your own risk.</p>
          </Section>

          <Section number="8" title="Children's Privacy">
            <p>We do not knowingly collect information from individuals under 18. If we learn such data has been collected, we will delete it promptly.</p>
          </Section>

          <Section number="9" title="International Transfers">
            <p>We may process data on servers located in the United States or other countries. By using the Services, you consent to such transfers, as permitted by law.</p>
          </Section>

          <Section number="10" title="Changes to this Policy">
            <p>We may update this Privacy Policy periodically. Continued use of the Services indicates acceptance of the revised Policy.</p>
          </Section>

          <Section number="11" title="Contact">
            <p>For privacy questions, reach us at:</p>
            <p className="mt-2">
              <a href="mailto:privacy@timkilroy.com" className="text-[#E51B23] hover:text-[#FFDE59] transition-colors">
                privacy@timkilroy.com
              </a>
            </p>
          </Section>
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-[#333]">
          <a href="/login" className="text-[#666] hover:text-white transition-colors text-sm">
            &larr; Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wide mb-3">
        {number}. {title}
      </h2>
      <div className="text-[#B3B3B3] leading-relaxed">
        {children}
      </div>
    </div>
  );
}
