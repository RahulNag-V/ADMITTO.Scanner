import React, { useState } from 'react';
import { Calendar, Clock, ArrowRight, BookOpen, Tag, Search } from 'lucide-react';
import { AppleScrollReveal, AppleScrollStagger, AppleScrollCard } from '../../components/common/AppleScrollReveal';

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  author: string;
  content: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'eliminating-race-conditions-in-concurrent-ticket-scanning',
    title: 'Eliminating Race Conditions in High-Concurrency Gate Check-In',
    excerpt: 'How atomic UNIQUE constraints and PostgreSQL Row-Level transactions stop duplicate scans dead in their tracks under multi-scanner load.',
    category: 'Engineering',
    date: 'Aug 24, 2026',
    readTime: '5 min read',
    author: 'Alex Vance',
    content: [
      'When hosting an event with 3,000+ attendees entering simultaneously through 8 different gates, two scanners will inevitably scan the exact same QR code badge within milliseconds of each other. If validation logic relies on read-then-write logic in client-side code, both scanners will read the attendee as "un-checked", and both will grant entry.',
      'In ADMITTO, we enforce atomicity at the database level through a single PostgreSQL constraint: `CONSTRAINT unique_event_student_checkin UNIQUE (event_id, student_id)`.',
      'By combining this constraint with a stored transaction function, the first arriving transaction completes with `SUCCESS`, while all subsequent transactions encounter a unique violation and instantly trigger the `DUPLICATE_CHECKIN` audit trail, logging the exact previous entry timestamp and scanner location.',
    ],
  },
  {
    slug: 'architecting-offline-queues-with-idempotent-sync',
    title: 'Architecting Offline Queues with Idempotent Sync for Spotty Venues',
    excerpt: 'Handling basement auditoriums and stadium dead zones with client_scan_id idempotency keys and local FIFO storage.',
    category: 'Architecture',
    date: 'Aug 18, 2026',
    readTime: '4 min read',
    author: 'Sarah Connor',
    content: [
      'Event venues like underground exhibition halls and concrete auditoriums frequently suffer from cellular network collapse as thousands of attendees connect to towers simultaneously.',
      'ADMITTO incorporates an offline-first state machine into the camera scanner interface. When a network timeout occurs, the scan is assigned an immutable `client_scan_id` (a cryptographic UUID) and appended to a persistent local queue.',
      'Upon network recovery, the scanner executes batch synchronization. Because the backend checks `UNIQUE(event_id, client_scan_id)`, retransmissions and dropped ACK packets will never produce duplicate attendance numbers.',
    ],
  },
  {
    slug: 'multi-admin-isolation-with-supabase-rls',
    title: 'Multi-Admin Event Isolation with Declarative PostgreSQL RLS',
    excerpt: 'Why a single PostgreSQL database with Row Level Security outperforms complex multi-database architectures for multi-tenant event SaaS.',
    category: 'Security',
    date: 'Aug 10, 2026',
    readTime: '6 min read',
    author: 'ADMITTO Core Team',
    content: [
      'Managing separate databases for each event organizer creates high operational complexity, slow migrations, and significant cost overhead. Instead, ADMITTO leverages PostgreSQL Row Level Security (RLS).',
      'Every profile, event, student, scanner account, check-in, and scan attempt is linked via foreign keys back to the authenticated admin ID. RLS ensures that query execution plans automatically inject security predicates before data retrieval.',
      'This guarantees that even if an attacker manipulates API payload parameters, cross-tenant data leakage is mathematically impossible.',
    ],
  },
];

interface BlogPageProps {
  onSelectPost: (slug: string) => void;
}

export const BlogPage: React.FC<BlogPageProps> = ({ onSelectPost }) => {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');

  const categories = ['ALL', 'Engineering', 'Architecture', 'Security'];

  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesCat = selectedCategory === 'ALL' || post.category === selectedCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div id="blog-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 apple-momentum-scroll">
      <AppleScrollReveal direction="up" distance={25}>
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill text-xs font-semibold text-indigo-300">
            Engineering & Access Insights
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-['Space_Grotesk'] tracking-tight">
            The ADMITTO Technical Blog
          </h1>
          <p className="text-base text-slate-300">
            Deep dives into distributed token validation, database concurrency, and event infrastructure design.
          </p>
        </div>
      </AppleScrollReveal>

      {/* Filter and Search Bar */}
      <AppleScrollReveal direction="up" distance={15}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'glass-dark text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search through any credentials"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-dark border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
            />
          </div>
        </div>
      </AppleScrollReveal>

      {/* Blog Cards */}
      <AppleScrollStagger staggerDelay={0.08} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {filteredPosts.map((post) => (
          <AppleScrollCard
            key={post.slug}
            id={`blog-card-${post.slug}`}
            onClick={() => onSelectPost(post.slug)}
            className="group cursor-pointer glass rounded-3xl p-7 flex flex-col justify-between space-y-6 border border-white/10 hover:border-indigo-400/40 shadow-xl"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span className="px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                  {post.category}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {post.readTime}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors font-['Space_Grotesk'] leading-snug">
                {post.title}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                {post.excerpt}
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-indigo-400">
              <span className="text-slate-400 text-[11px] font-normal">{post.date}</span>
              <div className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Read Article</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </AppleScrollCard>
        ))}
      </AppleScrollStagger>
    </div>
  );
};

export const BlogDetailPage: React.FC<{
  slug: string;
  onBack: () => void;
  onSelectPost: (slug: string) => void;
}> = ({ slug, onBack, onSelectPost }) => {
  const post = BLOG_POSTS.find((p) => p.slug === slug) || BLOG_POSTS[0];
  const related = BLOG_POSTS.filter((p) => p.slug !== slug);

  return (
    <div id="blog-detail-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 apple-momentum-scroll">
      <AppleScrollReveal direction="left" distance={15}>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl glass-dark border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
        >
          ← Back to All Articles
        </button>
      </AppleScrollReveal>

      <AppleScrollReveal direction="up" distance={25}>
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              {post.category}
            </span>
            <span>•</span>
            <span>{post.date}</span>
            <span>•</span>
            <span>{post.readTime}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk'] leading-tight">
            {post.title}
          </h1>

          <div className="text-xs text-slate-400">
            Written by <span className="text-slate-200 font-semibold">{post.author}</span>
          </div>
        </div>
      </AppleScrollReveal>

      <AppleScrollReveal direction="up" distance={25}>
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-8">
          {post.content.map((paragraph, i) => (
            <p key={i} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </AppleScrollReveal>

      {/* Related Posts */}
      <AppleScrollReveal direction="up" distance={30}>
        <div className="pt-12 border-t border-white/10 space-y-6">
          <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
            Related Engineering Articles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {related.slice(0, 2).map((r) => (
              <div
                key={r.slug}
                onClick={() => onSelectPost(r.slug)}
                className="p-5 rounded-2xl glass-dark border border-white/10 hover:border-indigo-400/50 cursor-pointer space-y-2 transition-all"
              >
                <div className="text-[11px] text-indigo-400 font-bold">{r.category}</div>
                <h4 className="text-sm font-bold text-white hover:text-indigo-300">{r.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-2">{r.excerpt}</p>
              </div>
            ))}
          </div>
        </div>
      </AppleScrollReveal>
    </div>
  );
};
