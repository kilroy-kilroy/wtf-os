import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WTF Sales Method - The Trust Layer Every Framework Skips | Tim Kilroy',
  description: 'A 3-pillar framework for trust-based selling that makes SPIN, Challenger, Sandler, and every other sales methodology actually work.',
};

export default function WTFSalesGuidePage() {
  return (
    <div className="min-h-screen bg-black text-white font-poppins">
      {/* Hero */}
      <section className="py-20 px-5 text-center border-b-2 border-[#333]">
        <h1 className="font-anton text-[clamp(48px,10vw,64px)] text-[#E51B23] tracking-wider mb-5">
          <span className="text-[#FFDE59]">WTF</span> SALES METHOD
        </h1>
        <p className="text-2xl font-semibold mb-8">
          The Trust Layer Every Other Framework Skips
        </p>
        <p className="text-lg text-[#FFDE59] max-w-[700px] mx-auto leading-relaxed">
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
            You have been trained in <span className="text-[#FFDE59] font-bold">SPIN Selling</span>. Or{' '}
            <span className="text-[#FFDE59] font-bold">Challenger</span>. Or{' '}
            <span className="text-[#FFDE59] font-bold">Sandler</span>. Or{' '}
            <span className="text-[#FFDE59] font-bold">MEDDIC</span>. Or{' '}
            <span className="text-[#FFDE59] font-bold">Gap Selling</span>.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            <strong className="text-white">They are all tactical frameworks.</strong>
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            They tell you <strong className="text-white">what questions to ask</strong> or{' '}
            <strong className="text-white">how to position value</strong> or{' '}
            <strong className="text-white">when to push back</strong>.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            But they all assume the same thing:
          </p>

          <div className="bg-[#FFDE59] text-black p-8 my-10 font-anton text-xl font-semibold leading-relaxed tracking-wider uppercase">
            The buyer already trusts you.
          </div>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            That is a <strong className="text-white">HUGE</strong> problem.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            <strong className="text-white"><span className="text-[#FFDE59] font-bold">SPIN</span> does not work if the buyer will not answer your diagnostic questions.</strong><br />
            <strong className="text-white"><span className="text-[#FFDE59] font-bold">Challenger</span> does not work if the buyer thinks you are just trying to close them.</strong><br />
            <strong className="text-white"><span className="text-[#FFDE59] font-bold">Sandler</span> does not work if the buyer will not tolerate your disqualification.</strong><br />
            <strong className="text-white"><span className="text-[#FFDE59] font-bold">MEDDIC</span> does not work if you cannot get access to decision-makers.</strong><br />
            <strong className="text-white"><span className="text-[#FFDE59] font-bold">Gap Selling</span> does not work if the buyer will not show you their gaps.</strong>
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            None of these frameworks teach you how to build trust first.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5 font-anton text-[#FFDE59] tracking-wider">
            That is what the <span className="text-white font-bold">WTF Sales Method</span> does.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed">
            It is not a replacement for your tactical framework.{' '}
            <strong className="text-[#FFDE59]">WTF Sales is the foundation that makes your tactical framework work.</strong>
          </p>
        </section>

        {/* The 3 Pillars */}
        <section className="mb-20">
          <h2 className="font-anton text-[42px] text-[#E51B23] tracking-wider mb-8">
            THE 3 PILLARS
          </h2>

          <p className="text-lg text-[#CCC] leading-relaxed mb-10">
            Master the 3 pillars of the <strong className="text-white font-bold">WTF Sales Method</strong> to 10x the effectiveness of any other sales methodology.
          </p>

          {/* Pillar 1 */}
          <div className="bg-[#1A1A1A] border-l-4 border-[#E51B23] p-10 my-10">
            <div className="font-anton text-[72px] text-[#E51B23] leading-none mb-4">01</div>
            <h3 className="font-anton text-[28px] tracking-wider mb-5">RADICAL RELEVANCE</h3>
            <p className="text-[#CCC] leading-relaxed mb-5">
              <strong className="text-white">Show them you understand their world before you pitch your solution.</strong>
            </p>
            <p className="text-[#CCC] leading-relaxed mb-5">
              This is cultural shorthand. Peer validation. The moment they think: <em><strong className="text-white">&quot;This person gets it.&quot;</strong></em>
            </p>
            <p className="text-[#CCC] leading-relaxed mb-5">
              Most sales meetings start with &quot;Tell me about your business.&quot;
            </p>
            <p className="text-[#CCC] leading-relaxed mb-5">
              <strong className="text-white">That is just lazy.</strong> It screams, &quot;I did not care enough about this meeting to prep.&quot;
            </p>
            <p className="text-[#CCC] leading-relaxed mb-3">
              The <strong className="text-white font-bold">WTF Method</strong> seller leads with <strong className="text-white">proof of understanding:</strong>
            </p>
            <ul className="list-disc pl-8 mb-5 space-y-3">
              <li className="text-[#CCC]">&quot;Most agencies your size are struggling with X right now. Is that hitting you too?&quot;</li>
              <li className="text-[#CCC]">&quot;I saw you just launched Y. That usually means Z is about to become a problem.&quot;</li>
              <li className="text-[#CCC]">&quot;You are probably dealing with [specific pain point]. Every agency at your stage does.&quot;</li>
            </ul>
            <p className="text-[#CCC] leading-relaxed mb-5">
              You are not guessing. You are demonstrating pattern recognition.
            </p>
            <p className="text-[#CCC] leading-relaxed">
              <strong className="text-white">Why it works:</strong> Clients choose partners who understand their context. When you articulate their problem better than they can, you have just earned the authority to solve it.
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
              Not free strategy sessions. Not free consulting. Give insights, connections, frameworks...the things that make them smarter whether they buy or not.
            </p>
            <p className="text-[#CCC] leading-relaxed mb-5">
              This is the opposite of <em><strong className="text-white">&quot;always be closing.&quot;</strong></em>
            </p>
            <p className="text-[#CCC] leading-relaxed mb-3">
              This is <strong className="text-[#FFDE59]">&quot;always be giving.&quot;</strong>
            </p>
            <ul className="list-disc pl-8 mb-5 space-y-3">
              <li className="text-[#CCC]">&quot;Here is the framework we use with clients like you. Even if we do not work together, this will help.&quot;</li>
              <li className="text-[#CCC]">&quot;I can intro you to someone who solved this exact problem. No strings attached.&quot;</li>
              <li className="text-[#CCC]">&quot;Let me send you our diagnostic tool. Run it yourself. You will know within 10 minutes if we can help.&quot;</li>
            </ul>
            <p className="text-[#CCC] leading-relaxed">
              <strong className="text-white">Why it works:</strong> Generosity creates reciprocity. When you give first, buyers feel comfortable giving back. Usually with their time, attention, and honesty.
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
              Ask for permission at every stage. Remove all buyer resistance by making them a co-author of the sale.
            </p>
            <p className="text-[#CCC] leading-relaxed mb-5">
              Most sellers push forward motion: &quot;Let me send you a proposal.&quot; &quot;I will schedule a follow-up.&quot; &quot;Here is what we should do next.&quot;
            </p>
            <p className="text-[#CCC] leading-relaxed mb-3">
              That is pressure. Even when it is subtle. Instead, ask permission:
            </p>
            <ul className="list-disc pl-8 mb-5 space-y-3">
              <li className="text-[#CCC]">&quot;Is this all on point so far, or do we need to adjust?&quot;</li>
              <li className="text-[#CCC]">&quot;Want me to show you how this works?&quot;</li>
              <li className="text-[#CCC]">&quot;Should we keep going or do you need to think about it?&quot;</li>
              <li className="text-[#CCC]">&quot;Would it make sense to explore this further?&quot;</li>
            </ul>
            <p className="text-[#CCC] leading-relaxed">
              <strong className="text-white">Why it works:</strong> When buyers give permission, they own the decision. They are not being sold. They are choosing to buy.
            </p>
          </div>
        </section>

        {/* How to Deploy It */}
        <section className="mb-20">
          <h2 className="font-anton text-[42px] text-[#E51B23] tracking-wider mb-8">
            HOW TO DEPLOY IT
          </h2>

          <p className="text-lg text-[#CCC] leading-relaxed mb-8">
            The <strong className="text-white font-bold">WTF Method</strong> is a progression, not a script. You do not deploy all three pillars at once. You layer them in sequence.
          </p>

          {/* Stage 1 */}
          <div className="mb-10">
            <h3 className="font-anton text-[24px] text-[#FFDE59] tracking-wider mb-4">
              Stage 1: Discovery / First Call
            </h3>
            <p className="text-[#CCC] mb-2"><strong className="text-white">Focus:</strong> Radical Relevance + Diagnostic Generosity</p>
            <p className="text-[#CCC] mb-4"><strong className="text-white">Goal:</strong> Prove you understand their world. Give them something valuable. Earn the right to the next conversation.</p>

            <div className="bg-[#1A1A1A] border-2 border-[#333] p-6 mb-4">
              <div className="text-[#E51B23] font-bold text-sm uppercase tracking-wider mb-3">Bad Discovery Opener</div>
              <p className="text-[#CCC] mb-2">&quot;Thanks for taking the time. I would love to learn more about your business and see if we might be a good fit.&quot;</p>
              <p className="text-[#999] text-sm italic">Why it fails: Generic. Lazy. Makes it a qualification rather than discovery.</p>
            </div>

            <div className="bg-[#1A1A1A] border-2 border-[#333] p-6">
              <div className="text-green-500 font-bold text-sm uppercase tracking-wider mb-3">Good Discovery Opener</div>
              <p className="text-[#CCC] mb-2">&quot;I looked at your site and your client roster. You are punching above your weight class—going after enterprise clients with a 12-person team. That usually means you are either nailing positioning or you are drowning in custom scopes. Which one is it?&quot;</p>
              <p className="text-[#999] text-sm italic">Why it works: Demonstrates understanding. Shows pattern recognition. Makes them want to talk.</p>
            </div>
          </div>

          {/* Stage 2 */}
          <div className="mb-10">
            <h3 className="font-anton text-[24px] text-[#FFDE59] tracking-wider mb-4">
              Stage 2: Demo / Presentation
            </h3>
            <p className="text-[#CCC] mb-2"><strong className="text-white">Focus:</strong> Diagnostic Generosity + Permission-Based Progression</p>
            <p className="text-[#CCC] mb-4"><strong className="text-white">Goal:</strong> Show them how you solve their problem. Check for understanding at every step. Make them co-author the solution.</p>

            <div className="bg-[#1A1A1A] border-2 border-[#333] p-6 mb-4">
              <div className="text-[#E51B23] font-bold text-sm uppercase tracking-wider mb-3">Bad Demo Flow</div>
              <p className="text-[#CCC] mb-2">&quot;Let me walk you through all our features. We have X, Y, and Z. Most clients love this part. Here is how it works...&quot;</p>
              <p className="text-[#999] text-sm italic">Why it fails: Feature dump. No permission checkpoints. They are being presented to, not engaged.</p>
            </div>

            <div className="bg-[#1A1A1A] border-2 border-[#333] p-6">
              <div className="text-green-500 font-bold text-sm uppercase tracking-wider mb-3">Good Demo Flow</div>
              <p className="text-[#CCC] mb-2">&quot;Based on what you told me last week, you are stuck on [specific problem]. Want to see how we solve that? [Wait for yes.] Cool. This is the framework we use. Does this map to how you are thinking about it? [Wait for confirmation.] Good. Let me show you how it works in practice...&quot;</p>
              <p className="text-[#999] text-sm italic">Why it works: Permission at every turn. Confirms relevance. Keeps them engaged.</p>
            </div>
          </div>

          {/* Stage 3 */}
          <div>
            <h3 className="font-anton text-[24px] text-[#FFDE59] tracking-wider mb-4">
              Stage 3: Close / Negotiation
            </h3>
            <p className="text-[#CCC] mb-2"><strong className="text-white">Focus:</strong> All 3 Pillars</p>
            <p className="text-[#CCC] mb-4"><strong className="text-white">Goal:</strong> Make the close feel inevitable. Remove all resistance. Let them choose to buy.</p>

            <div className="bg-[#1A1A1A] border-2 border-[#333] p-6 mb-4">
              <div className="text-[#E51B23] font-bold text-sm uppercase tracking-wider mb-3">Bad Closing Approach</div>
              <p className="text-[#CCC] mb-2">&quot;So what do you think? Ready to move forward? I can get you started next week. Just need you to sign here.&quot;</p>
              <p className="text-[#999] text-sm italic">Why it fails: Pressure. Assumes the close. Forces a decision.</p>
            </div>

            <div className="bg-[#1A1A1A] border-2 border-[#333] p-6">
              <div className="text-green-500 font-bold text-sm uppercase tracking-wider mb-3">Good Closing Approach</div>
              <p className="text-[#CCC] mb-2">&quot;So we have covered how this works, what it costs, and what your team would need to do. Does this feel like the right move for you? [Wait. Listen to their answer. Address their concerns...like a real human being.]&quot;</p>
              <p className="text-[#999] text-sm italic">Why it works: No pressure. Opens the door for objections. Shares decision-making authority.</p>
            </div>
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
            <strong className="text-white">Opening (0-5 minutes):</strong> Trust starts at zero. You are a stranger. They are skeptical.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            <strong className="text-white">Discovery (5-15 minutes):</strong> Trust builds if you demonstrate radical relevance. Drops if you are generic.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            <strong className="text-white">Presentation (15-30 minutes):</strong> Trust compounds if you are giving value. Drops if you are pitching too hard.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            <strong className="text-white">Close (30+ minutes):</strong> Trust peaks if you have earned permission. Drops if you push.
          </p>

          <div className="bg-[#FFDE59] text-black p-8 my-10 font-anton text-xl font-semibold leading-relaxed tracking-wider uppercase">
            The buyer decides whether to buy you in the first 10 minutes. They decide whether to buy your solution in the last 10 minutes.
          </div>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            Most sellers rush to close. They give a scripted pitch & push for a sale.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            <strong className="text-[#FFDE59] font-bold">WTF?</strong> No wonder prospects do not close.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-8">
            <strong className="text-white">The truth:</strong> If you have not built trust throughout the discussion, there is never going to be an opportunity to close.
          </p>

          <h3 className="font-anton text-[24px] text-[#FFDE59] tracking-wider mt-10 mb-5">
            What Kills Trust:
          </h3>
          <ul className="list-disc pl-8 mb-8 space-y-3">
            <li className="text-[#CCC]">Generic openers (&quot;Tell me about your business&quot;)</li>
            <li className="text-[#CCC]">Feature dumps (showing everything instead of solving their problem)</li>
            <li className="text-[#CCC]">Pushy closes (assuming forward motion without permission)</li>
            <li className="text-[#CCC]">Giving away strategy for free (free consulting diminishes the need for a decision)</li>
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
      </div>

      {/* CTA Section 1 */}
      <section className="bg-[#E51B23] py-16 px-5 text-center">
        <h2 className="font-anton text-[clamp(28px,5vw,42px)] text-white mb-5 tracking-wider">
          STOP WONDERING &quot;WHY THE F*CK DIDN&apos;T THIS DEAL CLOSE?&quot;
        </h2>
        <p className="text-white/90 text-lg mb-8 max-w-[700px] mx-auto">
          SalesOS Call Lab shows you how to build trust throughout your sales calls.<br />
          SalesOS Call Lab Pro tracks your sales progress, gives you active sales coaching<br />
          & creates radically relevant follow up emails automagically.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://timkilroy.com/call-lab"
            className="inline-block bg-[#FFDE59] text-black px-12 py-5 font-anton text-lg tracking-wider hover:bg-white transition-colors"
          >
            [ TRY CALL LAB FREE ]
          </a>
          <a
            href="https://timkilroy.com/call-lab-pro"
            className="inline-block bg-black text-white px-12 py-5 font-anton text-lg tracking-wider hover:bg-[#333] transition-colors"
          >
            [ GET CALL LAB PRO - $29/MO ]
          </a>
        </div>
      </section>

      <div className="max-w-[800px] mx-auto px-5 py-16">
        {/* Integration with Other Frameworks */}
        <section className="mb-20">
          <h2 className="font-anton text-[42px] text-[#E51B23] tracking-wider mb-8">
            USING <span className="text-[#FFDE59]">WTF</span> WITH OTHER FRAMEWORKS
          </h2>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            The <strong className="text-white font-bold">WTF Method</strong> is not a replacement. It is a foundation.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-8">
            Here is how it integrates with the frameworks you already use:
          </p>

          {[
            {
              title: 'WTF + SPIN Selling',
              first: 'Build radical relevance by showing you understand their context.',
              second: 'Deploy Situation/Problem/Implication/Need-Payoff questions.',
              why: 'Buyers answer SPIN questions honestly when they trust you have already done the homework.'
            },
            {
              title: 'WTF + Challenger',
              first: 'Establish diagnostic generosity by teaching them something they do not know.',
              second: 'Challenge their assumptions with your unique insight.',
              why: 'Buyers accept your challenge when you have already given them value.'
            },
            {
              title: 'WTF + Sandler',
              first: 'Use permission-based progression to establish equal business stature.',
              second: 'Deploy the Sandler pain funnel and disqualification tactics.',
              why: 'Buyers tolerate Sandler\'s direct approach when you have removed pressure first.'
            },
            {
              title: 'WTF + MEDDIC',
              first: 'Use radical relevance to get access to economic buyers and champions.',
              second: 'Map Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion.',
              why: 'Buyers give you access to decision-makers when you have proven you will not waste their time.'
            },
            {
              title: 'WTF + Gap Selling',
              first: 'Build trust through diagnostic generosity so buyers feel safe showing you their gaps.',
              second: 'Map current state vs. future state and the gap between them.',
              why: 'Buyers reveal their problems when they trust you will not use it against them.'
            }
          ].map((framework, idx) => (
            <div key={idx} className="mb-8">
              <h3 className="font-anton text-[24px] text-[#FFDE59] tracking-wider mb-4">
                <span className="text-white">WTF</span> + <span className="text-[#FFDE59]">{framework.title.split('+')[1].trim()}</span>
              </h3>
              <p className="text-[#CCC] leading-relaxed mb-2">
                <strong className="text-[#FFDE59]">WTF first:</strong> {framework.first}
              </p>
              <p className="text-[#CCC] leading-relaxed mb-2">
                <strong className="text-[#FFDE59]">{framework.title.split('+')[1].trim()} second:</strong> {framework.second}
              </p>
              <p className="text-[#CCC] leading-relaxed">
                <strong className="text-white">Why it works:</strong> {framework.why}
              </p>
            </div>
          ))}

          <div className="bg-[#FFDE59] text-black p-8 my-10 font-anton text-xl font-semibold leading-relaxed tracking-wider uppercase">
            <span className="text-[#E51B23]">WTF Sales Method</span> builds the <strong>foundation of trust</strong> & amplifies the impact of your tactical sales framework.
          </div>
        </section>

        {/* Track Your Progress */}
        <section className="mb-20">
          <h2 className="font-anton text-[42px] text-[#E51B23] tracking-wider mb-8">
            TRACK YOUR PROGRESS
          </h2>

          <p className="text-lg text-[#CCC] leading-relaxed mb-5">
            The <strong className="text-white font-bold">WTF Method</strong> is a skill. Like any skill, you get better by tracking your performance.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-8">
            That is where Call Lab Pro comes in.
          </p>

          <h3 className="font-anton text-[24px] text-[#FFDE59] tracking-wider mb-4">
            What Call Lab Pro Tracks:
          </h3>

          <div className="mb-6">
            <p className="text-[#CCC] leading-relaxed mb-2">
              <strong className="text-white">Radical Relevance Score:</strong> Did you demonstrate understanding before you pitched?
            </p>
            <ul className="list-disc pl-8 space-y-1 text-[#999]">
              <li>Pattern detection: What specific insights did you share?</li>
              <li>Cultural shorthand: Did you speak their language?</li>
              <li>Peer validation: Did you reference similar clients or situations?</li>
            </ul>
          </div>

          <div className="mb-6">
            <p className="text-[#CCC] leading-relaxed mb-2">
              <strong className="text-white">Diagnostic Generosity Score:</strong> Did you give value before asking for the sale?
            </p>
            <ul className="list-disc pl-8 space-y-1 text-[#999]">
              <li>Value delivered: What frameworks, tools, or insights did you share?</li>
              <li>Teaching moments: When did you educate vs. pitch?</li>
              <li>Strategic giveaways: What did you give that did not give away strategy?</li>
            </ul>
          </div>

          <div className="mb-8">
            <p className="text-[#CCC] leading-relaxed mb-2">
              <strong className="text-white">Permission-Based Progression Score:</strong> Did you ask or did you push?
            </p>
            <ul className="list-disc pl-8 space-y-1 text-[#999]">
              <li>Permission checkpoints: How many times did you ask &quot;Does this make sense?&quot;</li>
              <li>Pressure points: When did you assume forward motion without asking?</li>
              <li>Co-authoring: Did you make them part of the solution design?</li>
            </ul>
          </div>

          <h3 className="font-anton text-[24px] text-[#FFDE59] tracking-wider mb-4">
            Your Trust Curve (Pro Only)
          </h3>

          <p className="text-lg text-[#CCC] leading-relaxed mb-4">
            Call Lab Pro maps your trust curve across every call. You will see:
          </p>
          <ul className="list-disc pl-8 mb-8 space-y-2 text-[#CCC]">
            <li>When trust builds (what you said that worked)</li>
            <li>When trust drops (what you said that did not)</li>
            <li>Your trust peak (the moment they decided to buy you)</li>
            <li>Your conversion probability (based on trust curve shape)</li>
          </ul>

          <p className="text-lg text-[#CCC] leading-relaxed mb-4">
            After 10 calls, you will know YOUR patterns. What YOU do that works. What YOU do that kills deals.
          </p>

          <p className="text-lg text-[#CCC] leading-relaxed mb-8">
            That is not theory. That is your actual data.
          </p>

          <div className="bg-[#FFDE59] text-black p-8 my-10 font-anton text-lg font-semibold leading-relaxed tracking-wider uppercase">
            Tactical sales methodologies tell you what to say. The <span className="text-[#E51B23]">WTF Sales Method</span> gives you the authority & positioning to say it.<br /><br />SalesOS Call Lab Pro gives you the tracking, tools & insight to maximize your performance.
          </div>
        </section>
      </div>

      {/* Final CTA Section */}
      <section className="bg-[#E51B23] py-16 px-5 text-center">
        <h2 className="font-anton text-[clamp(32px,5vw,42px)] text-white mb-5 tracking-wider">
          GET STARTED
        </h2>
        <p className="text-white/90 text-lg mb-8">
          Amplify your sales performance with the <strong className="text-white font-bold">WTF Sales Method</strong>.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://timkilroy.com/call-lab"
            className="inline-block bg-[#FFDE59] text-black px-12 py-5 font-anton text-lg tracking-wider hover:bg-white transition-colors"
          >
            [ TRY CALL LAB FREE ]
          </a>
          <a
            href="https://timkilroy.com/call-lab-pro"
            className="inline-block bg-black text-white px-12 py-5 font-anton text-lg tracking-wider hover:bg-[#333] transition-colors"
          >
            [ GET CALL LAB PRO - $29/MO ]
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
          <a href="https://www.agencyinnercircle.com" className="text-[#E51B23] hover:underline">Agency Inner Circle</a>
        </p>
        <p className="text-[#333] text-sm mt-5">
          &copy; 2025 KLRY LLC. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
