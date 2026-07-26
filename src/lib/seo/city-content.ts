// City-specific SEO content used by /cities/$city landing pages.
// Neighborhood lists and tips are curated per metro, with a sensible fallback.

export const CITY_NEIGHBORHOODS: Record<string, string[]> = {
  "new-york": ["Upper East Side", "Williamsburg", "Harlem", "Astoria", "Park Slope", "Chelsea", "Long Island City", "Bushwick"],
  "los-angeles": ["Santa Monica", "Silver Lake", "Downtown LA", "Venice", "Pasadena", "Sherman Oaks", "Koreatown", "Culver City"],
  chicago: ["Lincoln Park", "Wicker Park", "Lakeview", "Logan Square", "River North", "Hyde Park", "Pilsen", "West Loop"],
  austin: ["South Congress", "East Austin", "Mueller", "Zilker", "Hyde Park", "Domain", "Westlake", "Cedar Park"],
  "san-francisco": ["Mission District", "SoMa", "Noe Valley", "Sunset", "Marina", "Hayes Valley", "Bernal Heights", "Richmond"],
  miami: ["Brickell", "Wynwood", "Coral Gables", "Little Havana", "Coconut Grove", "Miami Beach", "Edgewater", "Doral"],
  seattle: ["Capitol Hill", "Ballard", "Fremont", "Queen Anne", "South Lake Union", "West Seattle", "Greenwood", "Beacon Hill"],
  denver: ["LoDo", "Capitol Hill", "Highlands", "Cherry Creek", "Wash Park", "RiNo", "Stapleton", "Baker"],
  boston: ["Back Bay", "South End", "Beacon Hill", "Cambridge", "Somerville", "Jamaica Plain", "Charlestown", "Allston"],
  atlanta: ["Midtown", "Buckhead", "Old Fourth Ward", "Virginia-Highland", "Decatur", "West End", "Inman Park", "Grant Park"],
  phoenix: ["Arcadia", "Downtown Phoenix", "Ahwatukee", "Scottsdale", "Tempe", "Desert Ridge", "Roosevelt Row", "Chandler"],
  portland: ["Pearl District", "Alberta Arts", "Sellwood", "Hawthorne", "Laurelhurst", "St. Johns", "Beaverton", "Division"],
  washington: ["Dupont Circle", "Capitol Hill", "Georgetown", "Columbia Heights", "Navy Yard", "Shaw", "Petworth", "Adams Morgan"],
  dallas: ["Uptown", "Deep Ellum", "Bishop Arts", "Lakewood", "Oak Lawn", "Plano", "Frisco", "Addison"],
};

export function neighborhoodsFor(slug: string, cityName: string): string[] {
  return (
    CITY_NEIGHBORHOODS[slug] ?? [
      `Downtown ${cityName}`,
      `North ${cityName}`,
      `South ${cityName}`,
      `East ${cityName}`,
      `West ${cityName}`,
      `${cityName} Suburbs`,
    ]
  );
}

export function costTable(avg: number) {
  return [
    { size: "Studio / 1 bedroom", local: Math.round(avg * 0.55), long: Math.round(avg * 1.5) },
    { size: "2 bedroom", local: avg, long: Math.round(avg * 2.3) },
    { size: "3 bedroom house", local: Math.round(avg * 1.55), long: Math.round(avg * 3.2) },
    { size: "4+ bedroom house", local: Math.round(avg * 2.1), long: Math.round(avg * 4.1) },
  ];
}

export function cityFaq(cityName: string, state: string, avg: number) {
  return [
    {
      q: `How much do movers cost in ${cityName}, ${state}?`,
      a: `A typical 2-bedroom local move in ${cityName} averages about $${avg.toLocaleString()}. Studio moves usually run $${Math.round(avg * 0.55).toLocaleString()}, while a 3-bedroom house is closer to $${Math.round(avg * 1.55).toLocaleString()}. Long-distance moves out of ${cityName} are priced by weight and mileage. Use the calculator above for an exact, itemized estimate.`,
    },
    {
      q: `How do I find licensed movers in ${cityName}?`,
      a: `Every Easy Moving partner serving ${cityName} is DOT/MC licensed and carries active cargo and liability insurance. We verify credentials before any company can receive your move request.`,
    },
    {
      q: `How far in advance should I book a move in ${cityName}?`,
      a: `Book 3–4 weeks ahead for a ${cityName} move, and 6+ weeks if you're moving between the 1st and 5th of the month or during the May–September peak season.`,
    },
    {
      q: `Do ${cityName} buildings require a certificate of insurance (COI)?`,
      a: `Many ${cityName} apartment and condo buildings require a COI naming the building as additional insured. Your assigned mover issues it free of charge — just share your management company's requirements.`,
    },
    {
      q: `Is the quote I get here the final price?`,
      a: `Your instant estimate is based on your real inventory, access details, and driving distance. Once a licensed ${cityName} mover confirms the details, the price locks in — no hidden fees or surprise charges on move day.`,
    },
  ];
}

export function cityTips(cityName: string) {
  return [
    `Book at least 4 weeks ahead if you're moving between the 1st and 5th of the month — ${cityName} crews sell out first.`,
    `${cityName} buildings often require a certificate of insurance (COI). Your assigned mover provides it at no cost.`,
    `Reserve the freight elevator early — most residential buildings need a 24–48 hour notice window.`,
    `Check street parking rules. Where permits are required in ${cityName}, our partners include them in your quote.`,
    `Move mid-week and mid-month for the lowest ${cityName} rates — savings of 15–25% are common.`,
    `Declutter before you get quoted: pricing is driven by cubic feet, so every item you don't move lowers your cost.`,
  ];
}
