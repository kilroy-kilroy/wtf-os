import React, { useState } from 'react';

const ContentHubConcepts = () => {
  const [activeDesign, setActiveDesign] = useState('brutalist');
  const [activeTab, setActiveTab] = useState('repository');

  // Design 1: Brutalist/Editorial
  const BrutalistDesign = () => {
    const [selectedContent, setSelectedContent] = useState(null);
    const [hoveredCard, setHoveredCard] = useState(null);
    
    const contentItems = [
      { id: 1, title: "Your pipeline is a lie", theme: "Evidence", repurposes: 12, author: "Brand Official" },
      { id: 2, title: "Coaching first, admin never", theme: "Education", repurposes: 8, author: "Brand Official" },
      { id: 3, title: "The uncomfortable truth about scale", theme: "Envision", repurposes: 5, author: "Tim K." },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fafafa',
        fontFamily: "'Courier New', monospace",
        padding: '0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Grain overlay */}
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
          zIndex: 1000
        }} />

        {/* Header */}
        <header style={{
          borderBottom: '3px solid #ff3c00',
          padding: '20px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: '14px',
              letterSpacing: '8px',
              textTransform: 'uppercase',
              margin: 0,
              fontWeight: 400
            }}>CONTENT HUB</h1>
            <p style={{
              fontSize: '11px',
              color: '#666',
              margin: '4px 0 0 0',
              letterSpacing: '2px'
            }}>THE BASSLINE. IMPROVISE OVER IT.</p>
          </div>
          <div style={{ display: 'flex', gap: '30px' }}>
            {['REPOSITORY', 'CREATE', 'CALLS'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeTab === tab.toLowerCase() ? '#ff3c00' : '#666',
                  fontSize: '11px',
                  letterSpacing: '3px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  padding: '8px 0',
                  borderBottom: activeTab === tab.toLowerCase() ? '2px solid #ff3c00' : '2px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        {/* Main Content */}
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)' }}>
          {/* Sidebar - 4E Filter */}
          <aside style={{
            width: '200px',
            borderRight: '1px solid #222',
            padding: '40px 30px'
          }}>
            <p style={{
              fontSize: '10px',
              letterSpacing: '4px',
              color: '#666',
              marginBottom: '20px'
            }}>FILTER BY 4E</p>
            {['All', 'Evidence', 'Education', 'Entertainment', 'Envision'].map((filter, i) => (
              <button
                key={filter}
                style={{
                  display: 'block',
                  width: '100%',
                  background: i === 0 ? '#ff3c00' : 'transparent',
                  border: '1px solid #333',
                  color: i === 0 ? '#000' : '#888',
                  padding: '12px 16px',
                  marginBottom: '8px',
                  fontSize: '11px',
                  letterSpacing: '2px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s'
                }}
              >
                {filter.toUpperCase()}
              </button>
            ))}
            
            <div style={{ marginTop: '60px' }}>
              <p style={{
                fontSize: '10px',
                letterSpacing: '4px',
                color: '#666',
                marginBottom: '20px'
              }}>QUICK STATS</p>
              <div style={{ color: '#ff3c00', fontSize: '36px', fontWeight: 'bold' }}>47</div>
              <p style={{ fontSize: '10px', color: '#666', letterSpacing: '2px' }}>PIECES IN REPO</p>
              <div style={{ color: '#ff3c00', fontSize: '36px', fontWeight: 'bold', marginTop: '20px' }}>156</div>
              <p style={{ fontSize: '10px', color: '#666', letterSpacing: '2px' }}>TEAM REPURPOSES</p>
            </div>
          </aside>

          {/* Content Grid */}
          <main style={{ flex: 1, padding: '40px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {contentItems.map((item, index) => (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredCard(item.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    background: hoveredCard === item.id ? '#111' : '#0d0d0d',
                    border: '1px solid #222',
                    padding: '30px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    transform: hoveredCard === item.id ? 'translateY(-4px)' : 'none',
                    animation: `fadeSlideIn 0.4s ease-out ${index * 0.1}s both`
                  }}
                >
                  <div style={{
                    fontSize: '10px',
                    color: '#ff3c00',
                    letterSpacing: '3px',
                    marginBottom: '16px'
                  }}>
                    {item.theme.toUpperCase()}
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 400,
                    margin: '0 0 20px 0',
                    lineHeight: 1.4
                  }}>
                    "{item.title}"
                  </h3>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #222',
                    paddingTop: '16px',
                    marginTop: '16px'
                  }}>
                    <span style={{ fontSize: '10px', color: '#666', letterSpacing: '2px' }}>
                      {item.author.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '10px', color: '#666' }}>
                      {item.repurposes} repurposes
                    </span>
                  </div>
                  <button style={{
                    width: '100%',
                    background: hoveredCard === item.id ? '#ff3c00' : 'transparent',
                    border: '1px solid #ff3c00',
                    color: hoveredCard === item.id ? '#000' : '#ff3c00',
                    padding: '12px',
                    marginTop: '16px',
                    fontSize: '10px',
                    letterSpacing: '3px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s'
                  }}>
                    REPURPOSE THIS →
                  </button>
                </div>
              ))}
            </div>
          </main>
        </div>

        <style>{`
          @keyframes fadeSlideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    );
  };

  // Design 2: Warm/Premium
  const WarmDesign = () => {
    const [activeOutput, setActiveOutput] = useState('linkedin');
    
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #faf8f5 0%, #f5f0e8 100%)',
        fontFamily: "'Georgia', serif",
        padding: '0'
      }}>
        {/* Header */}
        <header style={{
          padding: '24px 48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e8e0d5'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#c45a3b',
              borderRadius: '8px'
            }} />
            <span style={{
              fontSize: '20px',
              fontWeight: 400,
              color: '#2d2a26'
            }}>Content Hub</span>
          </div>
          <nav style={{ display: 'flex', gap: '32px' }}>
            {['Repository', 'Create', 'Calls', 'Team'].map(item => (
              <button
                key={item}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '15px',
                  color: '#6b635a',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                {item}
              </button>
            ))}
          </nav>
        </header>

        {/* Repurpose Interface */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px' }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            overflow: 'hidden'
          }}>
            {/* Source Content */}
            <div style={{
              padding: '32px 40px',
              borderBottom: '1px solid #e8e0d5',
              background: 'linear-gradient(90deg, #fdfcfa 0%, #faf8f5 100%)'
            }}>
              <div style={{
                display: 'inline-block',
                background: '#fff3e6',
                color: '#c45a3b',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 500,
                marginBottom: '16px'
              }}>
                Evidence
              </div>
              <h2 style={{
                fontSize: '28px',
                fontWeight: 400,
                color: '#2d2a26',
                margin: '0 0 12px 0',
                lineHeight: 1.3
              }}>
                "Your pipeline is a lie. Here's what actually predicts revenue."
              </h2>
              <p style={{
                fontSize: '15px',
                color: '#8a8078',
                margin: 0,
                fontFamily: 'system-ui, sans-serif'
              }}>
                Brand Official · 12 team repurposes
              </p>
            </div>

            {/* Output Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e8e0d5',
              background: '#fdfcfa'
            }}>
              {[
                { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
                { key: 'twitter', label: 'Twitter/X', icon: '🐦' },
                { key: 'email', label: 'Email', icon: '✉️' },
                { key: 'quotes', label: 'Pull Quotes', icon: '💬' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveOutput(tab.key)}
                  style={{
                    flex: 1,
                    padding: '20px',
                    background: activeOutput === tab.key ? '#fff' : 'transparent',
                    border: 'none',
                    borderBottom: activeOutput === tab.key ? '2px solid #c45a3b' : '2px solid transparent',
                    fontSize: '14px',
                    fontFamily: 'system-ui, sans-serif',
                    color: activeOutput === tab.key ? '#2d2a26' : '#8a8078',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Output Content */}
            <div style={{ padding: '40px' }}>
              <div style={{
                background: '#faf8f5',
                borderRadius: '12px',
                padding: '32px',
                border: '1px solid #e8e0d5'
              }}>
                <p style={{
                  fontSize: '16px',
                  lineHeight: 1.7,
                  color: '#2d2a26',
                  margin: 0,
                  fontFamily: 'system-ui, sans-serif'
                }}>
                  Hot take: Your pipeline isn't real.
                  <br /><br />
                  It's a spreadsheet of maybes. A comfort blanket of "potential" revenue that evaporates every quarter.
                  <br /><br />
                  After analyzing 200+ agency pipelines, here's what I found:
                  <br /><br />
                  → 73% of "qualified" leads never close<br />
                  → Average deal sits in pipeline 4x longer than predicted<br />
                  → Post-call momentum (not stage gates) predicts close rates with 89% accuracy
                  <br /><br />
                  The uncomfortable truth?
                  <br /><br />
                  Your salespeople know which deals are real. They just don't have a system to capture that intuition.
                  <br /><br />
                  Stop managing a database. Start capturing momentum.
                </p>
              </div>

              {/* Controls */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '24px',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['🔥 Spicier', '🎯 Shorter', '👔 Professional'].map(adj => (
                    <button
                      key={adj}
                      style={{
                        background: '#fff',
                        border: '1px solid #e8e0d5',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontFamily: 'system-ui, sans-serif',
                        color: '#6b635a',
                        cursor: 'pointer'
                      }}
                    >
                      {adj}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={{
                    background: '#fff',
                    border: '1px solid #e8e0d5',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontFamily: 'system-ui, sans-serif',
                    color: '#6b635a',
                    cursor: 'pointer'
                  }}>
                    ↻ Regenerate
                  </button>
                  <button style={{
                    background: '#c45a3b',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontSize: '13px',
                    fontFamily: 'system-ui, sans-serif',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}>
                    Copy to Clipboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Design 3: Dashboard/Dark Mode
  const DashboardDesign = () => {
    const [selectedCall, setSelectedCall] = useState(0);
    
    const calls = [
      { client: "Acme Corp", date: "Today", moments: 5, duration: "47 min" },
      { client: "TechStart Inc", date: "Yesterday", moments: 3, duration: "32 min" },
      { client: "Growth Partners", date: "Jan 3", moments: 7, duration: "58 min" },
    ];

    const moments = [
      { time: "12:34", quote: "The real problem isn't lead quality—it's that nobody trusts the data in your CRM.", confidence: 94 },
      { time: "23:17", quote: "I told them: stop measuring activities. Start measuring momentum.", confidence: 87 },
      { time: "34:02", quote: "Your pipeline is basically a wishlist dressed up as a forecast.", confidence: 91 },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: '#0c0c0f',
        color: '#e4e4e7',
        fontFamily: "'SF Pro Display', -apple-system, sans-serif"
      }}>
        {/* Top Nav */}
        <nav style={{
          height: '56px',
          borderBottom: '1px solid #27272a',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
                borderRadius: '6px'
              }} />
              <span style={{ fontWeight: 600, fontSize: '15px' }}>Content Hub</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['Repository', 'Create', 'Calls', 'Team'].map((item, i) => (
                <button
                  key={item}
                  style={{
                    background: i === 2 ? '#27272a' : 'transparent',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    color: i === 2 ? '#fff' : '#71717a',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f472b6 0%, #c084fc 100%)'
          }} />
        </nav>

        <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
          {/* Calls List */}
          <aside style={{
            width: '320px',
            borderRight: '1px solid #27272a',
            padding: '20px 0'
          }}>
            <div style={{ padding: '0 20px 16px', borderBottom: '1px solid #27272a' }}>
              <h2 style={{ fontSize: '13px', color: '#71717a', fontWeight: 500, margin: 0 }}>
                RECENT CALLS
              </h2>
            </div>
            {calls.map((call, i) => (
              <div
                key={i}
                onClick={() => setSelectedCall(i)}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #18181b',
                  background: selectedCall === i ? '#18181b' : 'transparent',
                  cursor: 'pointer',
                  borderLeft: selectedCall === i ? '2px solid #818cf8' : '2px solid transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{call.client}</span>
                  <span style={{ fontSize: '12px', color: '#52525b' }}>{call.date}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#71717a' }}>
                  <span>⏱ {call.duration}</span>
                  <span style={{ color: '#818cf8' }}>✨ {call.moments} moments</span>
                </div>
              </div>
            ))}
          </aside>

          {/* Main Content */}
          <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto' }}>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0' }}>
                {calls[selectedCall].client}
              </h1>
              <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>
                {calls[selectedCall].duration} · {calls[selectedCall].moments} content moments detected
              </p>
            </div>

            <div style={{
              display: 'grid',
              gap: '16px'
            }}>
              {moments.map((moment, i) => (
                <div
                  key={i}
                  style={{
                    background: '#18181b',
                    borderRadius: '12px',
                    padding: '20px 24px',
                    border: '1px solid #27272a',
                    animation: `slideIn 0.3s ease-out ${i * 0.1}s both`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <span style={{
                      background: '#27272a',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#a1a1aa',
                      fontFamily: 'monospace'
                    }}>
                      {moment.time}
                    </span>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '4px',
                        background: '#27272a',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${moment.confidence}%`,
                          height: '100%',
                          background: moment.confidence > 90 ? '#22c55e' : '#eab308',
                          borderRadius: '2px'
                        }} />
                      </div>
                      <span style={{ color: '#71717a' }}>{moment.confidence}%</span>
                    </div>
                  </div>
                  <p style={{
                    fontSize: '15px',
                    lineHeight: 1.6,
                    margin: '0 0 16px 0',
                    color: '#e4e4e7'
                  }}>
                    "{moment.quote}"
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{
                      background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#fff',
                      cursor: 'pointer'
                    }}>
                      Add to Repository
                    </button>
                    <button style={{
                      background: '#27272a',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#a1a1aa',
                      cursor: 'pointer'
                    }}>
                      Repurpose Now
                    </button>
                    <button style={{
                      background: 'transparent',
                      border: '1px solid #27272a',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#71717a',
                      cursor: 'pointer'
                    }}>
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>

        <style>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-10px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}</style>
      </div>
    );
  };

  // Design Selector
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Design Toggle */}
      <div style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 9999,
        background: 'rgba(0,0,0,0.9)',
        borderRadius: '12px',
        padding: '8px',
        display: 'flex',
        gap: '4px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        {[
          { key: 'brutalist', label: '1. Brutalist' },
          { key: 'warm', label: '2. Warm/Premium' },
          { key: 'dashboard', label: '3. Call Extraction' }
        ].map(d => (
          <button
            key={d.key}
            onClick={() => setActiveDesign(d.key)}
            style={{
              background: activeDesign === d.key ? '#fff' : 'transparent',
              color: activeDesign === d.key ? '#000' : '#888',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Render Active Design */}
      {activeDesign === 'brutalist' && <BrutalistDesign />}
      {activeDesign === 'warm' && <WarmDesign />}
      {activeDesign === 'dashboard' && <DashboardDesign />}
    </div>
  );
};

export default ContentHubConcepts;
