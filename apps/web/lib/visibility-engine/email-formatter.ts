import { AnalysisReport } from './types';

export const formatEmail = (report: AnalysisReport): string => {
  const { brandName, visibilityScore, brandArchetype, executiveSummary, coreStrengths, visibilityLeaks, ninetyDayPlan } = report;

  const scoreColor = visibilityScore > 70 ? '#FFDE59' : visibilityScore > 40 ? '#E51B23' : '#888888';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; color: #000000; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: #000000; color: #ffffff; padding: 20px; text-align: center; border-bottom: 4px solid #E51B23; }
          .score-section { background-color: #000000; color: #ffffff; padding: 30px; text-align: center; }
          .score-circle { width: 100px; height: 100px; border-radius: 50%; border: 4px solid ${scoreColor}; line-height: 100px; font-size: 40px; font-weight: bold; margin: 0 auto; color: #ffffff; }
          .section { padding: 20px; border-bottom: 1px solid #eeeeee; }
          .section-title { color: #E51B23; font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
          .archetype-box { background-color: #f9f9f9; border-left: 4px solid #E51B23; padding: 15px; margin-bottom: 20px; }
          .risk-badge { display: inline-block; padding: 4px 8px; color: white; font-size: 10px; font-weight: bold; text-transform: uppercase; }
          .risk-critical { background-color: #E51B23; }
          .risk-high { background-color: #d9534f; }
          .risk-moderate { background-color: #f0ad4e; }
          .footer { background-color: #000000; color: #888888; padding: 20px; text-align: center; font-size: 12px; }
          .btn { display: inline-block; background-color: #E51B23; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; text-transform: uppercase; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 24px;">DEMAND<span style="color:#E51B23">OS</span> REPORT</h1>
            <p style="margin:5px 0 0 0; font-size: 12px; color: #888888;">VISIBILITY ENGINE RESULTS: ${brandName.toUpperCase()}</p>
          </div>

          <div class="score-section">
            <div class="score-circle">${visibilityScore}</div>
            <h2 style="margin-top: 15px; margin-bottom: 5px; color: #E51B23;">${brandArchetype.name.toUpperCase()}</h2>
            <p style="margin: 0; font-size: 14px; color: #cccccc;">"${brandArchetype.reasoning}"</p>
          </div>

          <div class="section">
            <div class="section-title">Diagnosis</div>
            <p style="line-height: 1.5;">${executiveSummary}</p>
          </div>

          <div class="section">
            <div class="section-title">Unfair Advantages</div>
            <ul style="padding-left: 20px;">
              ${coreStrengths.map(s => `<li style="margin-bottom: 8px;">${s}</li>`).join('')}
            </ul>
          </div>

          <div class="section">
            <div class="section-title">Critical Visibility Leaks</div>
            ${visibilityLeaks.map(leak => `
              <div style="margin-bottom: 15px;">
                <span class="risk-badge ${leak.revenueRisk === 'Critical' ? 'risk-critical' : leak.revenueRisk === 'High' ? 'risk-high' : 'risk-moderate'}">${leak.revenueRisk} RISK</span>
                <strong style="display:block; margin-top:5px;">${leak.zone}</strong>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #555;">${leak.brandStatus}</p>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <div class="section-title">90-Day Protocol</div>
            ${ninetyDayPlan.slice(0, 3).map(item => `
              <div style="margin-bottom: 10px; border-left: 2px solid #eeeeee; padding-left: 10px;">
                <strong style="color: #E51B23;">${item.week}</strong>: ${item.focus}
              </div>
            `).join('')}
          </div>

          <div class="footer">
            <p>This is an AI-generated strategic analysis.</p>
            <a href="https://calendly.com/kilroy/demandos-visibility-engine" target="_blank" class="btn">Turn This Report Into Revenue</a>
            <p style="margin-top: 20px;">&copy; ${new Date().getFullYear()} KLRY, LLC</p>
          </div>
        </div>
      </body>
    </html>
  `;
};
