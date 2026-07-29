// SEO location dataset: US states + major cities.
// Used to auto-generate /partners/:location, /moving-leads/:location, etc.

export interface Location {
  slug: string;
  name: string;
  kind: "state" | "city" | "metro";
  state?: string; // state code for cities
  stateName?: string; // full state name for cities
  population?: number;
  metroName?: string;
  region?: string;
}

// 50 US states
export const STATES: Location[] = [
  ["alabama", "Alabama", "AL"],
  ["alaska", "Alaska", "AK"],
  ["arizona", "Arizona", "AZ"],
  ["arkansas", "Arkansas", "AR"],
  ["california", "California", "CA"],
  ["colorado", "Colorado", "CO"],
  ["connecticut", "Connecticut", "CT"],
  ["delaware", "Delaware", "DE"],
  ["florida", "Florida", "FL"],
  ["georgia", "Georgia", "GA"],
  ["hawaii", "Hawaii", "HI"],
  ["idaho", "Idaho", "ID"],
  ["illinois", "Illinois", "IL"],
  ["indiana", "Indiana", "IN"],
  ["iowa", "Iowa", "IA"],
  ["kansas", "Kansas", "KS"],
  ["kentucky", "Kentucky", "KY"],
  ["louisiana", "Louisiana", "LA"],
  ["maine", "Maine", "ME"],
  ["maryland", "Maryland", "MD"],
  ["massachusetts", "Massachusetts", "MA"],
  ["michigan", "Michigan", "MI"],
  ["minnesota", "Minnesota", "MN"],
  ["mississippi", "Mississippi", "MS"],
  ["missouri", "Missouri", "MO"],
  ["montana", "Montana", "MT"],
  ["nebraska", "Nebraska", "NE"],
  ["nevada", "Nevada", "NV"],
  ["new-hampshire", "New Hampshire", "NH"],
  ["new-jersey", "New Jersey", "NJ"],
  ["new-mexico", "New Mexico", "NM"],
  ["new-york", "New York", "NY"],
  ["north-carolina", "North Carolina", "NC"],
  ["north-dakota", "North Dakota", "ND"],
  ["ohio", "Ohio", "OH"],
  ["oklahoma", "Oklahoma", "OK"],
  ["oregon", "Oregon", "OR"],
  ["pennsylvania", "Pennsylvania", "PA"],
  ["rhode-island", "Rhode Island", "RI"],
  ["south-carolina", "South Carolina", "SC"],
  ["south-dakota", "South Dakota", "SD"],
  ["tennessee", "Tennessee", "TN"],
  ["texas", "Texas", "TX"],
  ["utah", "Utah", "UT"],
  ["vermont", "Vermont", "VT"],
  ["virginia", "Virginia", "VA"],
  ["washington-state", "Washington", "WA"],
  ["west-virginia", "West Virginia", "WV"],
  ["wisconsin", "Wisconsin", "WI"],
  ["wyoming", "Wyoming", "WY"],
].map(([slug, name, code]) => ({
  slug,
  name,
  kind: "state" as const,
  state: code,
  stateName: name,
}));

// Top 60 US cities by population — SEO gold for moving searches
export const CITIES: Location[] = [
  ["new-york", "New York", "NY", "New York", 8336817],
  ["los-angeles", "Los Angeles", "CA", "California", 3979576],
  ["chicago", "Chicago", "IL", "Illinois", 2693976],
  ["houston", "Houston", "TX", "Texas", 2320268],
  ["phoenix", "Phoenix", "AZ", "Arizona", 1680992],
  ["philadelphia", "Philadelphia", "PA", "Pennsylvania", 1584064],
  ["san-antonio", "San Antonio", "TX", "Texas", 1547253],
  ["san-diego", "San Diego", "CA", "California", 1423851],
  ["dallas", "Dallas", "TX", "Texas", 1343573],
  ["san-jose", "San Jose", "CA", "California", 1021795],
  ["austin", "Austin", "TX", "Texas", 978908],
  ["jacksonville", "Jacksonville", "FL", "Florida", 911507],
  ["fort-worth", "Fort Worth", "TX", "Texas", 909585],
  ["columbus", "Columbus", "OH", "Ohio", 898553],
  ["charlotte", "Charlotte", "NC", "North Carolina", 885708],
  ["san-francisco", "San Francisco", "CA", "California", 881549],
  ["indianapolis", "Indianapolis", "IN", "Indiana", 876384],
  ["seattle", "Seattle", "WA", "Washington", 753675],
  ["denver", "Denver", "CO", "Colorado", 727211],
  ["washington", "Washington", "DC", "District of Columbia", 705749],
  ["boston", "Boston", "MA", "Massachusetts", 692600],
  ["el-paso", "El Paso", "TX", "Texas", 681728],
  ["nashville", "Nashville", "TN", "Tennessee", 670820],
  ["detroit", "Detroit", "MI", "Michigan", 670031],
  ["oklahoma-city", "Oklahoma City", "OK", "Oklahoma", 655057],
  ["portland", "Portland", "OR", "Oregon", 654741],
  ["las-vegas", "Las Vegas", "NV", "Nevada", 651319],
  ["memphis", "Memphis", "TN", "Tennessee", 651073],
  ["louisville", "Louisville", "KY", "Kentucky", 617638],
  ["baltimore", "Baltimore", "MD", "Maryland", 593490],
  ["milwaukee", "Milwaukee", "WI", "Wisconsin", 590157],
  ["albuquerque", "Albuquerque", "NM", "New Mexico", 560513],
  ["tucson", "Tucson", "AZ", "Arizona", 548073],
  ["fresno", "Fresno", "CA", "California", 531576],
  ["sacramento", "Sacramento", "CA", "California", 513624],
  ["kansas-city", "Kansas City", "MO", "Missouri", 495327],
  ["mesa", "Mesa", "AZ", "Arizona", 518012],
  ["atlanta", "Atlanta", "GA", "Georgia", 506811],
  ["omaha", "Omaha", "NE", "Nebraska", 478192],
  ["colorado-springs", "Colorado Springs", "CO", "Colorado", 478221],
  ["raleigh", "Raleigh", "NC", "North Carolina", 474069],
  ["miami", "Miami", "FL", "Florida", 467963],
  ["long-beach", "Long Beach", "CA", "California", 462628],
  ["virginia-beach", "Virginia Beach", "VA", "Virginia", 449974],
  ["oakland", "Oakland", "CA", "California", 433031],
  ["minneapolis", "Minneapolis", "MN", "Minnesota", 429606],
  ["tulsa", "Tulsa", "OK", "Oklahoma", 401190],
  ["tampa", "Tampa", "FL", "Florida", 399700],
  ["arlington", "Arlington", "TX", "Texas", 398854],
  ["new-orleans", "New Orleans", "LA", "Louisiana", 390144],
  ["wichita", "Wichita", "KS", "Kansas", 389938],
  ["cleveland", "Cleveland", "OH", "Ohio", 381009],
  ["bakersfield", "Bakersfield", "CA", "California", 384145],
  ["aurora", "Aurora", "CO", "Colorado", 379434],
  ["anaheim", "Anaheim", "CA", "California", 350365],
  ["honolulu", "Honolulu", "HI", "Hawaii", 345064],
  ["santa-ana", "Santa Ana", "CA", "California", 332318],
  ["riverside", "Riverside", "CA", "California", 328101],
  ["corpus-christi", "Corpus Christi", "TX", "Texas", 326586],
  ["lexington", "Lexington", "KY", "Kentucky", 323152],
].map(([slug, name, state, stateName, pop]) => ({
  slug: slug as string,
  name: name as string,
  kind: "city" as const,
  state: state as string,
  stateName: stateName as string,
  population: pop as number,
}));

export const ALL_LOCATIONS: Location[] = [...STATES, ...CITIES];

const BY_SLUG: Record<string, Location> = Object.fromEntries(ALL_LOCATIONS.map((l) => [l.slug, l]));

export function findLocation(slug: string): Location | undefined {
  return BY_SLUG[slug.toLowerCase()];
}

export function citiesInState(stateCode: string): Location[] {
  return CITIES.filter((c) => c.state === stateCode);
}
