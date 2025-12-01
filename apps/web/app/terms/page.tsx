'use client';

export default function TermsPage() {
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
            KLRY LLC <span className="text-[#E51B23]">Terms of Service</span>
          </h1>
          <p className="text-[#666] text-sm">Effective Date: November 1, 2025</p>
          <p className="text-[#666] text-sm">Company: KLRY LLC (a Delaware limited liability company)</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-[#B3B3B3] mb-8">
            Welcome to the KLRY LLC family of applications, tools, agents, services, and related technologies (collectively the &quot;Services&quot;). By accessing or using the Services, you agree to these Terms of Service (the &quot;Terms&quot;). If you do not agree, do not use the Services.
          </p>

          <Section number="1" title="Eligibility">
            <p>You must be at least 18 years old and legally able to enter into a binding contract. By using the Services, you represent that you meet these requirements.</p>
          </Section>

          <Section number="2" title="Use of the Services">
            <p>You may use the Services only for lawful purposes and in accordance with these Terms.</p>
            <p className="mt-4">You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[#B3B3B3]">
              <li>Reverse-engineer, decompile, or copy core functionality.</li>
              <li>Interfere with or disrupt the integrity or performance of the Services.</li>
              <li>Use the Services to create or enhance competing products.</li>
              <li>Use the Services for illegal, harmful, or fraudulent activities.</li>
            </ul>
            <p className="mt-4">KLRY LLC retains the right to suspend or terminate access at any time for violations.</p>
          </Section>

          <Section number="3" title="Accounts & Security">
            <p>You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. Notify us promptly of any unauthorized access or breach.</p>
          </Section>

          <Section number="4" title="AI-Generated Content">
            <p>Some Services use artificial intelligence models. AI-generated outputs may be inaccurate, incomplete, or reflect limitations inherent in machine learning systems. You are solely responsible for validating and using AI outputs appropriately.</p>
            <p className="mt-4 text-[#FFDE59]">We do not guarantee the accuracy, legality, or fitness of AI-generated content.</p>
          </Section>

          <Section number="5" title="User Content">
            <p>You retain ownership of any content, data, documents, or materials you upload or provide (&quot;User Content&quot;). You grant KLRY LLC a limited license to process, store, transmit, and use User Content solely to operate, maintain, and improve the Services.</p>
            <p className="mt-4">You represent that you have the right to upload and use all User Content you submit.</p>
          </Section>

          <Section number="6" title="Data Storage & Availability">
            <p>We may store data using third-party cloud providers. We strive for high availability but do not guarantee uptime or uninterrupted service. Temporary outages may occur as part of normal operations.</p>
          </Section>

          <Section number="7" title="Payments & Subscriptions">
            <p>Use of certain Services may require payment of fees. Prices and payment terms are described at the time of subscription. All fees are non-refundable unless stated otherwise.</p>
            <p className="mt-4">Subscriptions renew automatically unless canceled before the renewal date.</p>
          </Section>

          <Section number="8" title="Modifications to the Services">
            <p>KLRY LLC may update, modify, or discontinue features or components of the Services at any time. We will provide notice when changes materially affect your use.</p>
          </Section>

          <Section number="9" title="Termination">
            <p>You may stop using the Services at any time. KLRY LLC may suspend or terminate access for violations of these Terms or other behaviors that threaten the integrity or security of the Services.</p>
            <p className="mt-4">Upon termination, your right to use the Services ceases immediately. Certain sections (including disclaimers, limitations, and indemnities) survive termination.</p>
          </Section>

          <Section number="10" title="Disclaimers">
            <p>The Services are provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, or non-infringement.</p>
            <p className="mt-4 text-[#FFDE59]">AI outputs are not professional advice.</p>
          </Section>

          <Section number="11" title="Limitation of Liability">
            <p>To the fullest extent permitted by law:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[#B3B3B3]">
              <li>KLRY LLC will not be liable for indirect, incidental, consequential, special, or punitive damages.</li>
              <li>KLRY LLC&apos;s total liability for any claim arising from the Services will not exceed the amount you paid in the preceding three months.</li>
            </ul>
          </Section>

          <Section number="12" title="Indemnification">
            <p>You agree to indemnify and hold KLRY LLC and its owners, officers, and agents harmless from any claims, losses, damages, liabilities, and expenses arising out of your misuse of the Services or violation of these Terms.</p>
          </Section>

          <Section number="13" title="Governing Law">
            <p>These Terms are governed by Delaware law, without regard to conflict of law principles.</p>
          </Section>

          <Section number="14" title="Changes to Terms">
            <p>We may update these Terms from time to time. Continued use of the Services indicates acceptance of the revised Terms.</p>
          </Section>

          <Section number="15" title="Contact">
            <p>For any questions regarding these Terms, contact:</p>
            <p className="mt-2">
              <a href="mailto:legal@timkilroy.com" className="text-[#E51B23] hover:text-[#FFDE59] transition-colors">
                legal@timkilroy.com
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
