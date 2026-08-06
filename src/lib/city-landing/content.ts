// ---------------------------------------------------------------------------
// City Landing & Calculator Agent — content model + deterministic generator.
//
// The deterministic builder guarantees every city has a complete, unique,
// 1,500+ word page even before the AI agent has run. When the agent runs, the
// same shape is produced by the model and stored in `city_landing_pages.content`.
// ---------------------------------------------------------------------------
import type { CityFacts } from "./data";

export interface CityFaqItem {
  q: string;
  a: string;
}

export interface CitySection {
  h2: string;
  paragraphs: string[];
  subsections?: Array<{ h3: string; body: string }>;
}

export interface CityLandingContent {
  title: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  sections: CitySection[];
  faq: CityFaqItem[];
  movingTips: string[];
  packingTips: string[];
  recommendations: string[];
  keywords: string[];
  imageAlts: {
    hero: string;
    map: string;
    calculator: string;
    gallery: string[];
  };
}

const money = (n: number) => `$${n.toLocaleString()}`;

export function keywordsFor(f: CityFacts): string[] {
  const c = `${f.city}`;
  return [
    `moving company ${c}`,
    `movers ${c}`,
    `moving cost ${c}`,
    `moving calculator ${c}`,
    `moving estimate ${c}`,
    `moving quote ${c}`,
    `apartment movers ${c}`,
    `office movers ${c}`,
    `long distance movers ${c}`,
    `local movers ${c}`,
    `${c} ${f.stateCode} moving companies`,
    `cheap movers ${c}`,
  ];
}

export function buildCityLandingContent(f: CityFacts): CityLandingContent {
  const c = f.city;
  const st = f.stateCode;
  const a = f.averages;
  const hoods = f.neighborhoods.slice(0, 6);
  const hoodList = hoods.join(", ");
  const hwy = f.highways.length ? f.highways.join(", ") : "the metro's main interstates";
  const county = f.county ? `${f.county}, ${f.stateName}` : f.stateName;
  const pop = f.population.toLocaleString();

  return {
    title: `Moving Calculator ${c}, ${st} — Instant Moving Cost Estimate | Easy Moving`,
    metaDescription: `Calculate your ${c}, ${st} moving cost in 60 seconds. Real local and long-distance pricing, licensed ${c} movers, apartment and office moves. Average 2-bedroom move: ${money(a.twoBed)}.`,
    h1: `Moving Calculator for ${c}, ${st}`,
    intro: [
      `Planning a move in ${c}? Use the Easy Moving calculator below to price your move against real ${c} carrier rates — no phone call, no sales pitch, no email wall. Enter your origin and destination ZIP codes, your inventory, and access details like floor, elevator and long carry, and you'll see an itemized estimate instantly.`,
      `${c} is home to roughly ${pop} residents across ${county}, and it is one of the busiest moving markets in ${f.stateName}. Rates here are shaped by traffic on ${hwy}, building rules in neighborhoods like ${hoodList}, and the season — summer weekends routinely cost 20–30% more than a mid-week move in February.`,
      `Every mover in the Easy Moving network that serves ${c} is DOT/MC licensed with active cargo and liability insurance, verified before a single job is released to them. When you submit your estimate, one local company receives it — your details are never sold to a list of callers.`,
    ],
    sections: [
      {
        h2: `How much does it cost to move in ${c}, ${st}?`,
        paragraphs: [
          `A typical local move inside ${c} runs about ${money(a.studio)} for a studio or one-bedroom, ${money(a.twoBed)} for a two-bedroom apartment, and ${money(a.house)} for a three-bedroom house. Hourly crews in ${c} average around ${money(a.hourly)} per hour for two movers and a truck, with a three-hour minimum on most jobs.`,
          `Long-distance moves out of ${c} are priced differently: instead of hours, carriers bill by shipment weight (or cubic feet) and mileage, plus accessorials like stair carries, shuttle service and storage-in-transit. That is why two ${c} households moving the same distance can see very different quotes — the volume and the access details drive the number, not the ZIP code alone.`,
          `The calculator on this page uses the same pricing engine our partner movers use, so the range you see reflects your actual inventory and access, not a national average.`,
        ],
        subsections: [
          {
            h3: `What drives your ${c} moving price`,
            body: `Volume (cubic feet), distance, floor and elevator access, long carry from the truck to your door, packing services, specialty items such as a piano or gym equipment, and the calendar date. Moves between the 1st and 5th of the month and on summer weekends carry the highest ${c} demand pricing.`,
          },
          {
            h3: `Local vs. long distance in ${c}`,
            body: `Anything under roughly 100 miles inside ${f.stateName} is quoted hourly as a local move. Beyond that, your ${c} move is an interstate shipment governed by federal tariff rules, quoted by weight and mileage with a written binding or not-to-exceed estimate.`,
          },
        ],
      },
      {
        h2: `Local moving guide for ${c}`,
        paragraphs: [
          `Getting a move right in ${c} is mostly about logistics you can control: elevator windows, curb access, and timing around ${hwy}. Crews that start at 8:00 a.m. almost always finish faster and cheaper than crews that start at noon, because loading happens before the metro's traffic peaks.`,
          f.parkingNotes,
          `Neighborhood access varies widely. ${hoods[0] ?? c} and ${hoods[1] ?? c} tend to have older buildings with narrow stairwells and no dedicated loading zone, while newer developments usually offer a dock and a booked freight elevator. Tell us the details in the calculator and the estimate adjusts accordingly.`,
        ],
        subsections: [
          { h3: `Apartment moves in ${c}`, body: f.apartmentTips },
          { h3: `Office and commercial moves in ${c}`, body: f.officeTips },
          { h3: `Storage in ${c}`, body: f.storageInfo },
          ...(f.regulations ? [{ h3: `${c} moving regulations`, body: f.regulations }] : []),
        ],
      },
      {
        h2: `Best time to move in ${c}`,
        paragraphs: [
          `Peak season in ${c} runs May through September, and within any month the first and last three days are the busiest because leases turn over. If your dates are flexible, a Tuesday or Wednesday in the middle of the month is the single easiest way to lower your ${c} moving cost — savings of 15–25% are common.`,
          `Weather matters too. Book earlier start times in the summer so the crew loads before the afternoon heat, and build a buffer day into winter moves in case road conditions delay a long-distance delivery window.`,
        ],
      },
      {
        h2: `Neighborhoods and areas we serve around ${c}`,
        paragraphs: [
          `Our partner movers cover all of ${c} and the surrounding ${county} suburbs, including ${f.neighborhoods.join(", ")}. Whether you're moving a studio across ${c} or a full house out of ${f.stateName}, the same network handles it.`,
          `Time zone: ${f.timezone}. Crews typically arrive between 8:00 and 10:00 a.m. local time unless you request an afternoon window.`,
          ...(f.zipCodes.length
            ? [`Common ${c} ZIP codes: ${f.zipCodes.join(", ")}. You can start the calculator with any of them.`]
            : []),
        ],
      },
      {
        h2: `Why use the Easy Moving calculator instead of calling around`,
        paragraphs: [
          `Calling five ${c} moving companies takes an afternoon and still leaves you comparing numbers that were built differently. The calculator produces one itemized estimate from your real inventory, then routes it to a single licensed ${c} mover who confirms it. No shared lead lists, no unsolicited call blasts.`,
          `You get a quote number, a downloadable PDF estimate, and a customer portal where you can accept the final price, track your move date and message your assigned company directly.`,
        ],
      },
    ],
    faq: buildCityFaq(f),
    movingTips: [
      `Book your ${c} crew 3–4 weeks ahead, or 6+ weeks for a move between the 1st and 5th of the month.`,
      `Reserve the freight elevator and confirm the loading dock hours in writing with building management.`,
      `Request the certificate of insurance early — most ${c} buildings need it 48 hours before move day.`,
      `Photograph electronics and furniture before disassembly so any claim is simple to document.`,
      `Keep a "first night" box with chargers, medication, tools, bedding and coffee in your own car.`,
      `Measure doorways and stairwells in older ${c} buildings before move day to avoid hoisting fees.`,
      `Move mid-week and mid-month for the lowest ${c} rates.`,
      `Declutter before you get quoted: pricing follows volume, so every item you don't move lowers the price.`,
    ],
    packingTips: [
      `Use small boxes for books and large boxes only for light bulky items — overloaded boxes are the #1 cause of damage.`,
      `Label every box with the destination room and a one-line summary of contents.`,
      `Wrap dishes vertically in dish-pack boxes with paper between each plate.`,
      `Tape screws and hardware to the underside of the furniture they belong to, in a labeled bag.`,
      `Drain and dry appliances at least 24 hours before move day.`,
      `Pack a clearly marked "open first" carton for the kitchen and one for the bathroom.`,
    ],
    recommendations: [
      `Update your address with USPS and ${f.stateName} DMV within 10 days of your ${c} move.`,
      `Schedule utility transfers for the day before your move-in so the new place has power and water.`,
      `If you're moving into a high-rise in ${hoods[0] ?? c}, ask about elevator padding requirements.`,
      `Ask your ${c} mover for the DOT/MC number and verify it — every Easy Moving partner passes this check before joining.`,
    ],
    keywords: keywordsFor(f),
    imageAlts: {
      hero: `Professional movers loading a truck in ${c}, ${st}`,
      map: `Map of ${c}, ${st} moving service area including ${hoods.slice(0, 3).join(", ")}`,
      calculator: `Easy Moving instant moving cost calculator for ${c}, ${st}`,
      gallery: [
        `Apartment move in ${hoods[0] ?? c}, ${c}`,
        `Packing supplies prepared for a ${c} household move`,
        `Moving truck on ${f.highways[0] ?? "the highway"} near ${c}`,
        `Storage vaults used for ${c} storage-in-transit`,
      ],
    },
  };
}

function buildCityFaq(f: CityFacts): CityFaqItem[] {
  const c = f.city;
  const a = f.averages;
  return [
    {
      q: `How much do movers cost in ${c}, ${f.stateCode}?`,
      a: `A two-bedroom local move in ${c} averages ${money(a.twoBed)}. Studios run near ${money(a.studio)} and three-bedroom houses near ${money(a.house)}. Hourly crews average ${money(a.hourly)}/hour for two movers and a truck. Use the calculator above for an itemized number based on your actual inventory.`,
    },
    {
      q: `How does the ${c} moving calculator work?`,
      a: `Enter origin and destination ZIP codes, property type, floor and elevator access, your inventory, and any add-ons like packing or storage. The engine prices distance, volume, labor and access in real time and returns a range instantly — no email required to see it.`,
    },
    {
      q: `Are ${c} movers licensed and insured?`,
      a: `Every partner serving ${c} holds an active DOT/MC registration and carries cargo and liability insurance. We verify credentials before any company can receive your move request, and re-check them on renewal.`,
    },
    {
      q: `How far in advance should I book a mover in ${c}?`,
      a: `Book 3–4 weeks ahead for a standard ${c} move, and 6+ weeks if you're moving between the 1st and 5th of the month or during the May–September peak.`,
    },
    {
      q: `What's the cheapest day to move in ${c}?`,
      a: `Mid-week, mid-month. A Tuesday or Wednesday between the 10th and the 20th is typically 15–25% cheaper in ${c} than a Saturday at the start of the month.`,
    },
    {
      q: `Do I need a parking permit to move in ${c}?`,
      a: f.parkingNotes,
    },
    {
      q: `Do ${c} buildings require a certificate of insurance (COI)?`,
      a: `Many ${c} apartment, condo and office buildings require a COI naming the building as additional insured. Your assigned mover issues it free — just forward your management company's requirements.`,
    },
    {
      q: `Can you move me from ${c} to another state?`,
      a: `Yes. Long-distance moves out of ${c} are quoted by shipment weight or cubic feet plus mileage, with a written estimate and a delivery window. The calculator handles interstate destinations automatically once you enter the destination ZIP.`,
    },
    {
      q: `Do you offer packing services in ${c}?`,
      a: `Yes — full pack, partial pack (kitchen and fragiles only) and unpacking are all available as add-ons in the calculator, priced by room count and volume.`,
    },
    {
      q: `Is storage available in ${c}?`,
      a: f.storageInfo,
    },
    {
      q: `How do office movers in ${c} work?`,
      a: f.officeTips,
    },
    {
      q: `What about apartment moves in ${c}?`,
      a: f.apartmentTips,
    },
    {
      q: `Is the calculator price the final price?`,
      a: `Your instant estimate is based on your real inventory, access details and driving distance. Once a licensed ${c} mover reviews and confirms the details, the price locks in — no hidden fees, no surprise charges on move day.`,
    },
    {
      q: `What if I need to move on short notice in ${c}?`,
      a: `Same-week ${c} moves are usually possible outside peak weekends. Submit the estimate with your target date and the first available partner claims it, typically within a few hours.`,
    },
    {
      q: `Can you move specialty items like a piano or a gym setup?`,
      a: `Yes. Pianos, safes, gym equipment, large appliances and high-value fragiles are all selectable in the calculator so the crew arrives with the right equipment and the price includes it up front.`,
    },
    {
      q: `Which areas around ${c} do you cover?`,
      a: `All of ${f.county ?? f.stateName} and the surrounding metro, including ${f.neighborhoods.slice(0, 5).join(", ")}, plus nearby cities such as ${f.nearbyCities.slice(0, 4).map((n) => n.name).join(", ") || f.stateName}.`,
    },
  ];
}

// ── Quality / SEO scoring ──────────────────────────────────────────────────

export function contentWordCount(content: CityLandingContent): number {
  const parts: string[] = [
    content.title,
    content.metaDescription,
    content.h1,
    ...content.intro,
    ...content.sections.flatMap((s) => [
      s.h2,
      ...s.paragraphs,
      ...(s.subsections?.flatMap((x) => [x.h3, x.body]) ?? []),
    ]),
    ...content.faq.flatMap((f) => [f.q, f.a]),
    ...content.movingTips,
    ...content.packingTips,
    ...content.recommendations,
  ];
  return parts.join(" ").trim().split(/\s+/).length;
}

export interface SeoValidation {
  score: number;
  words: number;
  issues: string[];
}

/** Deterministic SEO validation. Pages scoring > 95 auto-publish. */
export function validateCityContent(
  content: CityLandingContent,
  f: CityFacts,
): SeoValidation {
  const issues: string[] = [];
  let score = 100;
  const words = contentWordCount(content);

  const check = (ok: boolean, penalty: number, issue: string) => {
    if (!ok) {
      score -= penalty;
      issues.push(issue);
    }
  };

  check(words >= 1500, 25, `Content is ${words} words (minimum 1,500).`);
  check(content.title.length >= 30 && content.title.length <= 70, 8, "Title length outside 30–70 characters.");
  check(
    content.metaDescription.length >= 110 && content.metaDescription.length <= 175,
    8,
    "Meta description length outside 110–175 characters.",
  );
  check(content.h1.toLowerCase().includes(f.city.toLowerCase()), 10, "H1 is missing the city name.");
  check(content.sections.length >= 4, 10, "Fewer than 4 H2 sections.");
  check(
    content.sections.some((s) => (s.subsections?.length ?? 0) > 0),
    5,
    "No H3 subsections present.",
  );
  check(content.faq.length >= 10, 12, `FAQ has ${content.faq.length} questions (minimum 10).`);
  check(content.keywords.length >= 8, 5, "Fewer than 8 target keywords.");
  check(f.nearbyCities.length >= 3, 4, "Fewer than 3 related cities for internal linking.");
  check(content.imageAlts.gallery.length >= 3, 3, "Missing gallery image ALT text.");
  check(content.movingTips.length >= 5 && content.packingTips.length >= 5, 5, "Not enough tips.");

  return { score: Math.max(0, Math.min(100, score)), words, issues };
}
