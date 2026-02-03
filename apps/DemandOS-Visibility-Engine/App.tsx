
import React, { useState, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { Dashboard } from './components/Dashboard';
import { LoadingScreen } from './components/LoadingScreen';
import { AnalysisInput, AnalysisReport } from './types';
import { generateAnalysis } from './services/geminiService';
import { formatEmail } from './services/emailFormatter';
import { Globe, Linkedin, Instagram, Youtube, Mail, FileText } from 'lucide-react';

// --- CONFIGURATION ---
// Paste your Zapier Webhook URL here to hardcode it (avoids using the UI settings)
const HARDCODED_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/1852580/uzksxsr/"; 

const App: React.FC = () => {
  // Initialize state from localStorage
  const [report, setReport] = useState<AnalysisReport | null>(() => {
    try {
      const saved = localStorage.getItem('demandos_report');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to load saved report", e);
      return null;
    }
  });

  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    if (HARDCODED_WEBHOOK_URL) return HARDCODED_WEBHOOK_URL;
    return localStorage.getItem('demandos_webhook_url') || '';
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveWebhook = (url: string) => {
    setWebhookUrl(url);
    localStorage.setItem('demandos_webhook_url', url);
  };

  const handleAnalyze = async (input: AnalysisInput) => {
    setIsLoading(true);
    try {
      const result = await generateAnalysis(input);
      
      // 1. Save to local storage immediately
      localStorage.setItem('demandos_report', JSON.stringify(result));
      
      // 2. GENERATE HTML EMAIL PAYLOAD
      const emailHtml = formatEmail(result);

      // 3. AUTO-SEND TO ZAPIER (Background Process)
      const targetWebhook = HARDCODED_WEBHOOK_URL || webhookUrl;
      
      if (targetWebhook) {
        console.log("Transmitting payload to Zapier...");
        
        // Flattened payload for specific Zapier requirements
        const zapierPayload = {
            name: input.userName,
            email: input.userEmail,
            company: input.brandName,
            phone: input.userPhone,
            title: input.userTitle,
            brand_name: input.brandName,
            html: emailHtml,
            timestamp: new Date().toISOString()
        };

        fetch(targetWebhook, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 
            'Content-Type': 'text/plain' 
          },
          body: JSON.stringify(zapierPayload)
        }).catch(err => console.error("Zapier Auto-Send Failed:", err));
      }

      // 4. Show Dashboard
      setReport(result);

    } catch (error: any) {
      console.error("Error generating report", error);
      // Show the actual error message to help debugging (e.g., "AI Safety Filter Triggered")
      alert(`DemandOS Error: ${error.message || "System Failure. Check API Key or Try Again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    // Clear local storage on reset
    localStorage.removeItem('demandos_report');
    setReport(null);
  };

  return (
    <div className="min-h-screen bg-black selection:bg-brand-yellow selection:text-black">
      {isLoading && <LoadingScreen />}
      
      {!report ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
          {/* Background Texture */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
          
          <header className="mb-12 text-center z-10">
            <h1 className="text-5xl md:text-7xl text-white font-anton mb-2 tracking-tighter">
              DEMAND<span className="text-brand-red">OS</span>
            </h1>
            <div className="inline-block bg-brand-yellow text-black px-4 py-1 font-bold tracking-widest text-sm">
              VISIBILITY ENGINE v1.0
            </div>
          </header>

          <InputForm 
            onSubmit={handleAnalyze} 
            isLoading={isLoading} 
            savedWebhookUrl={webhookUrl}
            onSaveWebhook={handleSaveWebhook}
          />

          {/* Social Icons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 z-10">
            <a href="https://timkilroy.com" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-brand-red transition-colors transform hover:scale-110" title="Website">
              <Globe size={20} />
            </a>
            <a href="https://linkedin.com/in/timkilroy" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-brand-red transition-colors transform hover:scale-110" title="LinkedIn">
              <Linkedin size={20} />
            </a>
            <a href="https://www.instagram.com/timkilroy_agencygrowth/" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-brand-red transition-colors transform hover:scale-110" title="Instagram">
              <Instagram size={20} />
            </a>
            <a href="https://youtube.com/@agencygrowthcoach" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-brand-red transition-colors transform hover:scale-110" title="YouTube">
              <Youtube size={20} />
            </a>
            <a href="https://www.agencyinnercircle.com" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-brand-red transition-colors transform hover:scale-110" title="Newsletter">
              <FileText size={20} />
            </a>
            <a href="https://timkilroy.com/contact" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-brand-red transition-colors transform hover:scale-110" title="Contact">
              <Mail size={20} />
            </a>
          </div>
          
          <footer className="mt-8 text-gray-600 text-xs font-poppins text-center z-10">
            <p className="mb-1">Copyright © 2018-2025 KLRY, LLC. All rights reserved.</p>
            <a href="https://timkilroy.com/privacy-policy-2/" target="_blank" rel="noreferrer" className="hover:text-brand-red transition-colors underline decoration-brand-red/30">
              Privacy Policy
            </a>
          </footer>
        </div>
      ) : (
        <Dashboard data={report} onReset={handleReset} />
      )}
    </div>
  );
};

export default App;
