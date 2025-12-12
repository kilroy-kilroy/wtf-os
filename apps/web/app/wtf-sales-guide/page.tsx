import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WTF Sales Method - The Trust Layer Every Framework Skips | Tim Kilroy',
  description: 'A 3-pillar framework for trust-based selling that makes SPIN, Challenger, Sandler, and every other sales methodology actually work.',
};

export default function WTFSalesGuidePage() {
  return (
    <div className="min-h-screen bg-black text-white font-poppins">
      {/* Header */}
      <header className="border-b-2 border-[#E51B23] py-5">
        <div className="max-w-[1200px] mx-auto px-5 flex justify-between items-center">
          <a href="/" className="font-anton text-2xl tracking-wider">
            TIM<span className="text-[#E51B23]">KILROY</span>
          </a>
          <nav className="hidden md:flex gap-8">
            <a href="/" className="text-white text-sm font-semibold hover:text-[#E51B23] transition-colors">Home</a>
            <a href="/call-lab" className="text-white text-sm font-semibold hover:text-[#E51B23] transition-colors">Call Lab</a>
            <a href="/agency-inner-circle" className="text-white text-sm font-semibold hover:text-[#E51B23] transition-colors">Newsletter</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-5 text-center border-b-2 border-[#333]">
        <h1 className="font-anton text-[clamp(48px,10vw,64px)] text-[#E51B23] tracking-wider mb-5">
          WTF SALES METHOD
        </h1>
        <p className="text-2xl font-semibold mb-8">
          The Trust Layer Every Other Framework Skips
        </p>
        <p className="text-lg text-[#999] max-w-[700px] mx-auto leading-relaxed">
          A 3-pillar framework for building trust-based selling relationships
          that makes every other sales methodology actually work
        </p>
      </section>

      {/* Content */}
      <div className="max-w-[800px] mx-auto px-5 py-16">
        {/* The Problem */}
        <section className="mb-20">
          <h2 className="font-anton text-[42px] text-[#E51B23] tracking-wider mb-8">
            THE MISSING LAYER
          </h2>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            You&apos;ve been trained in SPIN Selling. Or Challenger. Or Sandler. Or MEDDIC. Or Gap Selling.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            They&apos;re all tactical frameworks. They tell you <strong className="text-white">what questions to ask</strong> or{' '}
            <strong className="text-white">how to position value</strong> or{' '}
            <strong className="text-white">when to push back</strong>.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            But they all assume the same thing:
          </p>

          <div className="bg-[#FFDE59] text-black p-8 my-10 text-xl font-semibold leading-relaxed">
            The buyer already trusts you.
          </div>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            And that&apos;s the problem.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            <strong className="text-white">SPIN doesn&apos;t work if the buyer won&apos;t answer your diagnostic questions.</strong><br />
            <strong className="text-white">Challenger doesn&apos;t work if the buyer thinks you&apos;re just trying to close them.</strong><br />
            <strong className="text-white">Sandler doesn&apos;t work if the buyer won&apos;t tolerate your disqualification.</strong><br />
            <strong className="text-white">MEDDIC doesn&apos;t work if you can&apos;t get access to decision-makers.</strong><br />
            <strong className="text-white">Gap Selling doesn&apos;t work if the buyer won&apos;t show you their gaps.</strong>
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            None of these frameworks teach you how to build trust first.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            That&apos;s what the WTF Sales Method does.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed">
            It&apos;s not a replacement for your tactical framework. It&apos;s the foundation layer that makes your tactical framework actually work.
          </p>
        </section>

        {/* The 3 Pillars */}
        <section className="mb-20">
          <h2 className="font-anton text-[42px] text-[#E51B23] tracking-wider mb-8">
            THE 3 PILLARS
          </h2>

          <p className="text-lg text-[#CCC] leading-relaxed mb-10">
            The WTF Method has three pillars. Master these and every other sales methodology becomes 10x more effective.
          </p>

          {/* Pillar 1 */}
          <div className="bg-[#1A1A1A] border-l-4 border-[#E51B23] p-10 my-10">
            <div className="font-anton text-[72px] text-[#E51B23] leading-none mb-4">01</div>
            <h3 className="font-anton text-[28px] tracking-wider mb-5">RADICAL RELEVANCE</h3>
            <p className="text-[#CCC] leading-relaxed mb-5">
              <strong className="text-white">Show them you understand their world before you pitch your solution.</strong>
            </p>
            <p className="text-[#CCC] leading-relaxed mb-5">
              This is cultural shorthand. Peer validation. The moment they think: &quot;This person gets it.&quot;
            </p>
            <p className="text-[#CCC] leading-relaxed mb-5">
              Most reps lead with: &quot;Tell me about your business.&quot;
            </p>
            <p className="text-[#CCC] leading-relaxed mb-5">
              That&apos;s lazy. It signals: &quot;I didn&apos;t do my homework.&quot;
            </p>
            <p className="text-[#CCC] leading-relaxed mb-3">
              Instead, you lead with proof of understanding:
            </p>
            <ul className="list-none pl-6 mb-5 space-y-3">
              <li className="text-[#CCC]">&quot;Most agencies your size are struggling with X right now. Is that hitting you too?&quot;</li>
              <li className="text-[#CCC]">&quot;I saw you just launched Y. That usually means Z is about to become a problem.&quot;</li>
              <li className="text-[#CCC]">&quot;You&apos;re probably dealing with [specific pain point]. Every agency at your stage does.&quot;</li>
            </ul>
            <p className="text-[#CCC] leading-relaxed mb-5">
              You&apos;re not guessing. You&apos;re demonstrating pattern recognition.
            </p>
            <p className="text-[#CCC] leading-relaxed">
              <strong className="text-white">Why it works:</strong> Buyers pick vendors who understand their context. If you can describe their problem better than they can, they assume you can solve it.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-[#1A1A1A] border-l-4 border-[#E51B23] p-10 my-10">
            <div className="font-anton text-[72px] text-[#E51B23] leading-none mb-4">02</div>
            <h3 className="font-anton text-[28px] tracking-wider mb-5">DIAGNOSTIC GENEROSITY</h3>
            <p className="text-[#CCC] leading-relaxed mb-5">
              <strong className="text-white">Give value before you ask for the sale.</strong>
            </p>
            <p className="text-[#CCC] leading-relaxed mb-5">
              Not free strategy sessions. Not free consulting. But insights, connections, frameworks—things that make them smarter whether they buy or not.
            </p>
            <p className="text-[#CCC] leading-relaxed mb-5">
              This is the opposite of &quot;always be closing.&quot;
            </p>
            <p className="text-[#CCC] leading-relaxed mb-3">
              This is &quot;always be teaching.&quot;
            </p>
            <ul className="list-none pl-6 mb-5 space-y-3">
              <li className="text-[#CCC]">&quot;Here&apos;s the framework we use with clients like you. Even if we don&apos;t work together, this will help.&quot;</li>
              <li className="text-[#CCC]">&quot;I can intro you to someone who solved this exact problem. No strings attached.&quot;</li>
              <li className="text-[#CCC]">&quot;Let me send you our diagnostic tool. Run it yourself. You&apos;ll know within 10 minutes if we can help.&quot;</li>
            </ul>
            <p className="text-[#CCC] leading-relaxed">
              <strong className="text-white">Why it works:</strong> Generosity creates reciprocity. When you give first, buyers feel obligated to give back. Usually with their time, attention, and honesty.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-[#1A1A1A] border-l-4 border-[#E51B23] p-10 my-10">
            <div className="font-anton text-[72px] text-[#E51B23] leading-none mb-4">03</div>
            <h3 className="font-anton text-[28px] tracking-wider mb-5">PERMISSION-BASED PROGRESSION</h3>
            <p className="text-[#CCC] leading-relaxed mb-5">
              <strong className="text-white">Stop pushing. Start pulling.</strong>
            </p>
            <p className="text-[#CCC] leading-relaxed mb-5">
              Ask for permission at every stage. Remove all buyer resistance by making them co-author the sale.
            </p>
            <p className="text-[#CCC] leading-relaxed mb-5">
              Most reps assume forward motion: &quot;Let me send you a proposal.&quot; &quot;I&apos;ll schedule a follow-up.&quot; &quot;Here&apos;s what we should do next.&quot;
            </p>
            <p className="text-[#CCC] leading-relaxed mb-3">
              That&apos;s pressure. Even when it&apos;s subtle. Instead, you ask permission:
            </p>
            <ul className="list-none pl-6 mb-5 space-y-3">
              <li className="text-[#CCC]">&quot;Does this make sense so far?&quot;</li>
              <li className="text-[#CCC]">&quot;Want me to show you how this works?&quot;</li>
              <li className="text-[#CCC]">&quot;Should we keep going or do you need to think about it?&quot;</li>
              <li className="text-[#CCC]">&quot;Would it make sense to explore this further?&quot;</li>
            </ul>
            <p className="text-[#CCC] leading-relaxed">
              <strong className="text-white">Why it works:</strong> When buyers give permission, they own the decision. They&apos;re not being sold. They&apos;re choosing to buy.
            </p>
          </div>
        </section>

        {/* The Trust Curve */}
        <section className="mb-20">
          <h2 className="font-anton text-[42px] text-[#E51B23] tracking-wider mb-8">
            THE TRUST CURVE
          </h2>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            Every sales call has a trust curve. It looks like this:
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            <strong className="text-white">Opening (0-5 minutes):</strong> Trust starts at zero. You&apos;re a stranger. They&apos;re skeptical.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            <strong className="text-white">Discovery (5-15 minutes):</strong> Trust builds if you demonstrate radical relevance. Drops if you&apos;re generic.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            <strong className="text-white">Presentation (15-30 minutes):</strong> Trust compounds if you&apos;re giving value. Drops if you&apos;re pitching too hard.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            <strong className="text-white">Close (30+ minutes):</strong> Trust peaks if you&apos;ve earned permission. Drops if you push.
          </p>

          <div className="bg-[#FFDE59] text-black p-8 my-10 text-xl font-semibold leading-relaxed">
            The buyer decides whether to buy you in the first 10 minutes. They decide whether to buy your solution in the last 10 minutes.
          </div>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            Most reps focus on the last 10 minutes. They nail the pitch. They handle objections. They ask for the sale.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            And they wonder why deals don&apos;t close.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-8">
            <strong className="text-white">The truth:</strong> If you haven&apos;t built trust in the first 10 minutes, nothing you do in the last 10 minutes will matter.
          </p>

          <h3 className="font-anton text-[24px] text-[#FFDE59] tracking-wider mt-10 mb-5">
            What Kills Trust:
          </h3>
          <ul className="list-disc pl-8 mb-8 space-y-3">
            <li className="text-[#CCC]">Generic openers (&quot;Tell me about your business&quot;)</li>
            <li className="text-[#CCC]">Feature dumps (showing everything instead of solving their problem)</li>
            <li className="text-[#CCC]">Pushy closes (assuming forward motion without permission)</li>
            <li className="text-[#CCC]">Giving away strategy for free (free consulting kills your positioning)</li>
            <li className="text-[#CCC]">Not respecting their time (going over time, not having an agenda)</li>
          </ul>

          <h3 className="font-anton text-[24px] text-[#FFDE59] tracking-wider mt-10 mb-5">
            What Builds Trust:
          </h3>
          <ul className="list-disc pl-8 space-y-3">
            <li className="text-[#CCC]">Demonstrating understanding (radical relevance)</li>
            <li className="text-[#CCC]">Giving diagnostic value (frameworks, tools, insights)</li>
            <li className="text-[#CCC]">Asking permission at every stage (co-authoring the sale)</li>
            <li className="text-[#CCC]">Respecting objections (exploring them instead of handling them)</li>
            <li className="text-[#CCC]">Making it easy to say no (removes pressure, paradoxically increases yes rate)</li>
          </ul>
        </section>

        {/* Integration with Other Frameworks */}
        <section className="mb-20">
          <h2 className="font-anton text-[42px] text-[#E51B23] tracking-wider mb-8">
            USING WTF WITH OTHER FRAMEWORKS
          </h2>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            The WTF Method isn&apos;t a replacement. It&apos;s a foundation.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-8">
            Here&apos;s how it integrates with the frameworks you already use:
          </p>

          {[
            {
              title: 'WTF + SPIN Selling',
              first: 'Build radical relevance by showing you understand their context.',
              second: 'Deploy Situation/Problem/Implication/Need-Payoff questions.',
              why: 'Buyers answer SPIN questions honestly when they trust you\'ve already done the homework.'
            },
            {
              title: 'WTF + Challenger',
              first: 'Establish diagnostic generosity by teaching them something they don\'t know.',
              second: 'Challenge their assumptions with your unique insight.',
              why: 'Buyers accept your challenge when you\'ve already given them value.'
            },
            {
              title: 'WTF + Sandler',
              first: 'Use permission-based progression to establish equal business stature.',
              second: 'Deploy the Sandler pain funnel and disqualification tactics.',
              why: 'Buyers tolerate Sandler\'s direct approach when you\'ve removed pressure first.'
            },
            {
              title: 'WTF + MEDDIC',
              first: 'Use radical relevance to get access to economic buyers and champions.',
              second: 'Map Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion.',
              why: 'Buyers give you access to decision-makers when you\'ve proven you won\'t waste their time.'
            },
            {
              title: 'WTF + Gap Selling',
              first: 'Build trust through diagnostic generosity so buyers feel safe showing you their gaps.',
              second: 'Map current state vs. future state and the gap between them.',
              why: 'Buyers reveal their problems when they trust you won\'t use it against them.'
            }
          ].map((framework, idx) => (
            <div key={idx} className="mb-8">
              <h3 className="font-anton text-[24px] text-[#FFDE59] tracking-wider mb-4">
                {framework.title}
              </h3>
              <p className="text-[#CCC] leading-relaxed mb-2">
                <strong className="text-white">WTF first:</strong> {framework.first}
              </p>
              <p className="text-[#CCC] leading-relaxed mb-2">
                <strong className="text-white">{framework.title.split('+')[1].trim()} second:</strong> {framework.second}
              </p>
              <p className="text-[#CCC] leading-relaxed">
                <strong className="text-white">Why it works:</strong> {framework.why}
              </p>
            </div>
          ))}

          <div className="bg-[#FFDE59] text-black p-8 my-10 text-xl font-semibold leading-relaxed">
            The pattern: WTF builds the trust layer. Your tactical framework executes on top of it.
          </div>
        </section>
      </div>

      {/* CTA Section */}
      <section className="bg-[#E51B23] py-16 px-5 text-center">
        <h2 className="font-anton text-[clamp(32px,5vw,48px)] text-white mb-5 tracking-wider">
          START TRACKING YOUR TRUST CURVE
        </h2>
        <p className="text-white/90 text-lg mb-8 max-w-[600px] mx-auto">
          Use Call Lab to see your WTF Method scores, track your patterns, and get better at selling by seeing what YOU do that actually works.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/call-lab-instant"
            className="inline-block bg-[#FFDE59] text-black px-12 py-5 font-anton text-lg tracking-wider hover:bg-white transition-colors"
          >
            [ TRY CALL LAB FREE ]
          </a>
          <a
            href="/call-lab-pro"
            className="inline-block bg-black text-white px-12 py-5 font-anton text-lg tracking-wider hover:bg-[#333] transition-colors"
          >
            [ UPGRADE TO PRO ]
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-[#333] py-10 px-5 text-center">
        <p className="text-[#666] text-sm mb-2">
          <strong>Tim Kilroy</strong> - Agency Consultant & Coach
        </p>
        <p className="text-sm">
          <a href="https://timkilroy.com" className="text-[#E51B23] hover:underline">timkilroy.com</a>
          {' '}&bull;{' '}
          <a href="/agency-inner-circle" className="text-[#E51B23] hover:underline">Agency Inner Circle Newsletter</a>
        </p>
        <p className="text-[#333] text-sm mt-5">
          &copy; {new Date().getFullYear()} Tim Kilroy. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
