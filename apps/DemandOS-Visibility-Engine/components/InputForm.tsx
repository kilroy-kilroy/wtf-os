import React, { useState } from 'react';
import { AnalysisInput } from '../types';
import { Play, ShieldAlert, Terminal, User, Mail, Lock, Webhook, X, Save, Phone, Briefcase } from 'lucide-react';

interface Props {
  onSubmit: (data: AnalysisInput) => void;
  isLoading: boolean;
  savedWebhookUrl: string;
  onSaveWebhook: (url: string) => void;
}

export const InputForm: React.FC<Props> = ({ onSubmit, isLoading, savedWebhookUrl, onSaveWebhook }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [tempWebhook, setTempWebhook] = useState(savedWebhookUrl);

  const [formData, setFormData] = useState<AnalysisInput>({
    userName: '',
    userEmail: '',
    userPhone: '',
    userTitle: '',
    brandName: '',
    website: '',
    targetAudience: '',
    mainCompetitors: '',
    currentChannels: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleSaveSettings = () => {
    onSaveWebhook(tempWebhook);
    setShowSettings(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-brand-gray border-2 border-brand-red p-1 shadow-[8px_8px_0px_0px_#E51B23] relative">
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-8 backdrop-blur-sm">
          <div className="w-full h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h3 className="text-xl font-anton text-white flex items-center gap-2">
                <Lock className="text-brand-red" size={20} /> ADMIN CONFIG
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6 font-poppins">
              <div className="bg-brand-gray p-4 border border-gray-700">
                <div className="flex items-center gap-2 text-brand-yellow font-bold uppercase mb-2">
                  <Webhook size={16} /> Zapier Integration
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Configure a Webhook to automatically receive analysis data JSON when a report is generated.
                  This is invisible to the end user.
                </p>
                
                <div className="text-xs text-gray-300 bg-black p-3 mb-4 font-mono border-l-2 border-brand-red">
                  <strong className="text-brand-red">INSTRUCTIONS:</strong><br/>
                  1. Go to Zapier &rarr; Click "Create Zap"<br/>
                  2. Trigger: <strong>"Webhooks by Zapier"</strong><br/>
                  3. Event: <strong>"Catch Hook"</strong><br/>
                  4. Copy the "Webhook URL" provided<br/>
                  5. Paste below.
                </div>

                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destination URL</label>
                <input 
                  type="url" 
                  value={tempWebhook}
                  onChange={(e) => setTempWebhook(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  className="w-full bg-black border border-gray-700 text-white p-2 text-sm focus:border-brand-red outline-none"
                />
              </div>

              <button 
                type="button"
                onClick={handleSaveSettings}
                className="w-full bg-white text-black font-anton uppercase py-3 hover:bg-brand-yellow transition-colors flex items-center justify-center gap-2"
              >
                <Save size={16} /> Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-black p-8 relative overflow-hidden">
        {/* Decorational OS Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-brand-red"></div>
        <div className="absolute top-2 right-2 text-xs text-brand-red font-mono opacity-50">SYS.READY</div>
        
        <div className="mb-8 text-center">
          <h2 className="text-4xl text-white mb-2">Initialize <span className="text-brand-yellow">Analysis</span></h2>
          <p className="text-gray-400 font-poppins">Feed the DemandOS engine. Be honest. We can't fix what we can't see.</p>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="space-y-6 font-poppins"
          autoComplete="off"
        >
          
          {/* Lead Capture Section */}
          <div className="bg-brand-gray/30 border border-gray-800 p-4 mb-6">
            <h3 className="text-brand-red text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <Terminal size={14} /> Operator Identity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <div className="flex items-center bg-black border border-gray-700 focus-within:border-brand-yellow p-3">
                    <User size={16} className="text-gray-500 mr-3" />
                    <input
                        id="userName"
                        required
                        name="userName"
                        value={formData.userName}
                        onChange={handleChange}
                        placeholder="Your Name"
                        className="bg-transparent text-white w-full outline-none placeholder-gray-600 text-sm"
                        autoComplete="off"
                        data-lpignore="true"
                    />
                </div>
              </div>
              {/* Email */}
              <div>
                <div className="flex items-center bg-black border border-gray-700 focus-within:border-brand-yellow p-3">
                    <Mail size={16} className="text-gray-500 mr-3" />
                    <input
                        id="userEmail"
                        required
                        type="email"
                        name="userEmail"
                        value={formData.userEmail}
                        onChange={handleChange}
                        placeholder="Your Work Email"
                        className="bg-transparent text-white w-full outline-none placeholder-gray-600 text-sm"
                        autoComplete="off"
                        data-lpignore="true"
                    />
                </div>
              </div>
              {/* Phone */}
              <div>
                <div className="flex items-center bg-black border border-gray-700 focus-within:border-brand-yellow p-3">
                    <Phone size={16} className="text-gray-500 mr-3" />
                    <input
                        id="userPhone"
                        required
                        type="tel"
                        name="userPhone"
                        value={formData.userPhone}
                        onChange={handleChange}
                        placeholder="Phone Number"
                        className="bg-transparent text-white w-full outline-none placeholder-gray-600 text-sm"
                        autoComplete="off"
                        data-lpignore="true"
                    />
                </div>
              </div>
              {/* Job Title */}
              <div>
                <div className="flex items-center bg-black border border-gray-700 focus-within:border-brand-yellow p-3">
                    <Briefcase size={16} className="text-gray-500 mr-3" />
                    <input
                        id="userTitle"
                        required
                        name="userTitle"
                        value={formData.userTitle}
                        onChange={handleChange}
                        placeholder="Job Title"
                        className="bg-transparent text-white w-full outline-none placeholder-gray-600 text-sm"
                        autoComplete="off"
                        data-lpignore="true"
                    />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="brandName" className="block text-brand-yellow text-sm font-bold mb-2 uppercase tracking-widest">Target Brand</label>
            <input
              id="brandName"
              required
              name="brandName"
              value={formData.brandName}
              onChange={handleChange}
              placeholder="Brand / Agency Name"
              className="w-full bg-brand-gray border border-brand-gray focus:border-brand-red text-white p-3 outline-none transition-colors placeholder-gray-600"
              autoComplete="off"
              data-lpignore="true"
            />
          </div>

          <div>
              <label htmlFor="website" className="block text-brand-yellow text-sm font-bold mb-2 uppercase tracking-widest">URL</label>
              <input
                id="website"
                required
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full bg-brand-gray border border-brand-gray focus:border-brand-red text-white p-3 outline-none transition-colors placeholder-gray-600"
                autoComplete="off"
                data-lpignore="true"
              />
          </div>

          <div>
            <label htmlFor="targetAudience" className="block text-brand-yellow text-sm font-bold mb-2 uppercase tracking-widest">Target Audience</label>
            <textarea
              id="targetAudience"
              required
              name="targetAudience"
              value={formData.targetAudience}
              onChange={handleChange}
              placeholder="Who are you trying to sell to? Be specific."
              rows={2}
              className="w-full bg-brand-gray border border-brand-gray focus:border-brand-red text-white p-3 outline-none transition-colors placeholder-gray-600"
              data-lpignore="true"
            />
          </div>

          <div>
            <label htmlFor="mainCompetitors" className="block text-brand-yellow text-sm font-bold mb-2 uppercase tracking-widest">Competitors</label>
            <textarea
              id="mainCompetitors"
              required
              name="mainCompetitors"
              value={formData.mainCompetitors}
              onChange={handleChange}
              placeholder="Who is stealing your lunch? List 2-3 top competitors."
              rows={2}
              className="w-full bg-brand-gray border border-brand-gray focus:border-brand-red text-white p-3 outline-none transition-colors placeholder-gray-600"
              data-lpignore="true"
            />
          </div>

          <div>
            <label htmlFor="currentChannels" className="block text-brand-yellow text-sm font-bold mb-2 uppercase tracking-widest">Current Visibility</label>
            <textarea
              id="currentChannels"
              required
              name="currentChannels"
              value={formData.currentChannels}
              onChange={handleChange}
              placeholder="Where are you currently posting? LinkedIn? YouTube? Nowhere?"
              rows={2}
              className="w-full bg-brand-gray border border-brand-gray focus:border-brand-red text-white p-3 outline-none transition-colors placeholder-gray-600"
              data-lpignore="true"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-brand-red hover:bg-red-600 text-white font-anton text-xl uppercase tracking-widest py-4 flex items-center justify-center gap-2 transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <Terminal className="animate-pulse" />
            ) : (
              <Play fill="currentColor" />
            )}
            {isLoading ? 'Running Diagnostics...' : 'Run DemandOS'}
          </button>
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldAlert size={14} />
              <span>DATA PROCESSED SECURELY</span>
            </div>
            <button 
              type="button" 
              onClick={() => setShowSettings(true)}
              className="text-gray-700 hover:text-brand-red transition-colors"
              title="Admin Configuration"
            >
              <Lock size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};