import React, { useState } from 'react';

const ContentHubRedesign = () => {
  const [activeNav, setActiveNav] = useState('repository');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('linkedin');

  // Brand colors
  const brand = {
    red: '#E51B23',
    black: '#000000',
    yellow: '#FFDE59',
    white: '#FFFFFF',
    lightGray: '#F8F8F8',
    mediumGray: '#E5E5E5',
    textGray: '#666666'
  };

  const navItems = ['Dashboard', 'Repository', 'Calls', 'Settings'];
  const filters = ['All', 'Evidence', 'Education', 'Entertainment', 'Envision'];
  const outputTabs = ['LinkedIn', 'Twitter/X', 'Email', 'Pull Quotes'];

  const contentCards = [
    {
      theme: 'Education',
      title: 'Your Sales Process Probably Sucks',
      synopsis: 'Tim Kilroy dismantles traditional sales processes built on scripts and objection handlers, arguing they create \'feral raccoon\' energy in prospects. He...',
      type: 'original',
      repurposes: 0
    },
    {
      theme: 'Education', 
      title: 'The Discovery Call Is Dead',
      synopsis: 'Most agency discovery calls are performative theater designed to close deals, not genuine explorations of fit. This breakdown reveals why the...',
      type: 'article',
      repurposes: 2
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: brand.lightGray,
      fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Import Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Poppins:wght@400;500;600;700&display=swap');
      `}</style>

      {/* === TOP NAV === */}
      <nav style={{
        background: brand.white,
        borderBottom: `3px solid ${brand.red}`,
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: brand.red,
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ 
              color: brand.white, 
              fontFamily: 'Anton, sans-serif',
              fontSize: '18px',
              letterSpacing: '-1px'
            }}>CH</span>
          </div>
          <span style={{
            fontFamily: 'Anton, sans-serif',
            fontSize: '22px',
            color: brand.black,
            letterSpacing: '0.5px'
          }}>CONTENT HUB</span>
        </div>

        {/* Nav Items */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {navItems.map(item => (
            <button
              key={item}
              onClick={() => setActiveNav(item.toLowerCase())}
              style={{
                padding: '8px 20px',
                background: activeNav === item.toLowerCase() ? brand.red : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: activeNav === item.toLowerCase() ? brand.white : brand.black,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                transition: 'all 0.15s ease'
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Add Content CTA */}
        <button style={{
          padding: '10px 24px',
          background: brand.black,
          border: 'none',
          borderRadius: '4px',
          color: brand.white,
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          fontFamily: 'Poppins, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.15s ease'
        }}>
          <span style={{ fontSize: '18px', fontWeight: '300' }}>+</span>
          Add Content
        </button>
      </nav>

      {/* === MAIN CONTENT === */}
      <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Page Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontFamily: 'Anton, sans-serif',
            fontSize: '42px',
            color: brand.black,
            margin: '0 0 8px',
            letterSpacing: '1px'
          }}>CONTENT REPOSITORY</h1>
          <p style={{
            fontSize: '16px',
            color: brand.textGray,
            margin: 0
          }}>Browse and repurpose your team's content</p>
        </div>

        {/* Search + Filters Row */}
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap'
        }}>
          {/* Search */}
          <div style={{
            flex: '1',
            minWidth: '280px',
            position: 'relative'
          }}>
            <input
              type="text"
              placeholder="Search content..."
              style={{
                width: '100%',
                padding: '14px 16px 14px 44px',
                border: `2px solid ${brand.mediumGray}`,
                borderRadius: '8px',
                fontSize: '15px',
                fontFamily: 'Poppins, sans-serif',
                background: brand.white,
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
            />
            <span style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: brand.textGray,
              fontSize: '18px'
            }}>🔍</span>
          </div>

          {/* 4E Filter Pills */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {filters.map(filter => {
              const isActive = activeFilter === filter.toLowerCase();
              const getFilterColor = (f) => {
                switch(f.toLowerCase()) {
                  case 'evidence': return '#3B82F6';
                  case 'education': return '#10B981';
                  case 'entertainment': return '#F59E0B';
                  case 'envision': return '#EC4899';
                  default: return brand.red;
                }
              };
              
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter.toLowerCase())}
                  style={{
                    padding: '10px 18px',
                    background: isActive ? getFilterColor(filter) : brand.white,
                    border: `2px solid ${isActive ? getFilterColor(filter) : brand.mediumGray}`,
                    borderRadius: '50px',
                    color: isActive ? brand.white : brand.black,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '24px',
          marginBottom: '48px'
        }}>
          {contentCards.map((card, idx) => (
            <div
              key={idx}
              style={{
                background: brand.white,
                borderRadius: '12px',
                border: `2px solid ${brand.mediumGray}`,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {/* Red accent bar at top */}
              <div style={{
                height: '4px',
                background: brand.red,
                width: '100%'
              }} />
              
              <div style={{ padding: '24px' }}>
                {/* Theme Badge */}
                <span style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  background: '#DCFCE7',
                  color: '#166534',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '4px',
                  marginBottom: '16px'
                }}>{card.theme}</span>

                {/* Title */}
                <h3 style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '20px',
                  fontWeight: '700',
                  color: brand.black,
                  margin: '0 0 12px',
                  lineHeight: '1.3'
                }}>{card.title}</h3>

                {/* Synopsis */}
                <p style={{
                  fontSize: '14px',
                  color: brand.textGray,
                  margin: '0 0 20px',
                  lineHeight: '1.6'
                }}>{card.synopsis}</p>

                {/* Footer */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '16px',
                  borderTop: `1px solid ${brand.mediumGray}`
                }}>
                  <span style={{
                    fontSize: '13px',
                    color: brand.textGray
                  }}>{card.type}</span>
                  <span style={{
                    fontSize: '13px',
                    color: brand.red,
                    fontWeight: '600'
                  }}>{card.repurposes} repurposes</span>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Card */}
          <div
            style={{
              background: brand.white,
              borderRadius: '12px',
              border: `2px dashed ${brand.mediumGray}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '280px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: brand.lightGray,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '28px', color: brand.textGray }}>+</span>
            </div>
            <span style={{
              fontSize: '15px',
              fontWeight: '600',
              color: brand.textGray
            }}>Add Content</span>
          </div>
        </div>

        {/* === DETAIL VIEW MOCKUP === */}
        <div style={{
          background: brand.white,
          borderRadius: '12px',
          border: `2px solid ${brand.mediumGray}`,
          overflow: 'hidden',
          marginTop: '48px'
        }}>
          {/* Red top bar */}
          <div style={{
            height: '4px',
            background: brand.red,
            width: '100%'
          }} />

          <div style={{ padding: '32px' }}>
            {/* Back link */}
            <button style={{
              background: 'none',
              border: 'none',
              color: brand.textGray,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              ← Back to repository
            </button>

            {/* Content Header */}
            <div style={{ marginBottom: '24px' }}>
              <span style={{
                display: 'inline-block',
                padding: '6px 14px',
                background: '#DCFCE7',
                color: '#166534',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '4px',
                marginBottom: '12px'
              }}>Education</span>
              
              <h2 style={{
                fontFamily: 'Anton, sans-serif',
                fontSize: '32px',
                color: brand.black,
                margin: '0 0 8px',
                letterSpacing: '0.5px'
              }}>THE DISCOVERY CALL IS DEAD</h2>
              
              <p style={{
                fontSize: '14px',
                color: brand.textGray,
                margin: 0
              }}>article · 2 repurposes</p>
            </div>

            {/* Synopsis Box */}
            <div style={{
              background: brand.lightGray,
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '32px',
              borderLeft: `4px solid ${brand.red}`
            }}>
              <p style={{
                fontSize: '15px',
                color: brand.black,
                margin: 0,
                lineHeight: '1.7'
              }}>
                Most agency discovery calls are performative theater designed to close deals, not genuine explorations of fit. This breakdown reveals why the 'one call close' mentality attracts desperate clients and creates churn, then teaches a better approach: deep pre-call research, authentic understanding, and treating discovery as mutual exploration rather than a sales performance.
              </p>
              <a href="#" style={{
                color: brand.red,
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
                marginTop: '12px'
              }}>View original →</a>
            </div>

            {/* Repurpose Section */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  fontFamily: 'Anton, sans-serif',
                  fontSize: '24px',
                  color: brand.black,
                  margin: 0,
                  letterSpacing: '0.5px'
                }}>REPURPOSE</h3>
                <button style={{
                  padding: '12px 24px',
                  background: brand.red,
                  border: 'none',
                  borderRadius: '6px',
                  color: brand.white,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif'
                }}>Generate All</button>
              </div>

              {/* Output Tabs */}
              <div style={{
                display: 'flex',
                borderBottom: `2px solid ${brand.mediumGray}`,
                marginBottom: '24px'
              }}>
                {outputTabs.map(tab => {
                  const isActive = activeTab === tab.toLowerCase().replace('/', '');
                  const getIcon = (t) => {
                    switch(t) {
                      case 'LinkedIn': return '💼';
                      case 'Twitter/X': return '🐦';
                      case 'Email': return '✉️';
                      case 'Pull Quotes': return '💬';
                      default: return '';
                    }
                  };
                  
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab.toLowerCase().replace('/', ''))}
                      style={{
                        padding: '14px 24px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: isActive ? `3px solid ${brand.red}` : '3px solid transparent',
                        color: isActive ? brand.black : brand.textGray,
                        fontSize: '14px',
                        fontWeight: isActive ? '600' : '400',
                        cursor: 'pointer',
                        fontFamily: 'Poppins, sans-serif',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '-2px'
                      }}
                    >
                      <span>{getIcon(tab)}</span>
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Generated Content Area */}
              <div style={{
                background: brand.lightGray,
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <p style={{
                  fontSize: '15px',
                  color: brand.textGray,
                  margin: '0 0 16px'
                }}>No LinkedIn content generated yet</p>
                <button style={{
                  padding: '12px 28px',
                  background: brand.white,
                  border: `2px solid ${brand.black}`,
                  borderRadius: '6px',
                  color: brand.black,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  transition: 'all 0.15s ease'
                }}>Generate LinkedIn</button>
              </div>
            </div>
          </div>
        </div>

        {/* === DASHBOARD METRICS MOCKUP === */}
        <div style={{ marginTop: '48px' }}>
          <h2 style={{
            fontFamily: 'Anton, sans-serif',
            fontSize: '28px',
            color: brand.black,
            margin: '0 0 24px',
            letterSpacing: '0.5px'
          }}>DASHBOARD VIEW</h2>

          {/* Metrics Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '32px'
          }}>
            {[
              { label: 'Total Sources', value: '12', accent: brand.red },
              { label: 'Total Repurposes', value: '47', accent: brand.red },
              { label: 'This Week', value: '8', accent: brand.yellow },
              { label: 'Team Members', value: '4', accent: brand.black }
            ].map((metric, idx) => (
              <div
                key={idx}
                style={{
                  background: brand.white,
                  borderRadius: '12px',
                  padding: '24px',
                  borderTop: `4px solid ${metric.accent}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <p style={{
                  fontSize: '13px',
                  color: brand.textGray,
                  margin: '0 0 8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>{metric.label}</p>
                <p style={{
                  fontFamily: 'Anton, sans-serif',
                  fontSize: '36px',
                  color: brand.black,
                  margin: 0
                }}>{metric.value}</p>
              </div>
            ))}
          </div>

          {/* 4E Distribution */}
          <div style={{
            background: brand.white,
            borderRadius: '12px',
            padding: '28px',
            borderTop: `4px solid ${brand.red}`
          }}>
            <h3 style={{
              fontFamily: 'Anton, sans-serif',
              fontSize: '20px',
              color: brand.black,
              margin: '0 0 24px',
              letterSpacing: '0.5px'
            }}>CONTENT BY 4E THEME</h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px'
            }}>
              {[
                { label: 'Evidence', count: 3, color: '#3B82F6', bg: '#DBEAFE' },
                { label: 'Education', count: 6, color: '#10B981', bg: '#DCFCE7' },
                { label: 'Entertainment', count: 2, color: '#F59E0B', bg: '#FEF3C7' },
                { label: 'Envision', count: 1, color: '#EC4899', bg: '#FCE7F3' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    textAlign: 'center',
                    padding: '20px',
                    background: item.bg,
                    borderRadius: '8px'
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    background: brand.white,
                    color: item.color,
                    fontSize: '12px',
                    fontWeight: '600',
                    borderRadius: '4px',
                    marginBottom: '12px',
                    border: `1px solid ${item.color}`
                  }}>{item.label}</span>
                  <p style={{
                    fontFamily: 'Anton, sans-serif',
                    fontSize: '32px',
                    color: brand.black,
                    margin: 0
                  }}>{item.count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default ContentHubRedesign;
