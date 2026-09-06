import React from 'react';
import { Star, CheckCircle2, Building, Calendar, Users } from 'lucide-react';
import { AppleScrollReveal, AppleScrollStagger, AppleScrollCard } from '../../components/common/AppleScrollReveal';

export const ReviewsPage: React.FC = () => {
  const caseStudies = [
    {
      organizer: 'National Engineering Summit 2026',
      lead: 'Prof. Ramesh Kulkarni, Chief Coordinator',
      attendees: '2,400 attendees checked in',
      scanners: '8 Gate Scanners across 4 Entrances',
      quote: 'We processed 2,400 students in less than 28 minutes at the main auditorium. Not a single duplicate entry slipped through, and the offline sync handled our basement Wi-Fi dead zone flawlessly.',
      metrics: '28 min total admission • 0 duplicate violations',
    },
    {
      organizer: 'InnovateX Hackathon',
      lead: 'Maya Sundaram, Lead Operations',
      attendees: '1,200 participants & mentors',
      scanners: '5 Mobile Scanners',
      quote: 'The CSV import took 10 seconds to validate 1,200 USNs. Being able to toggle gate scanners and view live branch breakdowns on the admin dashboard gave our security team complete situational awareness.',
      metrics: '1,200 attendees validated • 100% token accuracy',
    },
    {
      organizer: 'BioMed Global Symposium',
      lead: 'Dr. Arthur Pendelton, Event Director',
      attendees: '850 VIP delegates',
      scanners: '3 VIP Fast-Track Terminals',
      quote: 'ADMITTO replaced our paper rosters and clunky rental scanners with our volunteers’ own smartphones. The affirmative audio chimes made scanning effortless and brisk.',
      metrics: 'Sub-50ms scan speed • Zero hardware rentals',
    },
  ];

  return (
    <div id="reviews-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 apple-momentum-scroll">
      <AppleScrollReveal direction="up" distance={25}>
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill text-xs font-semibold text-indigo-300">
            Organizer Case Studies
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-['Space_Grotesk'] tracking-tight">
            Verified Event Throughput Reports
          </h1>
          <p className="text-base text-slate-300">
            Real metrics and operational experiences from engineering colleges, summits, and institutional conferences.
          </p>
        </div>
      </AppleScrollReveal>

      <AppleScrollStagger staggerDelay={0.09} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {caseStudies.map((cs, idx) => (
          <AppleScrollCard
            key={idx}
            className="glass rounded-3xl p-7 flex flex-col justify-between space-y-6 border border-white/10 hover:border-indigo-400/30 shadow-xl"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                "{cs.quote}"
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <div>
                <h4 className="text-sm font-bold text-white">{cs.organizer}</h4>
                <p className="text-[11px] text-slate-400">{cs.lead}</p>
              </div>
              <div className="glass-dark p-2.5 rounded-xl border border-white/10 text-[11px] font-mono text-emerald-400">
                {cs.metrics}
              </div>
            </div>
          </AppleScrollCard>
        ))}
      </AppleScrollStagger>
    </div>
  );
};
