'use client';

export default function ZoomGuidePage() {
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
            Zoom Integration <span className="text-[#E51B23]">Guide</span>
          </h1>
          <p className="text-[#B3B3B3] text-sm mt-2">
            Connect your Zoom account to import cloud recordings and transcripts into Call Lab Pro for AI-powered sales coaching.
          </p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none">

          {/* Prerequisites */}
          <Section number="1" title="Prerequisites">
            <p>Before connecting Zoom, make sure you have:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[#B3B3B3]">
              <li>An active Call Lab Pro subscription</li>
              <li>A Zoom account with cloud recording enabled</li>
              <li>Audio transcription turned on in your Zoom recording settings</li>
            </ul>
            <div className="bg-[#1A1A1A] border border-[#333] rounded p-4 mt-4">
              <p className="text-[#FFDE59] text-sm font-semibold mb-2">How to enable Zoom cloud recordings &amp; transcripts:</p>
              <ol className="list-decimal pl-6 space-y-1 text-[#B3B3B3] text-sm">
                <li>Sign in to your Zoom web portal</li>
                <li>Go to <strong>Settings</strong> &rarr; <strong>Recording</strong></li>
                <li>Enable <strong>Cloud recording</strong></li>
                <li>Under cloud recording settings, enable <strong>Audio transcript</strong></li>
              </ol>
            </div>
          </Section>

          {/* Connecting */}
          <Section number="2" title="Connecting Your Zoom Account">
            <ol className="list-decimal pl-6 space-y-3 text-[#B3B3B3]">
              <li>
                Log in to your Call Lab Pro account and navigate to{' '}
                <a href="/settings" className="text-[#E51B23] hover:text-[#FFDE59] transition-colors">Settings</a>
              </li>
              <li>
                Scroll down to the <strong className="text-white">Integrations</strong> section
              </li>
              <li>
                Click the <strong className="text-[#FFDE59]">Connect</strong> button next to Zoom
              </li>
              <li>
                You&apos;ll be redirected to Zoom&apos;s authorization page. Review the permissions and click <strong className="text-white">Allow</strong>
              </li>
              <li>
                You&apos;ll be redirected back to your settings page with Zoom now showing as connected
              </li>
            </ol>
            <div className="bg-[#1A1A1A] border border-[#333] rounded p-4 mt-4">
              <p className="text-[#FFDE59] text-sm font-semibold mb-2">Permissions we request:</p>
              <ul className="list-disc pl-6 space-y-1 text-[#B3B3B3] text-sm">
                <li><strong>View your cloud recordings</strong> &mdash; to list and display your available recordings</li>
                <li><strong>View your user information</strong> &mdash; to identify your account (email and display name)</li>
              </ul>
              <p className="text-[#666] text-xs mt-3">We only request read-only access. We cannot modify, delete, or create recordings or meetings.</p>
            </div>
          </Section>

          {/* Using the Integration */}
          <Section number="3" title="Importing Recordings">
            <p>Once connected, you can import Zoom recordings directly into Call Lab Pro:</p>
            <ol className="list-decimal pl-6 space-y-3 text-[#B3B3B3] mt-3">
              <li>
                Go to{' '}
                <a href="/call-lab/pro" className="text-[#E51B23] hover:text-[#FFDE59] transition-colors">Call Lab Pro</a>
              </li>
              <li>
                In the <strong className="text-white">Transcript Input</strong> section, click <strong className="text-white">Import from Zoom</strong>
              </li>
              <li>
                Browse your recent cloud recordings. Recordings with available transcripts will show <span className="text-[#FFDE59]">&quot;Transcript available&quot;</span>
              </li>
              <li>
                Click on a recording to import its transcript
              </li>
              <li>
                The transcript text will be loaded into the input field. Fill in the call context (prospect name, company, call type) and run the analysis
              </li>
            </ol>
          </Section>

          {/* Auto-Import */}
          <Section number="4" title="Automatic Import">
            <p>
              When a Zoom cloud recording finishes processing its transcript, Call Lab Pro can automatically import it for you. Auto-imported transcripts appear in your dashboard and are ready for analysis.
            </p>
            <p className="mt-3">
              This happens automatically when your Zoom account is connected &mdash; no additional setup is required.
            </p>
          </Section>

          {/* Data & Privacy */}
          <Section number="5" title="Your Data & Privacy">
            <p>We take your data privacy seriously:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-[#B3B3B3]">
              <li>
                <strong className="text-white">What we store:</strong> Your Zoom email, display name, and OAuth tokens (for maintaining the connection). When you import a recording, we store the parsed transcript text and meeting metadata (topic, date, duration).
              </li>
              <li>
                <strong className="text-white">What we don&apos;t store:</strong> Audio files, video files, meeting chat logs, or participant contact information.
              </li>
              <li>
                <strong className="text-white">How transcripts are used:</strong> Imported transcripts are analyzed by our AI engine to generate your sales coaching report. Transcripts are sent to our AI providers (Anthropic, OpenAI) solely for analysis purposes.
              </li>
              <li>
                <strong className="text-white">Read-only access:</strong> We cannot modify, delete, or create anything in your Zoom account.
              </li>
            </ul>
            <p className="mt-3">
              For full details, see our{' '}
              <a href="/privacy" className="text-[#E51B23] hover:text-[#FFDE59] transition-colors">Privacy Policy</a>.
            </p>
          </Section>

          {/* Disconnecting */}
          <Section number="6" title="Disconnecting Zoom">
            <p>You can disconnect Zoom at any time:</p>
            <ol className="list-decimal pl-6 space-y-3 text-[#B3B3B3] mt-3">
              <li>
                Go to{' '}
                <a href="/settings" className="text-[#E51B23] hover:text-[#FFDE59] transition-colors">Settings</a>
              </li>
              <li>
                Scroll to the <strong className="text-white">Integrations</strong> section
              </li>
              <li>
                Click the <strong className="text-[#E51B23]">Disconnect</strong> button next to Zoom
              </li>
              <li>
                Confirm the disconnection when prompted
              </li>
            </ol>
            <div className="bg-[#1A1A1A] border border-[#333] rounded p-4 mt-4">
              <p className="text-[#FFDE59] text-sm font-semibold mb-2">What happens when you disconnect:</p>
              <ul className="list-disc pl-6 space-y-1 text-[#B3B3B3] text-sm">
                <li>Your Zoom OAuth tokens are immediately deleted from our database</li>
                <li>We can no longer access your Zoom recordings</li>
                <li>Previously imported transcripts and analysis reports are retained in your account</li>
                <li>You can reconnect at any time by clicking Connect again</li>
              </ul>
            </div>
            <p className="mt-4 text-[#B3B3B3]">
              You can also revoke access from your Zoom account directly by going to the{' '}
              <span className="text-white">Zoom App Marketplace</span> &rarr; <span className="text-white">Manage</span> &rarr; <span className="text-white">Installed Apps</span> and removing Call Lab Pro.
            </p>
          </Section>

          {/* Troubleshooting */}
          <Section number="7" title="Troubleshooting">
            <div className="space-y-4">
              <TroubleshootItem
                question="I don't see any recordings"
                answer="Make sure cloud recording is enabled in your Zoom settings. Only cloud recordings (not local recordings) are accessible via the integration. Recordings may also take a few minutes to appear after a meeting ends."
              />
              <TroubleshootItem
                question="A recording shows 'No transcript'"
                answer="Audio transcription must be enabled in your Zoom recording settings before the meeting takes place. Transcripts are generated after the recording is processed, which can take several minutes."
              />
              <TroubleshootItem
                question="I get an error when trying to connect"
                answer="Make sure you're logged in to Call Lab Pro before clicking Connect. If the problem persists, try clearing your browser cookies and logging in again."
              />
              <TroubleshootItem
                question="My connection stopped working"
                answer="OAuth tokens can expire if not used for an extended period. Disconnect and reconnect Zoom in your settings to refresh the connection."
              />
            </div>
          </Section>

          {/* Support */}
          <Section number="8" title="Need Help?">
            <p>
              If you&apos;re having trouble with the Zoom integration, we&apos;re here to help:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[#B3B3B3]">
              <li>
                Submit a support request at{' '}
                <a href="/support" className="text-[#E51B23] hover:text-[#FFDE59] transition-colors">our support page</a>
              </li>
              <li>
                Email us directly at{' '}
                <a href="mailto:support@timkilroy.com" className="text-[#E51B23] hover:text-[#FFDE59] transition-colors">support@timkilroy.com</a>
              </li>
            </ul>
          </Section>
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-[#333]">
          <a href="/settings" className="text-[#666] hover:text-white transition-colors text-sm">
            &larr; Back to Settings
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

function TroubleshootItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded p-4">
      <p className="text-white font-semibold text-sm mb-2">{question}</p>
      <p className="text-[#B3B3B3] text-sm">{answer}</p>
    </div>
  );
}
