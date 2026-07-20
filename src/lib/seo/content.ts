// Static SEO content: comparison pages, education topics, product landing pages.

export interface ComparisonPage {
  slug: string;
  competitor: string;
  title: string;
  description: string;
  hero: string;
  intro: string;
  rows: Array<{ feature: string; easy: string; them: string }>;
  faq: FaqItem[];
}

export interface FaqItem { q: string; a: string }

export interface EducationPage {
  slug: string;
  title: string;
  description: string;
  hero: string;
  sections: Array<{ heading: string; body: string }>;
  faq: FaqItem[];
}

export interface ProductPage {
  slug: string;
  route: string;
  title: string;
  description: string;
  h1: string;
  subhead: string;
  features: Array<{ title: string; body: string; icon?: string }>;
  faq: FaqItem[];
  keyword: string;
}

// ─────────────────────────────── PRODUCT LANDING PAGES ───────────────────────────────
export const PRODUCT_PAGES: ProductPage[] = [
  {
    slug: "moving-company-software",
    route: "/moving-company-software",
    keyword: "moving company software",
    title: "Moving Company Software — All-in-One Ops Platform | Easy Moving",
    description: "Run your moving business from one dashboard. Leads, estimates, dispatch, invoices, and customer messaging built for movers.",
    h1: "Software built for moving companies",
    subhead: "Replace 6 tools with one. Manage leads, quotes, crews, trucks, and invoices from a single dashboard designed for local and long-distance moving companies.",
    features: [
      { title: "Lead inbox with SLA timers", body: "Every new lead lands in a shared inbox with an exclusive claim window and automatic escalation." },
      { title: "Estimate builder", body: "Itemized labor, truck, packing, and supplies. Send branded PDF estimates in under two minutes." },
      { title: "Dispatch board", body: "Day, week, and month views. Drag jobs onto trucks, assign crews, and see conflicts before they happen." },
      { title: "Invoicing", body: "Deposits, final balances, extras. Auto-generate PDFs, email customers, and reconcile payments." },
      { title: "Messaging center", body: "Broker channel + internal team threads. Everything stays out of email and SMS." },
      { title: "Analytics", body: "Win rate, response time, revenue by source. Know what to double down on." },
    ],
    faq: [
      { q: "Do I need a contract?", a: "No. Month-to-month with no setup fees." },
      { q: "Can multiple team members use it?", a: "Yes — invite owners, dispatchers, sales, and crew leads with role-based access." },
      { q: "Does it work on mobile?", a: "Yes. The portal is fully responsive and installable as a PWA." },
    ],
  },
  {
    slug: "moving-company-crm",
    route: "/moving-company-crm",
    keyword: "moving company CRM",
    title: "Moving Company CRM — Track Every Lead to Close | Easy Moving",
    description: "A CRM built for moving companies. Track leads, follow-ups, estimates, and revenue with zero setup.",
    h1: "The CRM built for moving companies",
    subhead: "Stop losing deals in a spreadsheet. Track every lead from first call to final payment, with automated reminders and a pipeline that fits how movers actually work.",
    features: [
      { title: "Pipeline stages", body: "New → Contacted → Estimate Sent → Scheduled → Won → Completed." },
      { title: "Customer 360", body: "Every quote, message, estimate, and invoice on one timeline." },
      { title: "Automated follow-ups", body: "Reminders when a lead goes cold. Never lose a deal because you forgot to call back." },
      { title: "Notes & tags", body: "Rich notes, tags, and lead scoring so your best crews get your best jobs." },
      { title: "Reporting", body: "Conversion rate, average revenue per move, and source ROI." },
      { title: "Integrations", body: "Connect calling, SMS, and email with Easy Moving's growing integrations list." },
    ],
    faq: [
      { q: "Can I import existing leads?", a: "Yes — upload a CSV during onboarding or bring your team in through the API." },
      { q: "Does it replace my current CRM?", a: "For most moving companies, yes. It's purpose-built for the industry." },
    ],
  },
  {
    slug: "moving-leads",
    route: "/moving-leads",
    keyword: "moving leads",
    title: "Moving Leads — Exclusive & Marketplace Leads | Easy Moving",
    description: "Buy exclusive moving leads or bid in an open marketplace. Real customers, verified addresses, and no shared spam.",
    h1: "High-intent moving leads, delivered daily",
    subhead: "Real customers using our instant quote calculator. You choose exclusive or marketplace — we handle the traffic, the funnel, and the verification.",
    features: [
      { title: "Exclusive leads", body: "One company gets 12 hours to claim before it opens to the market." },
      { title: "Verified contact info", body: "Every phone number and email is validated before delivery." },
      { title: "Real move details", body: "Origin, destination, inventory, dates, and cubic footage — not just a name and a phone." },
      { title: "Pay per lead", body: "No monthly minimums. Cancel any time." },
      { title: "Refund policy", body: "Bad number or duplicate? Get a credit within 48 hours." },
      { title: "Coverage nationwide", body: "Local and long-distance leads across all 50 states." },
    ],
    faq: [
      { q: "How are leads generated?", a: "Organic search, our AI-powered quote calculator, and paid channels we run ourselves." },
      { q: "How much do leads cost?", a: "Pricing varies by market and move type. Local moves start at $18; long-distance is higher." },
    ],
  },
  {
    slug: "exclusive-moving-leads",
    route: "/exclusive-moving-leads",
    keyword: "exclusive moving leads",
    title: "Exclusive Moving Leads — 12-Hour Head Start | Easy Moving",
    description: "Exclusive moving leads with a 12-hour claim window. No sharing, no bidding, no race to the phone.",
    h1: "Exclusive moving leads — sent to one company at a time",
    subhead: "Every exclusive lead is assigned to a single company with a 12-hour SLA. Contact them first, book them first, and never race four other movers to the phone.",
    features: [
      { title: "12-hour SLA", body: "You get first-touch rights for a full 12 hours before anyone else sees the lead." },
      { title: "Zero competition", body: "No shared list. No bidding war. One customer, one company." },
      { title: "Full PII on claim", body: "Contact info is masked until you accept. Then everything unlocks." },
      { title: "Automatic escalation", body: "Miss the SLA and it moves to the marketplace — you only pay when you claim." },
    ],
    faq: [
      { q: "What happens if I don't respond?", a: "The lead moves to the open marketplace and other partners can claim it." },
      { q: "Can I get exclusive leads in every market?", a: "Availability depends on demand. Popular metros fill fast." },
    ],
  },
  {
    slug: "open-marketplace",
    route: "/open-marketplace",
    keyword: "moving leads marketplace",
    title: "Open Moving Leads Marketplace | Easy Moving",
    description: "Bid on moving leads that didn't get claimed in the exclusive window. Pay only for the leads you claim.",
    h1: "The open moving leads marketplace",
    subhead: "When an exclusive lead isn't claimed within 12 hours, it lands here. Any verified partner can claim, quote, and win the job — on a first-come, first-served basis.",
    features: [
      { title: "First-come claiming", body: "See the lead, review the details, and claim if it fits your capacity." },
      { title: "Verified movers only", body: "DOT + insurance required. No lead-broker resellers." },
      { title: "Realtime updates", body: "Leads appear the moment they open. Set up email or push alerts." },
      { title: "Pay per claim", body: "No subscription. Fund your account and claim what you want." },
    ],
    faq: [
      { q: "How many companies can claim a marketplace lead?", a: "Up to 4 per lead. Once capacity is hit, it's closed." },
    ],
  },
  {
    slug: "moving-dispatch-software",
    route: "/moving-dispatch-software",
    keyword: "moving dispatch software",
    title: "Moving Dispatch Software — Trucks, Crews, Routes | Easy Moving",
    description: "Dispatch moving jobs with a visual board. Assign trucks and crews, see conflicts, and share day-of details with drivers.",
    h1: "Dispatch every truck and crew from one board",
    subhead: "See your entire schedule at a glance. Drag jobs onto trucks, split double-crew moves, and push route sheets to drivers on their phones.",
    features: [
      { title: "Day / Week / Month views", body: "Zoom out for the season, zoom in for tomorrow." },
      { title: "Truck & crew capacity", body: "Prevent double-bookings and see utilization at a glance." },
      { title: "Route sheets", body: "Auto-generate stop-by-stop route sheets with addresses, contacts, and inventory notes." },
      { title: "Driver mobile app", body: "Crews check in, upload photos, and log labor hours from their phones." },
    ],
    faq: [
      { q: "Does it integrate with GPS?", a: "Roadmap: yes. Fleet GPS integration ships Q3." },
    ],
  },
  {
    slug: "moving-estimate-software",
    route: "/moving-estimate-software",
    keyword: "moving estimate software",
    title: "Moving Estimate Software — AI-Powered Quotes | Easy Moving",
    description: "Generate accurate moving estimates in minutes. Itemized labor, truck, packing, and supplies. Send branded PDFs.",
    h1: "Accurate moving estimates in under 2 minutes",
    subhead: "Our estimate builder does the math for you. Feed in inventory, distance, and access — get a defensible price plus a branded PDF customers can accept online.",
    features: [
      { title: "Inventory calculator", body: "Cubic feet, weight, and truck size — computed automatically from your item list." },
      { title: "Itemized pricing", body: "Labor, truck fee, mileage, packing, supplies, insurance, and add-ons — all editable." },
      { title: "Revisions & versioning", body: "Every change is tracked. Reopen an old version any time." },
      { title: "Online acceptance", body: "Customers accept and pay a deposit directly from the estimate email." },
    ],
    faq: [
      { q: "Can I use my own pricing?", a: "Yes — set default rates per truck, per hour, and per crew size in Settings." },
    ],
  },
  {
    slug: "moving-schedule-software",
    route: "/moving-schedule-software",
    keyword: "moving schedule software",
    title: "Moving Schedule Software — Calendar for Movers | Easy Moving",
    description: "The scheduling calendar built for moving companies. Prevent double-bookings, block travel days, and sync crew availability.",
    h1: "Scheduling that thinks like a moving dispatcher",
    subhead: "Block off travel days, split crews across trucks, and see availability by day, week, or month. Built by people who've done the job.",
    features: [
      { title: "Availability engine", body: "Real-time capacity across trucks and crews." },
      { title: "Time-off & blackouts", body: "Mark crews unavailable and the calendar respects it automatically." },
      { title: "Confirmation reminders", body: "Auto-send day-before confirmations to customers via email or SMS." },
      { title: "Calendar sync", body: "Two-way sync with Google Calendar and iCloud." },
    ],
    faq: [
      { q: "Does it handle multi-day moves?", a: "Yes — long-distance and multi-day jobs span the calendar automatically." },
    ],
  },
  {
    slug: "lead-generation",
    route: "/lead-generation",
    keyword: "moving lead generation",
    title: "Moving Lead Generation — Grow Your Moving Business | Easy Moving",
    description: "Modern lead generation for moving companies. Exclusive leads, marketplace bidding, CRM, and analytics under one roof.",
    h1: "Lead generation, built for movers",
    subhead: "Stop chasing internet ads that don't convert. Easy Moving generates the traffic, qualifies the customer, and hands you a job — not a name.",
    features: [
      { title: "Qualified traffic", body: "SEO + paid channels tuned to actual movers, not tire-kickers." },
      { title: "AI quote funnel", body: "Prospects are pre-priced before you talk to them." },
      { title: "Multi-channel", body: "Voice, email, and SMS re-engagement built in." },
      { title: "Attribution", body: "See which sources actually win jobs, not just calls." },
    ],
    faq: [
      { q: "How is this different from Google Ads?", a: "Google Ads gives you clicks. We give you quote-ready customers with verified move details." },
    ],
  },
];

// ─────────────────────────────── EDUCATIONAL PAGES ───────────────────────────────
export const EDUCATION_PAGES: EducationPage[] = [
  {
    slug: "how-easy-moving-works",
    title: "How Easy Moving Works — Lead-to-Close Explained",
    description: "See how Easy Moving turns organic search traffic into booked moving jobs for our partner companies.",
    hero: "How Easy Moving works",
    sections: [
      { heading: "1. Customers find us on Google", body: "We invest heavily in SEO, content, and paid channels to attract customers actively planning a move. They arrive on our site with real intent — not just curiosity." },
      { heading: "2. They complete an instant AI quote", body: "Our calculator asks the right questions — ZIPs, inventory, dates, access — and produces an accurate estimate. That means the leads you get already understand pricing." },
      { heading: "3. We assign the lead", body: "Exclusive first, then open marketplace. You claim, you contact, you close. Our SLA engine keeps everyone honest." },
      { heading: "4. You quote, book, and complete the move", body: "Use our CRM, estimator, dispatch, and invoicing tools — or plug the lead into your own stack. Your call." },
    ],
    faq: [
      { q: "How long does approval take?", a: "1–3 business days for verified companies with DOT + insurance on file." },
    ],
  },
  {
    slug: "exclusive-leads",
    title: "What Are Exclusive Moving Leads?",
    description: "Learn how exclusive leads work at Easy Moving — 12-hour SLA, PII masking, and no shared lists.",
    hero: "Exclusive moving leads, explained",
    sections: [
      { heading: "One customer, one company", body: "Unlike shared lead services, an exclusive Easy Moving lead is assigned to a single partner for a 12-hour window." },
      { heading: "PII masked until claim", body: "You see the move details before you accept. Contact info unlocks the moment you claim, so you can call within minutes." },
      { heading: "Miss the SLA, lose the lead", body: "If you don't act within 12 hours, the lead moves to the marketplace and other partners can claim it." },
    ],
    faq: [
      { q: "Do I pay if I don't claim?", a: "No. You only pay for leads you accept." },
    ],
  },
  {
    slug: "open-marketplace",
    title: "The Open Moving Leads Marketplace",
    description: "How the Easy Moving open marketplace works: unclaimed exclusive leads open to all verified partners.",
    hero: "The open marketplace",
    sections: [
      { heading: "Second-chance leads", body: "Every lead not claimed within its exclusive window flows into the marketplace." },
      { heading: "First-come, first-served", body: "Any verified partner can claim. Capacity is capped so leads never get spammed." },
      { heading: "Predictable pricing", body: "Marketplace pricing is transparent and lower than exclusive rates." },
    ],
    faq: [{ q: "How many partners can claim one lead?", a: "Up to 4." }],
  },
  {
    slug: "lead-distribution",
    title: "How Lead Distribution Works",
    description: "The rules behind Easy Moving's lead assignment engine — SLA tiers, geographic matching, and audit logs.",
    hero: "Lead distribution rules",
    sections: [
      { heading: "Geographic matching", body: "Leads are matched to partners whose service areas cover both origin and destination." },
      { heading: "Round-robin fairness", body: "Exclusive leads rotate across eligible partners so no one company dominates a market." },
      { heading: "Audit logs", body: "Every assignment, claim, and status change is logged for transparency." },
    ],
    faq: [{ q: "Can I pause new leads?", a: "Yes — toggle availability in Company Settings any time." }],
  },
  {
    slug: "crm-benefits",
    title: "Why Moving Companies Need a Real CRM",
    description: "A CRM built for movers pays for itself. See the biggest wins from switching off spreadsheets.",
    hero: "Why moving companies need a CRM",
    sections: [
      { heading: "Follow-ups drive revenue", body: "Most moving leads take 3–5 touches to close. A CRM makes sure none fall through." },
      { heading: "Every conversation in one place", body: "Notes, calls, emails, and estimates on a single timeline per customer." },
      { heading: "Reporting you can act on", body: "See which lead sources actually win jobs, not just clicks." },
    ],
    faq: [{ q: "Is the CRM included?", a: "Yes — it's part of every Easy Moving partner account." }],
  },
  {
    slug: "company-dashboard",
    title: "Inside the Moving Company Dashboard",
    description: "Tour the Easy Moving partner dashboard: leads, estimates, dispatch, invoices, and analytics.",
    hero: "The moving company dashboard",
    sections: [
      { heading: "Everything in one screen", body: "Leads inbox, exclusive queue, marketplace, active jobs, and today's schedule." },
      { heading: "Team roles", body: "Owner, dispatcher, sales, and crew. Each sees exactly what they need." },
      { heading: "Notifications", body: "Push, email, and in-app alerts for new leads, claim windows, and messages." },
    ],
    faq: [{ q: "Can I white-label?", a: "Enterprise partners can access white-label options on request." }],
  },
  {
    slug: "growing-a-moving-company",
    title: "How to Grow a Moving Company in 2026",
    description: "A practical playbook for growing a moving business — leads, pricing, operations, and retention.",
    hero: "Growing a moving company",
    sections: [
      { heading: "Get leads on autopilot", body: "Invest in one great lead channel before you diversify. For most movers, that's Easy Moving." },
      { heading: "Charge for what you're worth", body: "Movers who use itemized estimates close 30% more jobs and rarely negotiate." },
      { heading: "Repeat & referrals", body: "1 in 4 customers moves again within 5 years. A CRM makes that revenue easy to capture." },
    ],
    faq: [{ q: "How fast can I scale?", a: "Partners typically go from 5 to 20 crews within 12 months on the platform." }],
  },
  {
    slug: "automation",
    title: "Automation for Moving Companies",
    description: "The essential automations every moving company should have — follow-ups, confirmations, invoices, and reviews.",
    hero: "Automation for movers",
    sections: [
      { heading: "Follow-up sequences", body: "Auto-send drip emails to leads that haven't responded to your quote." },
      { heading: "Day-of confirmations", body: "Text customers 24 hours before their move with truck and crew details." },
      { heading: "Post-move review asks", body: "Trigger a review request the day after every completed job." },
    ],
    faq: [{ q: "Do I need Zapier?", a: "No — the essentials are built in. Zapier is optional for advanced flows." }],
  },
  {
    slug: "lead-quality",
    title: "What Makes a High-Quality Moving Lead?",
    description: "Not all leads are equal. Here's what to look for — and what Easy Moving does to guarantee it.",
    hero: "What makes a moving lead high quality",
    sections: [
      { heading: "Verified contact info", body: "Every phone and email is validated before delivery." },
      { heading: "Real move details", body: "Distance, inventory, and dates — not just a name." },
      { heading: "Fresh timing", body: "Leads are delivered within minutes of the customer submitting." },
    ],
    faq: [{ q: "What if a lead is bad?", a: "Report it within 48 hours and we credit your account." }],
  },
  {
    slug: "moving-software",
    title: "The Best Moving Company Software in 2026",
    description: "What to look for in modern moving software — and what makes Easy Moving different.",
    hero: "Modern moving software, explained",
    sections: [
      { heading: "Purpose-built for movers", body: "Generic CRMs miss the way moves actually work — trucks, crews, cubic feet, long-carry, storage." },
      { heading: "Leads + ops in one place", body: "Buying leads in Tool A and running ops in Tool B costs deals every week." },
      { heading: "Mobile-first", body: "Your crews are in the field. Your software should live on their phones." },
    ],
    faq: [{ q: "Is there a free tier?", a: "Yes — the CRM, dispatch, and estimator are free for verified partners. You pay only for leads you claim." }],
  },
];

// ─────────────────────────────── COMPARISON PAGES ───────────────────────────────
const commonFaq: FaqItem[] = [
  { q: "Do I sign a contract?", a: "No — Easy Moving is pay-per-lead with no monthly minimums." },
  { q: "How fast can I start?", a: "1–3 business days after approval." },
];

export const COMPARISON_PAGES: ComparisonPage[] = [
  {
    slug: "vs-shared-leads",
    competitor: "Shared Lead Services",
    title: "Easy Moving vs Shared Moving Leads",
    description: "Why exclusive Easy Moving leads outperform shared lead services from Networx, HomeAdvisor, and others.",
    hero: "Easy Moving vs shared lead services",
    intro: "Shared leads sell the same customer to 4–6 companies simultaneously. Easy Moving assigns exclusive leads to one company for a 12-hour window — so you talk to the customer first, not fifth.",
    rows: [
      { feature: "Lead exclusivity", easy: "12-hour exclusive window", them: "Sold to 4–6 companies at once" },
      { feature: "Contact info", easy: "Unlocked on claim", them: "Immediate — everyone calls together" },
      { feature: "Refund on bad number", easy: "Yes, within 48h", them: "Rare or none" },
      { feature: "Move details", easy: "Origin, destination, inventory, date", them: "Name & phone only" },
      { feature: "Contract", easy: "Pay-per-lead", them: "Monthly minimum" },
    ],
    faq: commonFaq,
  },
  {
    slug: "vs-google-ads",
    competitor: "Google Ads",
    title: "Easy Moving vs Google Ads for Movers",
    description: "Google Ads gives you clicks. Easy Moving gives you booked jobs. Compare CPL, close rate, and effort.",
    hero: "Easy Moving vs Google Ads",
    intro: "Running your own Google Ads means bidding against national brands, managing keywords, and paying $80–150 per click in most markets. Easy Moving runs the traffic for you and only charges when a real customer is delivered.",
    rows: [
      { feature: "You need marketing skill", easy: "No", them: "Yes — daily optimization" },
      { feature: "Cost per lead", easy: "Fixed, transparent", them: "$80–$300 in competitive metros" },
      { feature: "Ad account management", easy: "None", them: "10–20 hrs/month" },
      { feature: "Time to first lead", easy: "1–3 days", them: "2–4 weeks to optimize" },
    ],
    faq: commonFaq,
  },
  {
    slug: "vs-facebook-ads",
    competitor: "Facebook Ads",
    title: "Easy Moving vs Facebook Ads for Movers",
    description: "Facebook ads reach a lot of people who aren't moving. Easy Moving reaches people actively planning a move.",
    hero: "Easy Moving vs Facebook Ads",
    intro: "Facebook is discovery — most people scrolling aren't planning a move. Easy Moving is intent — every lead came from a search or calculator with real move details attached.",
    rows: [
      { feature: "Intent", easy: "High — active movers", them: "Low — feed browsers" },
      { feature: "Lead form quality", easy: "Full inventory + dates", them: "Name + phone" },
      { feature: "Wasted spend", easy: "None — pay per lead", them: "High — testing creative" },
    ],
    faq: commonFaq,
  },
  {
    slug: "vs-angi",
    competitor: "Angi (Angie's List)",
    title: "Easy Moving vs Angi Leads",
    description: "How Easy Moving compares to Angi Leads for moving companies — pricing, exclusivity, and lead quality.",
    hero: "Easy Moving vs Angi Leads",
    intro: "Angi sells the same lead to multiple companies, requires a monthly subscription, and covers dozens of home-service verticals. Easy Moving is 100% moving-focused with exclusive leads and no monthly minimum.",
    rows: [
      { feature: "Focus", easy: "Moving only", them: "All home services" },
      { feature: "Exclusivity", easy: "Yes", them: "No — shared" },
      { feature: "Monthly minimum", easy: "None", them: "Yes" },
      { feature: "Verified move details", easy: "Yes", them: "Basic only" },
    ],
    faq: commonFaq,
  },
  {
    slug: "vs-thumbtack",
    competitor: "Thumbtack",
    title: "Easy Moving vs Thumbtack for Movers",
    description: "See how Easy Moving compares to Thumbtack — exclusive vs shared, bidding fees, and lead quality for moving companies.",
    hero: "Easy Moving vs Thumbtack",
    intro: "Thumbtack charges you to send a quote — whether the customer responds or not. Easy Moving charges when you claim a real, verified lead.",
    rows: [
      { feature: "Pay to quote", easy: "No", them: "Yes — every quote costs" },
      { feature: "Exclusivity", easy: "12-hour exclusive", them: "5 quotes per customer" },
      { feature: "Move-specific tools", easy: "CRM + dispatch built-in", them: "None" },
    ],
    faq: commonFaq,
  },
  {
    slug: "vs-traditional-brokers",
    competitor: "Traditional Moving Brokers",
    title: "Easy Moving vs Traditional Moving Brokers",
    description: "Old-school brokers keep 25–40% of every job. Easy Moving is a flat pay-per-lead marketplace with full price transparency.",
    hero: "Easy Moving vs traditional moving brokers",
    intro: "Traditional brokers book the move, keep a huge cut, and hand the leftover to whichever van line has capacity. Easy Moving is different — customers see the price, you set the price, and you keep 100% of the revenue.",
    rows: [
      { feature: "Broker cut", easy: "$0 — flat lead fee", them: "25–40% of every job" },
      { feature: "You set the price", easy: "Yes", them: "No — broker sets it" },
      { feature: "Customer relationship", easy: "Yours", them: "Broker's" },
      { feature: "Transparency", easy: "Full", them: "Opaque" },
    ],
    faq: commonFaq,
  },
];

export const productBySlug = Object.fromEntries(PRODUCT_PAGES.map((p) => [p.slug, p]));
export const educationBySlug = Object.fromEntries(EDUCATION_PAGES.map((p) => [p.slug, p]));
export const comparisonBySlug = Object.fromEntries(COMPARISON_PAGES.map((p) => [p.slug, p]));
