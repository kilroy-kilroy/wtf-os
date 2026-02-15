'use client';

import React, { useState } from 'react';
import { AnalysisReport } from '@/lib/visibility-lab/types';
import { Download, Youtube, Mic, Users, AlertTriangle, CheckCircle, Zap, Target, Skull, Activity, Layers, ArrowRight, Save, Share2, Swords, Microscope, PenTool, X, Copy } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';

interface Props {
  data: AnalysisReport;
  onReset: () => void;
}

export const Dashboard: React.FC<Props> = ({ data, onReset }) => {
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [currentDraft, setCurrentDraft] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftTopic, setDraftTopic] = useState("");

  const handlePrint = async () => {
    // For Next.js, we'll use a simpler approach - just print the page
    window.print();
  };

  const handleDownloadJson = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `demandos-report-${data.brandName.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = () => {
    const explainerUrl = `${window.location.origin}/growth-quadrant`;
    const text = `Just ran my Visibility Lab on TriOS.\n\nVisibility Score: ${data.visibilityScore}/100\n\nDiscover your agency growth archetype at ${explainerUrl}\n\nThanks @timkilroy!`;
    const linkedInUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
    window.open(linkedInUrl, '_blank');
  };

  const handleGenerateDraft = async (topic: string) => {
    setDraftTopic(topic);
    setDraftModalOpen(true);
    setIsDrafting(true);
    setCurrentDraft("");

    try {
      const response = await fetch('/api/visibility-lab/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          archetype: data.brandArchetype.name,
          brandName: data.brandName
        })
      });
      const result = await response.json();
      setCurrentDraft(result.draft || result.error || 'Error generating draft.');
    } catch {
      setCurrentDraft('System Error: Could not generate draft.');
    }
    setIsDrafting(false);
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(currentDraft);
    alert("Draft copied to clipboard!");
  };

  return (
    <div id="dashboard-content" className="min-h-screen bg-black text-white pb-20 font-poppins">

      {/* INSTANT FIX MODAL */}
      {draftModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-[#1a1a1a] border-2 border-brand-yellow w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
             <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black">
                <h3 className="text-brand-yellow font-anton text-xl uppercase flex items-center gap-2">
                   <PenTool size={20} /> Instant Fix Generator
                </h3>
                <button onClick={() => setDraftModalOpen(false)} className="text-gray-500 hover:text-white">
                   <X size={24} />
                </button>
             </div>
             <div className="p-6 overflow-y-auto flex-grow">
                <div className="mb-4">
                   <span className="text-xs text-gray-500 uppercase font-bold">TOPIC</span>
                   <h4 className="text-white font-bold text-lg">{draftTopic}</h4>
                </div>

                {isDrafting ? (
                    <div className="space-y-3 animate-pulse">
                        <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-800 rounded w-full"></div>
                        <div className="h-4 bg-gray-800 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                    </div>
                ) : (
                    <div className="bg-black p-6 border border-gray-700 whitespace-pre-wrap font-mono text-sm text-gray-300 leading-relaxed">
                        {currentDraft}
                    </div>
                )}
             </div>
             {!isDrafting && (
                 <div className="p-4 border-t border-gray-700 bg-black flex justify-end">
                     <button
                        onClick={handleCopyDraft}
                        className="bg-brand-red text-white px-6 py-3 font-anton uppercase hover:bg-white hover:text-brand-red transition-colors flex items-center gap-2"
                     >
                        <Copy size={18} /> Copy to Clipboard
                     </button>
                 </div>
             )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b-4 border-brand-red bg-[#1a1a1a] p-6 sticky top-0 z-50 shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
          <div>
            <div className="text-brand-yellow text-xs font-mono mb-1">DEMAND_OS REPORT // {new Date().toLocaleDateString()}</div>
            <h1 className="text-3xl md:text-4xl text-white font-anton uppercase tracking-wide">VISIBILITY ENGINE: <span className="text-brand-red">{data.brandName}</span></h1>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={onReset} className="px-4 py-2 border border-gray-600 hover:border-white text-sm font-poppins uppercase transition-colors">
              New Analysis
            </button>
            <button onClick={handleShare} className="bg-[#0077b5] text-white px-4 py-2 font-anton uppercase hover:bg-white hover:text-[#0077b5] transition-colors flex items-center gap-2">
               <Share2 size={18} /> Share
            </button>
            <button onClick={handleDownloadJson} className="bg-[#1a1a1a] border border-gray-600 text-white px-4 py-2 font-anton uppercase hover:border-brand-yellow hover:text-brand-yellow transition-colors flex items-center gap-2">
              <Save size={18} /> Save Data
            </button>
            <button onClick={handlePrint} className="bg-brand-yellow text-black px-6 py-2 font-anton uppercase hover:bg-white transition-colors flex items-center gap-2">
              <Download size={18} /> Export PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-12 mt-8">

        {/* SECTION 1: THE REALITY CHECK (Score + Summary) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Score Card */}
          <div className="lg:col-span-4 bg-[#1a1a1a] border border-gray-800 p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px] group hover:border-brand-red transition-colors">
            <div className="absolute top-0 right-0 p-2 bg-brand-red text-xs font-bold uppercase tracking-widest">Visibility Score</div>
            <div className="relative">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle className="text-gray-800" strokeWidth="12" stroke="currentColor" fill="transparent" r="80" cx="96" cy="96" />
                <circle
                  className={`${data.visibilityScore > 70 ? 'text-brand-yellow' : data.visibilityScore > 40 ? 'text-brand-red' : 'text-gray-600'}`}
                  strokeWidth="12"
                  strokeDasharray={502}
                  strokeDashoffset={502 - (502 * data.visibilityScore) / 100}
                  strokeLinecap="butt"
                  stroke="currentColor"
                  fill="transparent"
                  r="80"
                  cx="96"
                  cy="96"
                />
              </svg>
              <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                <span className="text-6xl font-anton text-white">{data.visibilityScore}</span>
                <span className="text-sm text-gray-400 font-mono">/100</span>
              </div>
            </div>
            <div className="mt-6 text-center w-full">
              {data.brandArchetype?.name && (
                <>
                  <div className="text-brand-yellow font-anton text-xl uppercase mb-1 leading-none">
                    AI Assessment: {data.brandArchetype.name}
                  </div>
                  <div className="text-[10px] text-gray-400 italic mb-3">
                    &quot;{data.brandArchetype.reasoning}&quot;
                  </div>
                </>
              )}
              <a
                href="/growth-quadrant"
                className="inline-block text-xs text-brand-red hover:text-brand-yellow transition-colors uppercase font-bold tracking-wider border border-brand-red/30 px-3 py-1 hover:border-brand-yellow/50"
              >
                View Your Growth Quadrant Placement &rarr;
              </a>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="lg:col-span-8 bg-white text-black p-8 border-l-8 border-brand-red shadow-[8px_8px_0px_0px_#E51B23] flex flex-col">
            <h3 className="text-3xl text-brand-red mb-6 flex items-center gap-3 font-anton uppercase">
              <AlertTriangle size={32} /> Diagnosis: {data.visibilityScore < 50 ? "Critical" : "Stable"}
            </h3>
            <p className="font-poppins text-lg leading-relaxed whitespace-pre-wrap flex-grow">
              {data.executiveSummary}
            </p>
          </div>
        </div>

        {/* SECTION 1.5: NARRATIVE DISSONANCE (The Forensic Audit) */}
        {data.narrativeDissonance && (
            <div className="bg-black border border-gray-800 p-1">
                <div className="bg-gray-900 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h3 className="text-2xl text-white font-anton uppercase flex items-center gap-2">
                            <Microscope className="text-brand-yellow" /> Forensic Audit
                        </h3>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 uppercase font-bold">Dissonance Score</span>
                            <div className="flex items-center bg-black border border-gray-700 px-3 py-1">
                                <span className={`font-mono font-bold text-lg ${data.narrativeDissonance.dissonanceScore > 5 ? 'text-brand-red' : 'text-green-500'}`}>
                                    {data.narrativeDissonance.dissonanceScore}/10
                                </span>
                                <span className="text-xs ml-2 text-gray-400 uppercase">{data.narrativeDissonance.label}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-700 font-mono text-sm">
                        <div className="p-4 bg-black border-b md:border-b-0 md:border-r border-gray-700">
                            <span className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">THE CLAIM (INPUT)</span>
                            <div className="text-green-500">
                                <span className="mr-2">+</span>{data.narrativeDissonance.claim}
                            </div>
                        </div>
                        <div className="p-4 bg-black">
                             <span className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">THE REALITY (SEARCH)</span>
                             <div className="text-brand-red">
                                <span className="mr-2">-</span>{data.narrativeDissonance.reality}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}


        {/* SECTION 2: THE DANGER ZONES (Fear of Missing Out) */}
        <div className="border border-brand-red bg-black p-1">
            <div className="bg-brand-red/10 p-8 border border-brand-red/30">
                <div className="flex items-center gap-3 mb-6">
                    <Skull className="text-brand-red" size={32} />
                    <h3 className="text-3xl text-white font-anton uppercase tracking-wide">Decision Danger Zones</h3>
                </div>
                <p className="text-gray-400 mb-8 max-w-3xl">
                    Your prospects are making hiring decisions in these channels right now. You are effectively invisible, meaning you are losing revenue to competitors who simply showed up.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {data.visibilityLeaks.map((leak, idx) => (
                        <div key={idx} className="bg-black border-t-4 border-brand-red p-6 relative">
                            <div className="absolute top-2 right-2">
                                <span className={`text-xs font-bold px-3 py-1 uppercase border-2 border-white shadow-lg ${
                                    leak.revenueRisk === 'Critical' ? 'bg-brand-red text-white' :
                                    leak.revenueRisk === 'High' ? 'bg-orange-600 text-white' : 'bg-yellow-600 text-black'
                                }`}>
                                    {leak.revenueRisk} Risk
                                </span>
                            </div>
                            <h4 className="text-xl text-brand-red font-anton mb-3">{leak.zone}</h4>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs text-gray-500 uppercase font-bold">Buyer Behavior</span>
                                    <p className="text-sm text-gray-300">{leak.buyerBehavior}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 uppercase font-bold">Your Status</span>
                                    <p className="text-sm text-brand-yellow font-medium">{leak.brandStatus}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* SECTION 3: COMPETITOR BATTLECARDS (NEW) */}
        <div>
             <h3 className="text-3xl text-white mb-6 flex items-center gap-3 font-anton uppercase">
                <Swords className="text-brand-yellow" size={32} /> Competitor Intel
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.competitors.map((comp, idx) => (
                  <div key={idx} className="bg-[#1a1a1a] border border-gray-800 p-6">
                      <div className="flex justify-between items-start mb-4">
                          <h4 className="text-xl text-white font-anton">{comp.name}</h4>
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 ${
                              comp.threatLevel === 'High' ? 'bg-brand-red text-white' : 'bg-gray-700 text-gray-300'
                          }`}>
                             {comp.threatLevel || 'Medium'} Threat
                          </span>
                      </div>
                      <div className="space-y-4">
                          <div>
                              <span className="text-xs text-gray-500 font-bold uppercase">Their Hook</span>
                              <p className="text-sm text-gray-300 italic">&quot;{comp.positioning}&quot;</p>
                          </div>
                          <div>
                              <span className="text-xs text-brand-red font-bold uppercase">Their Weakness</span>
                              <p className="text-sm text-white">{comp.weakness}</p>
                          </div>
                          {comp.strength && (
                             <div>
                                <span className="text-xs text-brand-yellow font-bold uppercase">Their Strength</span>
                                <p className="text-sm text-gray-400">{comp.strength}</p>
                             </div>
                          )}
                      </div>
                  </div>
                ))}
             </div>
        </div>

        {/* SECTION 4: VVV AUDIT & RADAR CHART */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* VVV Audit */}
            <div className="bg-[#1a1a1a] border border-gray-800 p-8 flex flex-col">
                <h3 className="text-2xl text-white mb-6 flex items-center gap-2 font-anton">
                    <Activity className="text-brand-yellow" /> VVV PULSE CHECK
                </h3>

                {/* RADAR CHART IMPLEMENTATION */}
                {data.vibeRadar && (
                    <div className="h-[250px] w-full mb-6 -ml-4">
                         <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.vibeRadar}>
                            <PolarGrid stroke="#333" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#999', fontSize: 10, fontFamily: 'Poppins' }} />
                            <Radar
                                name="Brand Vibe"
                                dataKey="A"
                                stroke="#E51B23"
                                strokeWidth={2}
                                fill="#E51B23"
                                fillOpacity={0.3}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', borderColor: '#333' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-4">
                        <span className="font-anton text-xl text-white">CLARITY SCORE</span>
                        <span className="font-anton text-xl text-brand-yellow">{data.vvvAudit.clarityScore}/10</span>
                </div>

                <div className="grid gap-4 flex-grow">
                        <div className="bg-black p-4 border-l-2 border-brand-red">
                            <span className="text-xs text-brand-red font-bold uppercase block mb-1">VIBES</span>
                            <p className="text-sm text-gray-300">{data.vvvAudit.vibes}</p>
                        </div>
                        <div className="bg-black p-4 border-l-2 border-brand-red">
                            <span className="text-xs text-brand-red font-bold uppercase block mb-1">VISION</span>
                            <p className="text-sm text-gray-300">{data.vvvAudit.vision}</p>
                        </div>
                        <div className="bg-black p-4 border-l-2 border-brand-red">
                            <span className="text-xs text-brand-red font-bold uppercase block mb-1">VALUES</span>
                            <p className="text-sm text-gray-300">{data.vvvAudit.values}</p>
                        </div>
                </div>
            </div>

            {/* Core Strengths */}
            <div className="bg-black border border-gray-800 p-8 flex flex-col">
                <h3 className="text-2xl text-white mb-6 flex items-center gap-2 font-anton">
                    <Zap className="text-brand-yellow" /> UNFAIR ADVANTAGES
                </h3>
                <div className="space-y-4 flex-grow">
                    {data.coreStrengths.map((strength, idx) => (
                        <div key={idx} className="flex items-start gap-4 p-4 bg-[#1a1a1a] border border-gray-800 hover:border-brand-yellow transition-all group">
                            <div className="mt-1 p-1 bg-brand-yellow text-black rounded-full">
                                <CheckCircle size={16} />
                            </div>
                            <div>
                                <p className="text-base text-white font-medium group-hover:text-brand-yellow transition-colors">{strength}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* SECTION 5: CONTENT BATTLEGROUND */}
        <div className="bg-[#1a1a1a] border border-gray-800 p-8">
          <h3 className="text-3xl text-white mb-2 flex items-center gap-3 font-anton uppercase">
            <Target className="text-brand-red" /> Content Battleground
          </h3>
          <p className="text-gray-400 mb-8">Where competitors are weak and you can dominate.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.contentGaps.map((gap, idx) => (
              <div key={idx} className="bg-black border border-gray-800 p-6 relative group hover:border-brand-yellow transition-all flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-xl font-anton text-white group-hover:text-brand-yellow leading-tight">{gap.topic}</h4>
                </div>

                <div className="space-y-4 flex-grow mb-4">
                  <div>
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Why Competitors Fail</div>
                    <p className="text-sm text-gray-400 leading-snug">{gap.competitorNeglect}</p>
                  </div>

                  <div className="border-t border-gray-800 pt-3 mt-auto">
                    <div className="text-xs text-brand-yellow uppercase font-bold mb-1">Your DemandOS Angle</div>
                    <p className="text-sm text-white leading-snug">{gap.yourAdvantage}</p>
                  </div>
                </div>

                {/* INSTANT FIX BUTTON */}
                <button
                    onClick={() => handleGenerateDraft(gap.topic)}
                    className="w-full bg-brand-red/10 text-brand-red border border-brand-red hover:bg-brand-red hover:text-white transition-colors uppercase font-bold text-xs py-2 flex items-center justify-center gap-2 mb-4"
                >
                    <PenTool size={14} /> Generate Draft
                </button>

                <div className="pt-4 border-t border-gray-800 flex justify-between items-center mt-auto">
                    <span className="text-xs text-gray-600 font-mono">OPPORTUNITY SCORE</span>
                    <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${i < gap.opportunityScore ? 'bg-brand-red' : 'bg-gray-800'}`} />
                        ))}
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 6: DEMAND_OS EXECUTION (Strategy Grid) */}
        <div>
          <h3 className="text-3xl text-white mb-6 pl-4 border-l-8 border-brand-yellow font-anton uppercase">DemandOS Execution</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* YouTube - ACTION */}
            <div className="bg-[#1a1a1a] p-6 border-t-4 border-[#FF0000]">
              <div className="flex items-center gap-3 mb-2 text-[#FF0000]">
                <Youtube size={32} />
                <h4 className="text-2xl text-white font-anton">PRODUCE VIDEO</h4>
              </div>
              <p className="text-xs text-gray-400 mb-4 uppercase tracking-wider">Directive: Film & Publish Weekly</p>

              <div className="mb-4 bg-black p-3 border-l-2 border-[#FF0000]">
                  <span className="text-xs text-[#FF0000] font-bold block mb-1">TEAM EXECUTION</span>
                  <p className="text-xs text-gray-300">{data.youtubeStrategy.teamExecution}</p>
              </div>
              <ul className="space-y-3">
                {data.youtubeStrategy.topics.map((topic, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <div className="min-w-[6px] h-[6px] mt-1.5 bg-[#FF0000] rounded-full" />
                    {topic}
                  </li>
                ))}
              </ul>
            </div>

             {/* Podcasts - ACTION */}
             <div className="bg-[#1a1a1a] p-6 border-t-4 border-brand-yellow">
              <div className="flex items-center gap-3 mb-2 text-brand-yellow">
                <Mic size={32} />
                <h4 className="text-2xl text-white font-anton">LAUNCH PODCAST</h4>
              </div>
              <p className="text-xs text-gray-400 mb-4 uppercase tracking-wider">Directive: Own The Narrative</p>

              <div className="mb-4 bg-black p-3 border-l-2 border-brand-yellow">
                  <span className="text-xs text-brand-yellow font-bold block mb-1">TEAM EXECUTION</span>
                  <p className="text-xs text-gray-300">{data.podcastStrategy.teamExecution}</p>
              </div>
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {data.podcastStrategy.specificTargets.map((target, i) => (
                    <span key={i} className="bg-gray-800 text-xs px-2 py-1 text-brand-yellow border border-brand-yellow/30">{target}</span>
                  ))}
                </div>
              </div>
            </div>

             {/* Events - ACTION */}
             <div className="bg-[#1a1a1a] p-6 border-t-4 border-brand-red">
              <div className="flex items-center gap-3 mb-2 text-brand-red">
                <Users size={32} />
                <h4 className="text-2xl text-white font-anton">BOOK STAGES</h4>
              </div>
              <p className="text-xs text-gray-400 mb-4 uppercase tracking-wider">Directive: Pitch Keynotes</p>

              <div className="mb-4 bg-black p-3 border-l-2 border-brand-red">
                  <span className="text-xs text-brand-red font-bold block mb-1">TEAM EXECUTION</span>
                  <p className="text-xs text-gray-300">{data.eventStrategy.teamExecution}</p>
              </div>
              <ul className="space-y-3">
                {data.eventStrategy.topics.map((topic, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <div className="min-w-[6px] h-[6px] mt-1.5 bg-brand-red rounded-full" />
                    {topic}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* SECTION 7: 90-DAY PROTOCOL */}
        <div className="bg-white text-black p-8 shadow-2xl">
          <h3 className="text-3xl mb-8 font-anton uppercase flex items-center gap-3">
            <Layers size={32} /> 90-Day Execution Protocol
          </h3>
          <div className="space-y-0">
            {data.ninetyDayPlan.map((phase, idx) => (
              <div key={idx} className="flex flex-col md:flex-row border-b border-gray-200 last:border-0 py-6 group hover:bg-gray-50 transition-colors">
                <div className="md:w-1/4 mb-4 md:mb-0">
                  <div className="text-brand-red font-bold text-lg">{phase.week}</div>
                  <div className="font-anton text-2xl uppercase">{phase.focus}</div>
                  <span className={`inline-block mt-2 px-2 py-1 text-xs font-bold uppercase ${phase.impact === 'High' ? 'bg-brand-red text-white' : 'bg-brand-yellow text-black'}`}>
                    {phase.impact} Impact
                  </span>
                </div>
                <div className="md:w-3/4 pl-0 md:pl-8 border-l-0 md:border-l-2 border-gray-100">
                  <ul className="space-y-3">
                    {phase.tasks.map((task, tIdx) => (
                      <li key={tIdx} className="flex items-start gap-3">
                         <CheckCircle size={20} className="text-gray-300 mt-0.5 flex-shrink-0" />
                         <span className="font-poppins text-gray-800">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center pt-12 pb-6 border-t border-gray-800 print:hidden">
           <h2 className="text-4xl font-anton text-white mb-4 uppercase">Turn This <span className="text-brand-yellow">Report</span> Into <span className="text-brand-red">Revenue</span>.</h2>
           <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
               You see the gaps. You see the leaks. The only question is whether you fix them or let competitors keep winning.
               Let&apos;s build your custom DemandOS engine.
           </p>
           <a
             href="https://calendly.com/kilroy/demandos-visibility-engine"
             target="_blank"
             rel="noreferrer"
             className="inline-flex items-center gap-3 bg-brand-red text-white font-anton text-xl px-10 py-5 hover:bg-white hover:text-brand-red transition-all uppercase tracking-widest shadow-[4px_4px_0px_0px_#FFDE59]"
           >
             Book Your Diagnostic <ArrowRight size={24} />
           </a>

           <div className="mt-12 text-[10px] text-gray-700 max-w-3xl mx-auto">
             <button onClick={onReset} className="mb-4 text-gray-500 hover:text-brand-red underline uppercase tracking-widest">
                Start Over / New Analysis
             </button>
             <p className="uppercase font-bold mb-1">DISCLAIMER</p>
             <p>
               This report is generated by Artificial Intelligence (DemandOS Visibility Engine) and is intended for informational and strategic planning purposes only.
               While we strive for accuracy, the insights, competitors, and scores provided are based on available public data and pattern matching.
               KLRY, LLC makes no warranties regarding the completeness or accuracy of this analysis.
               Implementation of these strategies is at the user&apos;s discretion.
             </p>
           </div>
        </div>

      </main>
    </div>
  );
};
