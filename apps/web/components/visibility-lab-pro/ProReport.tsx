'use client';

import React, { useState } from 'react';
import {
  VisibilityLabProReport,
  KilroyVisibilityIndex,
  KVIScore,
} from '@/lib/visibility-lab-pro/types';
import {
  Download, AlertTriangle, CheckCircle, Zap, Target,
  Skull, Activity, Layers, ArrowRight, Save, Share2,
  Swords, Microscope, X, Copy, PenTool, Eye,
  User, TrendingUp, TrendingDown, Minus, Search,
  MessageSquare, Flame, Brain, Radio, Shield,
} from 'lucide-react';
import {
  ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, Tooltip, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
} from 'recharts';

interface Props {
  data: VisibilityLabProReport;
  onReset: () => void;
}

// Score color helper
function getScoreColor(score: number): string {
  if (score >= 70) return '#4CAF50';
  if (score >= 40) return '#FFDE59';
  return '#E51B23';
}

function getGradeColor(grade: string): string {
  if (grade === 'A') return '#4CAF50';
  if (grade === 'B') return '#FFDE59';
  if (grade === 'C') return '#FF8C42';
  return '#E51B23';
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'Critical': return 'bg-[#E51B23] text-white';
    case 'Serious': return 'bg-[#FF8C42] text-white';
    case 'Moderate': return 'bg-[#FFDE59] text-black';
    case 'Healthy': return 'bg-[#4CAF50] text-white';
    default: return 'bg-[#333] text-white';
  }
}

function getTrajectoryIcon(trajectory: string) {
  switch (trajectory) {
    case 'Rising': return <TrendingUp size={14} className="text-[#E51B23]" />;
    case 'Declining': return <TrendingDown size={14} className="text-[#4CAF50]" />;
    default: return <Minus size={14} className="text-gray-500" />;
  }
}

// KVI dimension labels
const KVI_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  searchVisibility: { label: 'Search Visibility', icon: <Search size={16} /> },
  socialAuthority: { label: 'Social Authority', icon: <MessageSquare size={16} /> },
  contentVelocity: { label: 'Content Velocity', icon: <Flame size={16} /> },
  darkSocialPenetration: { label: 'Dark Social', icon: <Radio size={16} /> },
  competitiveShareOfVoice: { label: 'Share of Voice', icon: <Target size={16} /> },
  founderSignalStrength: { label: 'Founder Signal', icon: <User size={16} /> },
};

// Helper to access KVI dimensions by key
function getKviScore(kvi: KilroyVisibilityIndex, key: string): KVIScore | undefined {
  return (kvi as unknown as Record<string, KVIScore>)[key];
}

export const ProReport: React.FC<Props> = ({ data, onReset }) => {
  const [expandedCompetitor, setExpandedCompetitor] = useState<number | null>(null);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [currentDraft, setCurrentDraft] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftTopic, setDraftTopic] = useState("");

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `visibility-lab-pro-${data.brandName.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = () => {
    const shareUrl = "https://engine.timkilroy.com";
    const text = `Just got my Visibility Lab PRO report.\n\nKilroy Visibility Index: ${data.kvi.compositeScore}/100\nBrand Archetype: ${data.brandArchetype.name}\nOperator Type: ${data.operatorProfile?.operatorArchetype?.name || 'N/A'}\n\nGet yours at ${shareUrl}\n\nThanks @timkilroy!`;
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
  };

  // Build KVI radar data
  const kviRadarData = Object.entries(KVI_LABELS).map(([key, { label }]) => ({
    subject: label,
    A: getKviScore(data.kvi, key)?.score || 0,
    fullMark: 100,
  }));

  return (
    <div id="dashboard-content" className="min-h-screen bg-black text-white pb-20 font-poppins">

      {/* INSTANT FIX MODAL */}
      {draftModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-[#1a1a1a] border-2 border-[#FFDE59] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black">
              <h3 className="text-[#FFDE59] font-anton text-xl uppercase flex items-center gap-2">
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
                  className="bg-[#E51B23] text-white px-6 py-3 font-anton uppercase hover:bg-white hover:text-[#E51B23] transition-colors flex items-center gap-2"
                >
                  <Copy size={18} /> Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ════════════════════════════════════════ */}
      <header className="border-b-4 border-[#E51B23] bg-[#1a1a1a] p-6 sticky top-0 z-50 shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[#FFDE59] text-xs font-mono">DEMAND_OS PRO REPORT // {new Date().toLocaleDateString()}</span>
              <span className="bg-[#FFDE59] text-black text-[10px] font-anton uppercase px-2 py-0.5">PRO</span>
            </div>
            <h1 className="text-3xl md:text-4xl text-white font-anton uppercase tracking-wide">
              VISIBILITY LAB: <span className="text-[#E51B23]">{data.brandName}</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={onReset} className="px-4 py-2 border border-gray-600 hover:border-white text-sm font-poppins uppercase transition-colors">
              New Analysis
            </button>
            <button onClick={handleShare} className="bg-[#0077b5] text-white px-4 py-2 font-anton uppercase hover:bg-white hover:text-[#0077b5] transition-colors flex items-center gap-2">
              <Share2 size={18} /> Share
            </button>
            <button onClick={handleDownloadJson} className="bg-[#1a1a1a] border border-gray-600 text-white px-4 py-2 font-anton uppercase hover:border-[#FFDE59] hover:text-[#FFDE59] transition-colors flex items-center gap-2">
              <Save size={18} /> Save Data
            </button>
            <button onClick={handlePrint} className="bg-[#FFDE59] text-black px-6 py-2 font-anton uppercase hover:bg-white transition-colors flex items-center gap-2">
              <Download size={18} /> Export PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-12 mt-8">

        {/* ════════════════════════════════════════ */}
        {/* SECTION 1: KVI COMPOSITE SCORE + EXECUTIVE SUMMARY */}
        {/* ════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* KVI Score Card */}
          <div className="lg:col-span-4 bg-[#1a1a1a] border border-gray-800 p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-[350px] group hover:border-[#E51B23] transition-colors">
            <div className="absolute top-0 right-0 p-2 bg-[#FFDE59] text-black text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              <Eye size={12} /> KVI Score
            </div>
            <div className="relative">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle className="text-gray-800" strokeWidth="12" stroke="currentColor" fill="transparent" r="80" cx="96" cy="96" />
                <circle
                  className="transition-all duration-1000"
                  strokeWidth="12"
                  strokeDasharray={502}
                  strokeDashoffset={502 - (502 * data.kvi.compositeScore) / 100}
                  strokeLinecap="butt"
                  stroke={getScoreColor(data.kvi.compositeScore)}
                  fill="transparent"
                  r="80"
                  cx="96"
                  cy="96"
                />
              </svg>
              <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                <span className="text-6xl font-anton text-white">{data.kvi.compositeScore}</span>
                <span className="text-sm text-gray-400 font-mono">/100</span>
              </div>
            </div>
            <div className="mt-6 text-center w-full">
              <div className="text-[#FFDE59] font-anton text-2xl uppercase mb-2 leading-none">{data.brandArchetype.name}</div>
              <div className="text-[10px] text-gray-300 border-t border-gray-700 pt-2 italic">&quot;{data.brandArchetype.reasoning}&quot;</div>
            </div>
            <div className="mt-4">
              <span className={`text-xs font-bold px-3 py-1 uppercase ${getSeverityColor(data.diagnosisSeverity)}`}>
                {data.diagnosisSeverity}
              </span>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="lg:col-span-8 bg-white text-black p-8 border-l-8 border-[#E51B23] shadow-[8px_8px_0px_0px_#E51B23] flex flex-col">
            <h3 className="text-3xl text-[#E51B23] mb-6 flex items-center gap-3 font-anton uppercase">
              <AlertTriangle size={32} /> Executive Diagnosis
            </h3>
            <p className="font-poppins text-lg leading-relaxed whitespace-pre-wrap flex-grow">
              {data.executiveSummary}
            </p>
          </div>
        </div>

        {/* ════════════════════════════════════════ */}
        {/* SECTION 2: KILROY VISIBILITY INDEX (6 dimensions) */}
        {/* ════════════════════════════════════════ */}
        <div className="bg-[#1a1a1a] border border-gray-800 p-8">
          <h3 className="text-3xl text-white mb-2 flex items-center gap-3 font-anton uppercase">
            <Activity className="text-[#FFDE59]" size={32} /> Kilroy Visibility Index
          </h3>
          <p className="text-gray-400 mb-8">Six dimensions of market visibility, scored with live research evidence.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Radar Chart */}
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={kviRadarData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#999', fontSize: 10, fontFamily: 'Poppins' }} />
                  <Radar
                    name="KVI"
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

            {/* Score Bars */}
            <div className="space-y-4">
              {Object.entries(KVI_LABELS).map(([key, { label, icon }]) => {
                const item = getKviScore(data.kvi, key);
                const score = item?.score || 0;
                return (
                  <div key={key} className="group">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[#FFDE59]">{icon}</span>
                      <span className="text-sm font-poppins text-white flex-1">{label}</span>
                      <span className="font-anton text-xl" style={{ color: getScoreColor(score) }}>{score}</span>
                    </div>
                    <div className="h-3 bg-[#333333] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${score}%`, backgroundColor: getScoreColor(score) }}
                      />
                    </div>
                    {item?.evidence && (
                      <p className="text-xs text-gray-500 mt-1 pl-7">{item.evidence}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════ */}
        {/* SECTION 3: NARRATIVE FORENSICS */}
        {/* ════════════════════════════════════════ */}
        {data.narrativeForensics && (
          <div className="bg-black border border-gray-800 p-1">
            <div className="bg-gray-900 p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-2xl text-white font-anton uppercase flex items-center gap-2">
                  <Microscope className="text-[#FFDE59]" /> Narrative Forensics
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 uppercase font-bold">Consistency Score</span>
                  <div className="flex items-center bg-black border border-gray-700 px-3 py-1">
                    <span className={`font-mono font-bold text-lg ${data.narrativeForensics.overallConsistencyScore > 6 ? 'text-[#4CAF50]' : data.narrativeForensics.overallConsistencyScore > 3 ? 'text-[#FFDE59]' : 'text-[#E51B23]'}`}>
                      {data.narrativeForensics.overallConsistencyScore}/10
                    </span>
                  </div>
                </div>
              </div>

              {/* Claim vs Reality */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-700 font-mono text-sm mb-6">
                <div className="p-4 bg-black border-b md:border-b-0 md:border-r border-gray-700">
                  <span className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">THE CLAIM (INPUT)</span>
                  <div className="text-[#4CAF50]">
                    <span className="mr-2">+</span>{data.narrativeForensics.claimVsReality.claim}
                  </div>
                </div>
                <div className="p-4 bg-black">
                  <span className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">THE REALITY (SEARCH)</span>
                  <div className="text-[#E51B23]">
                    <span className="mr-2">-</span>{data.narrativeForensics.claimVsReality.reality}
                  </div>
                </div>
              </div>

              {/* Multi-Channel Forensics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black p-4 border-l-2 border-[#FFDE59]">
                  <span className="text-xs text-[#FFDE59] font-bold uppercase block mb-2">Website vs LinkedIn</span>
                  <p className="text-sm text-gray-300">{data.narrativeForensics.websiteVsLinkedIn.finding}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    Alignment: <span className="font-bold text-white">{data.narrativeForensics.websiteVsLinkedIn.alignmentScore}/10</span>
                  </div>
                </div>
                <div className="bg-black p-4 border-l-2 border-[#E51B23]">
                  <span className="text-xs text-[#E51B23] font-bold uppercase block mb-2">Founder vs Brand</span>
                  <p className="text-sm text-gray-300">{data.narrativeForensics.founderVsBrand.finding}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    Alignment: <span className="font-bold text-white">{data.narrativeForensics.founderVsBrand.alignmentScore}/10</span>
                  </div>
                </div>
                <div className="bg-black p-4 border-l-2 border-gray-600">
                  <span className="text-xs text-gray-400 font-bold uppercase block mb-2">Message Drift</span>
                  <p className="text-sm text-gray-300">{data.narrativeForensics.messageDrift}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* SECTION 4: BUYER JOURNEY VISIBILITY MAP */}
        {/* ════════════════════════════════════════ */}
        {data.buyerJourney && data.buyerJourney.length > 0 && (
          <div className="border border-[#E51B23] bg-black p-1">
            <div className="bg-[#E51B23]/10 p-8 border border-[#E51B23]/30">
              <div className="flex items-center gap-3 mb-6">
                <Skull className="text-[#E51B23]" size={32} />
                <h3 className="text-3xl text-white font-anton uppercase tracking-wide">Buyer Journey Visibility Map</h3>
              </div>
              <p className="text-gray-400 mb-8 max-w-3xl">
                Where your prospects look at each stage of the buying process, and whether they can find you.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.buyerJourney.map((stage, idx) => (
                  <div key={idx} className="bg-black border-t-4 p-6 relative" style={{ borderColor: getGradeColor(stage.visibilityGrade) }}>
                    <div className="absolute top-2 right-2">
                      <span className="text-2xl font-anton" style={{ color: getGradeColor(stage.visibilityGrade) }}>
                        {stage.visibilityGrade}
                      </span>
                    </div>
                    <h4 className="text-lg text-white font-anton mb-2 uppercase">{stage.stage}</h4>
                    <p className="text-xs text-gray-400 mb-3">{stage.description}</p>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Where They Look</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {stage.whereProspectsLook.map((place, i) => (
                            <span key={i} className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5">{place}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Your Presence</span>
                        <p className="text-xs text-[#FFDE59]">{stage.brandPresence}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Revenue at Risk</span>
                        <p className="text-xs text-[#E51B23] font-bold">{stage.revenueAtRisk}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* SECTION 5: COMPETITOR WAR ROOM */}
        {/* ════════════════════════════════════════ */}
        {data.competitorWarRoom && data.competitorWarRoom.length > 0 && (
          <div>
            <h3 className="text-3xl text-white mb-6 flex items-center gap-3 font-anton uppercase">
              <Swords className="text-[#FFDE59]" size={32} /> Competitor War Room
            </h3>
            <div className="space-y-6">
              {data.competitorWarRoom.map((comp, idx) => (
                <div key={idx} className="bg-[#1a1a1a] border border-gray-800 overflow-hidden">
                  {/* Competitor Header */}
                  <button
                    onClick={() => setExpandedCompetitor(expandedCompetitor === idx ? null : idx)}
                    className="w-full p-6 flex items-center justify-between hover:bg-black/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <h4 className="text-xl text-white font-anton">{comp.name}</h4>
                      <span className="text-xs text-gray-500 font-poppins italic">{comp.archetype}</span>
                      <div className="flex items-center gap-1">
                        {getTrajectoryIcon(comp.threatTrajectory)}
                        <span className="text-[10px] text-gray-500 uppercase">{comp.threatTrajectory}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 ${
                        comp.threatLevel === 'High' ? 'bg-[#E51B23] text-white' : comp.threatLevel === 'Medium' ? 'bg-[#FF8C42] text-white' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {comp.threatLevel} Threat
                      </span>
                      <ArrowRight size={16} className={`text-gray-500 transition-transform ${expandedCompetitor === idx ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {expandedCompetitor === idx && (
                    <div className="border-t border-gray-800 p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-black p-4 border-l-2 border-gray-600">
                          <span className="text-xs text-gray-500 font-bold uppercase">Their Positioning</span>
                          <p className="text-sm text-gray-300 mt-1 italic">&quot;{comp.positioning}&quot;</p>
                        </div>
                        <div className="bg-black p-4 border-l-2 border-[#E51B23]">
                          <span className="text-xs text-[#E51B23] font-bold uppercase">Exploitable Weakness</span>
                          <p className="text-sm text-white mt-1">{comp.weakness}</p>
                        </div>
                        <div className="bg-black p-4 border-l-2 border-[#FFDE59]">
                          <span className="text-xs text-[#FFDE59] font-bold uppercase">Their Strength</span>
                          <p className="text-sm text-gray-400 mt-1">{comp.strength}</p>
                        </div>
                      </div>

                      {/* KVI Comparison */}
                      {comp.kviComparison && comp.kviComparison.length > 0 && (
                        <div>
                          <span className="text-xs text-gray-500 font-bold uppercase mb-3 block">KVI Head-to-Head</span>
                          <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={comp.kviComparison} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#999', fontSize: 10 }} />
                                <YAxis dataKey="dimension" type="category" width={120} tick={{ fill: '#999', fontSize: 10 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                                <Bar dataKey="you" fill="#FFDE59" name="You" barSize={12} />
                                <Bar dataKey="them" fill="#E51B23" name={comp.name} barSize={12} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Counter-Positioning */}
                      <div className="bg-[#FFDE59]/10 border border-[#FFDE59]/30 p-4">
                        <span className="text-xs text-[#FFDE59] font-bold uppercase block mb-2">
                          <Shield size={14} className="inline mr-1" /> Counter-Positioning Playbook
                        </span>
                        <p className="text-sm text-white">{comp.counterPositioning}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* SECTION 6: OPERATOR VISIBILITY PROFILE */}
        {/* ════════════════════════════════════════ */}
        {data.operatorProfile && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Operator Score Card */}
            <div className="bg-[#1a1a1a] border border-gray-800 p-8">
              <h3 className="text-2xl text-white mb-6 flex items-center gap-2 font-anton uppercase">
                <User className="text-[#FFDE59]" /> Operator Profile
              </h3>

              <div className="flex items-center gap-6 mb-6">
                <div className="flex flex-col items-center justify-center bg-[#FFDE59] rounded-lg px-6 py-4 min-w-[120px]">
                  <span className="font-anton text-5xl text-black leading-none">{data.operatorProfile.personalBrandScore}</span>
                  <span className="text-xs font-poppins font-semibold text-black uppercase tracking-wider mt-1">BRAND SCORE</span>
                </div>
                <div>
                  <div className="text-[#FFDE59] font-anton text-xl uppercase">{data.operatorProfile.operatorArchetype?.name}</div>
                  <p className="text-xs text-gray-400 mt-1">{data.operatorProfile.operatorArchetype?.reasoning}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-black p-3 border-l-2 border-[#FFDE59]">
                  <span className="text-xs text-[#FFDE59] font-bold uppercase block mb-1">LinkedIn Strength</span>
                  <p className="text-sm text-gray-300">{data.operatorProfile.linkedInStrength}</p>
                </div>
                <div className="bg-black p-3 border-l-2 border-[#FFDE59]">
                  <span className="text-xs text-[#FFDE59] font-bold uppercase block mb-1">Speaking Presence</span>
                  <p className="text-sm text-gray-300">{data.operatorProfile.speakingPresence}</p>
                </div>
                <div className="bg-black p-3 border-l-2 border-[#FFDE59]">
                  <span className="text-xs text-[#FFDE59] font-bold uppercase block mb-1">Content Authority</span>
                  <p className="text-sm text-gray-300">{data.operatorProfile.contentAuthority}</p>
                </div>
                <div className="bg-black p-3 border-l-2 border-[#E51B23]">
                  <span className="text-xs text-[#E51B23] font-bold uppercase block mb-1">Founder Dependency Risk</span>
                  <p className="text-sm text-gray-300">{data.operatorProfile.founderDependencyRisk}</p>
                </div>
                {data.operatorProfile.networkVisibility && (
                  <div className="bg-black p-3 border-l-2 border-gray-600">
                    <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Network Visibility</span>
                    <p className="text-sm text-gray-300">{data.operatorProfile.networkVisibility}</p>
                  </div>
                )}
              </div>

              {/* Authority Signals */}
              {data.operatorProfile.authoritySignals && data.operatorProfile.authoritySignals.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs text-gray-500 font-bold uppercase block mb-2">Authority Signals</span>
                  <div className="flex flex-wrap gap-2">
                    {data.operatorProfile.authoritySignals.map((signal, i) => (
                      <span key={i} className="text-xs bg-gray-800 text-[#FFDE59] px-2 py-1 border border-[#FFDE59]/30">{signal}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Core Strengths */}
            <div className="bg-black border border-gray-800 p-8 flex flex-col">
              <h3 className="text-2xl text-white mb-6 flex items-center gap-2 font-anton">
                <Zap className="text-[#FFDE59]" /> UNFAIR ADVANTAGES
              </h3>
              <div className="space-y-4 flex-grow">
                {(data.coreStrengths || []).map((strength, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-[#1a1a1a] border border-gray-800 hover:border-[#FFDE59] transition-all group">
                    <div className="mt-1 p-1 bg-[#FFDE59] text-black rounded-full">
                      <CheckCircle size={16} />
                    </div>
                    <p className="text-base text-white font-medium group-hover:text-[#FFDE59] transition-colors">{strength}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* SECTION 7: CONTENT INTELLIGENCE ENGINE */}
        {/* ════════════════════════════════════════ */}
        {data.contentIntelligence && data.contentIntelligence.length > 0 && (
          <div className="bg-[#1a1a1a] border border-gray-800 p-8">
            <h3 className="text-3xl text-white mb-2 flex items-center gap-3 font-anton uppercase">
              <Brain className="text-[#E51B23]" size={32} /> Content Intelligence Engine
            </h3>
            <p className="text-gray-400 mb-8">Topics, formats, and repurposing chains calibrated to your capacity.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.contentIntelligence.map((item, idx) => (
                <div key={idx} className="bg-black border border-gray-800 p-6 relative group hover:border-[#FFDE59] transition-all flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-xl font-anton text-white group-hover:text-[#FFDE59] leading-tight">{item.topic}</h4>
                    <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-1 uppercase shrink-0 ml-2">{item.format}</span>
                  </div>

                  <div className="space-y-3 flex-grow mb-4">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Why Competitors Fail</span>
                      <p className="text-xs text-gray-400">{item.competitorNeglect}</p>
                    </div>
                    <div className="border-t border-gray-800 pt-2">
                      <span className="text-[10px] text-[#FFDE59] uppercase font-bold">Your Angle</span>
                      <p className="text-xs text-white">{item.yourAngle}</p>
                    </div>

                    {/* Repurposing Chain */}
                    {item.repurposingChain && item.repurposingChain.length > 0 && (
                      <div className="border-t border-gray-800 pt-2">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Repurposing Chain</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.repurposingChain.map((step, i) => (
                            <React.Fragment key={i}>
                              <span className="text-[10px] text-[#FFDE59]">{step}</span>
                              {i < item.repurposingChain.length - 1 && <span className="text-gray-600 text-[10px]">{' > '}</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Generate Draft Button */}
                  <button
                    onClick={() => handleGenerateDraft(item.topic)}
                    className="w-full bg-[#E51B23]/10 text-[#E51B23] border border-[#E51B23] hover:bg-[#E51B23] hover:text-white transition-colors uppercase font-bold text-xs py-2 flex items-center justify-center gap-2 mb-4"
                  >
                    <PenTool size={14} /> Generate Draft
                  </button>

                  <div className="pt-3 border-t border-gray-800 flex justify-between items-center mt-auto">
                    <span className="text-[10px] text-gray-600 font-mono uppercase">{item.searchVolume} Volume</span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i < item.opportunityScore ? 'bg-[#E51B23]' : 'bg-gray-800'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* SECTION 8: CHANNEL CALENDARS (DemandOS Execution) */}
        {/* ════════════════════════════════════════ */}
        {data.channelCalendars && data.channelCalendars.length > 0 && (
          <div>
            <h3 className="text-3xl text-white mb-6 pl-4 border-l-8 border-[#FFDE59] font-anton uppercase">DemandOS Execution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.channelCalendars.map((cal, idx) => {
                const colors = ['#FF0000', '#FFDE59', '#E51B23', '#4CAF50'];
                const color = colors[idx % colors.length];
                return (
                  <div key={idx} className="bg-[#1a1a1a] p-6 border-t-4" style={{ borderColor: color }}>
                    <h4 className="text-xl text-white font-anton mb-1 uppercase">{cal.channel}</h4>
                    <p className="text-xs text-gray-400 mb-4 uppercase tracking-wider">{cal.cadence}</p>

                    <div className="mb-4 bg-black p-3 border-l-2" style={{ borderColor: color }}>
                      <span className="text-xs font-bold block mb-1" style={{ color }}>TEAM EXECUTION</span>
                      <p className="text-xs text-gray-300">{cal.teamExecution}</p>
                    </div>

                    {/* Quick Win */}
                    <div className="mb-4 bg-[#FFDE59]/10 border border-[#FFDE59]/20 p-3">
                      <span className="text-[10px] text-[#FFDE59] font-bold uppercase block mb-1">QUICK WIN (THIS WEEK)</span>
                      <p className="text-xs text-white">{cal.quickWin}</p>
                    </div>

                    <ul className="space-y-2">
                      {cal.topics.map((topic, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <div className="min-w-[6px] h-[6px] mt-1.5 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-gray-300">{topic}</span>
                        </li>
                      ))}
                    </ul>

                    {cal.specificTargets && cal.specificTargets.length > 0 && (
                      <div className="mt-4">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Targets</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {cal.specificTargets.map((target, i) => (
                            <span key={i} className="text-[10px] bg-gray-800 px-2 py-0.5 border border-gray-700" style={{ color }}>{target}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* SECTION 9: 90-DAY BATTLE PLAN */}
        {/* ════════════════════════════════════════ */}
        {data.ninetyDayBattlePlan && data.ninetyDayBattlePlan.length > 0 && (
          <div className="bg-white text-black p-8 shadow-2xl">
            <h3 className="text-3xl mb-2 font-anton uppercase flex items-center gap-3">
              <Layers size={32} /> 90-Day Battle Plan
            </h3>
            <p className="text-gray-500 mb-8 text-sm">Resource-calibrated. Each action tagged with KVI impact.</p>

            <div className="space-y-0">
              {data.ninetyDayBattlePlan.map((phase, idx) => (
                <div key={idx} className="flex flex-col md:flex-row border-b border-gray-200 last:border-0 py-6 group hover:bg-gray-50 transition-colors">
                  <div className="md:w-1/4 mb-4 md:mb-0">
                    <div className="text-[#E51B23] font-bold text-lg">{phase.week}</div>
                    <div className="font-anton text-2xl uppercase">{phase.focus}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`inline-block px-2 py-1 text-xs font-bold uppercase ${phase.impact === 'High' ? 'bg-[#E51B23] text-white' : phase.impact === 'Medium' ? 'bg-[#FFDE59] text-black' : 'bg-gray-200 text-gray-600'}`}>
                        {phase.impact} Impact
                      </span>
                      {phase.resourceLevel && (
                        <span className="inline-block px-2 py-1 text-xs font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">
                          {phase.resourceLevel}
                        </span>
                      )}
                    </div>
                    {phase.kviImpact && (
                      <div className="mt-2 text-xs text-gray-400">
                        KVI: <span className="text-[#E51B23] font-bold">{phase.kviImpact}</span>
                      </div>
                    )}
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
        )}

        {/* ════════════════════════════════════════ */}
        {/* SECTION 10: KILROY'S HOT TAKE */}
        {/* ════════════════════════════════════════ */}
        {data.kilroyHotTake && (
          <div className="bg-[#1a1a1a] border-2 border-[#E51B23] p-1 shadow-[8px_8px_0px_0px_#E51B23]">
            <div className="bg-black p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-3xl text-[#E51B23] font-anton uppercase flex items-center gap-3">
                  <Flame size={32} /> Kilroy&apos;s Hot Take
                </h3>
                <div className="flex flex-col items-center justify-center bg-[#E51B23] rounded-lg px-4 py-2 min-w-[80px]">
                  <span className="font-anton text-3xl text-white leading-none">{data.kilroyHotTake.vibeScore}</span>
                  <span className="text-[10px] font-poppins font-bold text-white/80 uppercase">VIBE</span>
                </div>
              </div>

              <p className="text-lg text-white font-poppins leading-relaxed mb-8 italic">
                &quot;{data.kilroyHotTake.vibeCommentary}&quot;
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#FFDE59]/10 border border-[#FFDE59]/30 p-6">
                  <span className="text-xs text-[#FFDE59] font-bold uppercase block mb-2">THE ONE THING</span>
                  <p className="text-white font-poppins">{data.kilroyHotTake.theOneThing}</p>
                </div>
                <div className="bg-[#E51B23]/10 border border-[#E51B23]/30 p-6">
                  <span className="text-xs text-[#E51B23] font-bold uppercase block mb-2">WHAT NOBODY WILL TELL YOU</span>
                  <p className="text-white font-poppins">{data.kilroyHotTake.whatNobodyWillTellYou}</p>
                </div>
              </div>

              {/* Prognosis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-700">
                <div className="p-6 bg-[#E51B23]/5 border-r border-gray-700">
                  <span className="text-xs text-[#E51B23] font-bold uppercase block mb-2">12 MONTHS: DO NOTHING</span>
                  <p className="text-sm text-gray-300">{data.kilroyHotTake.prognosis.doNothing}</p>
                </div>
                <div className="p-6 bg-[#4CAF50]/5">
                  <span className="text-xs text-[#4CAF50] font-bold uppercase block mb-2">12 MONTHS: EXECUTE WELL</span>
                  <p className="text-sm text-gray-300">{data.kilroyHotTake.prognosis.executeWell}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div className="text-center pt-12 pb-6 border-t border-gray-800 print:hidden">
          <h2 className="text-4xl font-anton text-white mb-4 uppercase">Turn This <span className="text-[#FFDE59]">Intel</span> Into <span className="text-[#E51B23]">Revenue</span>.</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            You have the complete intelligence package. The gaps are mapped. The competitors are profiled. The plan is built.
            The only question is: execute or let it sit?
          </p>
          <a
            href="https://calendly.com/kilroy/demandos-visibility-engine"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 bg-[#E51B23] text-white font-anton text-xl px-10 py-5 hover:bg-white hover:text-[#E51B23] transition-all uppercase tracking-widest shadow-[4px_4px_0px_0px_#FFDE59]"
          >
            Book Your Strategy Session <ArrowRight size={24} />
          </a>

          <div className="mt-12 text-[10px] text-gray-700 max-w-3xl mx-auto">
            <button onClick={onReset} className="mb-4 text-gray-500 hover:text-[#E51B23] underline uppercase tracking-widest">
              Start Over / New Analysis
            </button>
            <p className="uppercase font-bold mb-1">DISCLAIMER</p>
            <p>
              This report is generated by Artificial Intelligence (Visibility Lab Pro Engine) and is intended for informational and strategic planning purposes only.
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
