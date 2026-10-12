export const CATEGORIES = [
  "Stay",
  "Food",
  "Transport",
  "Experiences",
  "Miscellaneous",
];

export const CATEGORY_COLORS = {
  Stay: "#263548",
  Food: "#c1663f",
  Transport: "#a9b8a1",
  Experiences: "#7e93ab",
  Miscellaneous: "#e8e0cd",
};

let idCounter = 100;
export function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

const amalfiDays = [
  {
    id: "d1",
    label: "Day 01 · Arrive",
    title: "Positano & sunset swim",
    detail: "Stay · Casa Buonocore | Meals ₹4,800",
    accommodation: "Casa Buonocore, sea-view room",
    activities: "Settle in, evening swim, sunset walk along the marina",
    meals: "Breakfast at the hotel, seafood dinner in Positano",
    transport: "Private transfer from Naples airport, ₹6,500",
    cost: 21300,
  },
  {
    id: "d2",
    label: "Day 02 · Coast",
    title: "Path of the Gods",
    detail: "Hike · 4 hrs | Lunch ₹4000 | Bus ₹850",
    accommodation: "Casa Buonocore, sea-view room",
    activities: "Path of the Gods hike (4 hrs), viewpoint stops at Nocelle",
    meals: "Trail lunch, ₹4,000",
    transport: "Local bus to trailhead, ₹850",
    cost: 12650,
  },
  {
    id: "d3",
    label: "Day 03 · Water",
    title: "Capri by small boat",
    detail: "Boat ₹12,000 | Dinner ₹7,600 | Gelato ₹800",
    accommodation: "Casa Buonocore, sea-view room",
    activities: "Small-boat day trip to Capri, Blue Grotto stop",
    meals: "Dinner at Da Vincenzo, gelato after",
    transport: "Boat charter, ₹12,000",
    cost: 20400,
  },
  {
    id: "d4",
    label: "Day 04 · Slow",
    title: "Ravello gardens",
    detail: "Villa Cimbrone | Lunch ₹3,200 | Bus ₹700",
    accommodation: "Casa Buonocore, sea-view room",
    activities: "Villa Cimbrone gardens, Infinity Terrace, quiet afternoon",
    meals: "Light lunch overlooking the coast, ₹3,200",
    transport: "SITA bus up to Ravello, ₹700",
    cost: 3900,
  },
  {
    id: "d5",
    label: "Day 05 · Local",
    title: "Amalfi town & lemon groves",
    detail: "Limoncello tasting | Lunch ₹3,600",
    accommodation: "Casa Buonocore, sea-view room",
    activities: "Amalfi Cathedral, lemon grove walk, limoncello tasting",
    meals: "Lunch by the Duomo, ₹3,600",
    transport: "On foot",
    cost: 3600,
  },
  {
    id: "d6",
    label: "Day 06 · Depart",
    title: "Last swim & departure",
    detail: "Transfer ₹6,500",
    accommodation: "Check out, luggage storage",
    activities: "Final swim, souvenir shopping in Positano",
    meals: "Breakfast, airport snacks",
    transport: "Private transfer to Naples airport, ₹6,500",
    cost: 6500,
  },
];

const amalfiExpenses = [
  {
    id: "e1",
    date: "2026-06-12",
    description: "Casa Buonocore, 3 nights",
    category: "Stay",
    amount: 82000,
  },
  {
    id: "e2",
    date: "2026-06-13",
    description: "Lunch, Path of the Gods",
    category: "Food",
    amount: 4200,
  },
  {
    id: "e3",
    date: "2026-06-13",
    description: "Bus to trailhead",
    category: "Transport",
    amount: 1200,
  },
  {
    id: "e4",
    date: "2026-06-14",
    description: "Boat to Capri",
    category: "Experiences",
    amount: 12200,
  },
  {
    id: "e5",
    date: "2026-06-14",
    description: "Dinner, Da Vincenzo",
    category: "Food",
    amount: 7600,
  },
];

const amalfiDocuments = [
  {
    id: "doc1",
    name: "Flight ticket",
    status: "Uploaded 2 weeks ago",
    url: null,
  },
  {
    id: "doc2",
    name: "Hotel confirmation",
    status: "Uploaded 2 weeks ago",
    url: null,
  },
  {
    id: "doc3",
    name: "Travel insurance",
    status: "Uploaded 5 days ago",
    url: null,
  },
];

export const initialTrips = [
  {
    id: "amalfi-coast",
    destination: "Amalfi Coast, Italy",
    tagline: "Six days, coast to coast",
    startDate: "2026-06-12",
    endDate: "2026-06-18",
    travellers: 2,
    budget: 340000,
    status: "upcoming",
    heroBudgetLabel: "₹ 2.26 L all considered",
    stayCost: 96000,
    foodCost: 51000,
    transportCost: 23000,
    experiencesCost: 35000,
    flexFund: 15200,
    accommodationNote:
      "Casa Buonocore, sea-view room, ₹ 32,000 per night. Quiet enough for slow mornings, close enough for the last ferry.",
    foodNote:
      "Breakfast ₹1,000, lunch ₹2,500, dinner ₹4,800. Plan for a long table at Da Vincenzo and a late lemon granita.",
    packingNote:
      "Linen layers, a light knit, swimwear, sun protection, and proper walking sandals for those magnificent stairs.",
    bestTime: "Late May to June, before the August crowds and heat arrive.",
    weather: "Warm, dry days around 26°C; sea breeze keeps evenings mild.",
    localInfo:
      "Ferries between towns are faster than the coastal road — book the first crossing early in high season.",
    days: amalfiDays,
    expenses: amalfiExpenses,
    documents: amalfiDocuments,
  },
  {
    id: "kyoto-japan",
    destination: "Kyoto, Japan",
    tagline: "A solo week in autumn light",
    startDate: "2026-10-03",
    endDate: "2026-10-10",
    travellers: 1,
    budget: 180000,
    status: "upcoming",
    heroBudgetLabel: "₹ 1.6 L all considered",
    stayCost: 60000,
    foodCost: 32000,
    transportCost: 18000,
    experiencesCost: 24000,
    flexFund: 12000,
    accommodationNote:
      "A quiet ryokan near Higashiyama, tatami rooms and an onsen bath.",
    foodNote: "Mostly set lunches and izakaya dinners, ₹2,000–3,500 per meal.",
    packingNote:
      "Layered jackets, comfortable walking shoes, a compact umbrella.",
    bestTime: "Early-to-mid October, ahead of peak autumn foliage crowds.",
    weather: "Cool mornings around 15°C, mild afternoons near 22°C.",
    localInfo:
      "Get an ICOCA card on arrival — it covers trains, buses, and most vending machines.",
    days: [
      {
        id: "k1",
        label: "Day 01 · Arrive",
        title: "Higashiyama at dusk",
        detail: "Stay · Ryokan Sora | Meals ₹2,600",
        accommodation: "Ryokan Sora, tatami room",
        activities:
          "Check in, evening walk through Higashiyama's lantern-lit lanes",
        meals: "Izakaya dinner, ₹2,600",
        transport: "Airport limousine bus, ₹3,000",
        cost: 5600,
      },
      {
        id: "k2",
        label: "Day 02 · Temples",
        title: "Fushimi Inari at sunrise",
        detail: "Hike · 3 hrs | Lunch ₹1,800",
        accommodation: "Ryokan Sora, tatami room",
        activities: "Early climb through the torii gates before the crowds",
        meals: "Street food lunch near the shrine, ₹1,800",
        transport: "Local train, ₹400",
        cost: 2200,
      },
    ],
    expenses: [
      {
        id: "ke1",
        date: "2026-10-03",
        description: "Ryokan Sora, 2 nights",
        category: "Stay",
        amount: 24000,
      },
      {
        id: "ke2",
        date: "2026-10-04",
        description: "Izakaya dinner",
        category: "Food",
        amount: 2600,
      },
    ],
    documents: [
      {
        id: "kdoc1",
        name: "Flight ticket",
        status: "Uploaded 3 days ago",
        url: null,
      },
    ],
  },
  {
    id: "marrakech-morocco",
    destination: "Marrakech, Morocco",
    tagline: "Not yet dated · with a friend",
    startDate: "",
    endDate: "",
    travellers: 2,
    budget: 150000,
    status: "planned",
    heroBudgetLabel: "₹ 1.3 L all considered",
    stayCost: 45000,
    foodCost: 26000,
    transportCost: 15000,
    experiencesCost: 30000,
    flexFund: 9000,
    accommodationNote:
      "A riad inside the medina walls, rooftop breakfast included.",
    foodNote: "Tagines and mint tea in the souks, ₹1,500–3,000 per meal.",
    packingNote:
      "Modest, breathable layers, a scarf for the medina, comfortable flat shoes.",
    bestTime: "March–May or September–November, avoiding peak summer heat.",
    weather: "Hot, dry days; desert-cool evenings.",
    localInfo:
      "Agree on taxi fares before you get in — meters are rarely used.",
    days: [],
    expenses: [],
    documents: [],
  },
];

export function generateItinerary({
  destination,
  startDate,
  endDate,
  travellers,
  budget,
  preferences,
  currency = "INR",
}) {
  const dayCount =
    Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1;
  const total = Number(budget),
    scale = currency === "JPY" ? 1 : 100,
    allocation = (p) => Math.floor(total * p * scale) / scale,
    stayCost = allocation(0.38),
    foodCost = allocation(0.22),
    transportCost = allocation(0.14),
    experiencesCost = allocation(0.18);
  const days = Array.from({ length: dayCount }, (_, i) => ({
    id: `day-${i + 1}`,
    label: `Day ${i + 1}`,
    title:
      i === 0
        ? "Arrival and orientation"
        : i === dayCount - 1
          ? "Last sights and departure"
          : "Explore at your own pace",
    activities: [
      {
        id: `activity-${i + 1}`,
        title:
          i === 0 ? `Settle into ${destination}` : "Choose a local experience",
        notes: "Use nearby recommendations to add real places to your day.",
      },
    ],
  }));
  return {
    destination,
    startDate,
    endDate,
    travellers: Number(travellers),
    budget: total,
    currency,
    status: "planned",
    tagline: `${dayCount} days to explore`,
    stayCost,
    foodCost,
    transportCost,
    experiencesCost,
    flexFund:
      Math.round(
        (total - stayCost - foodCost - transportCost - experiencesCost) * 100,
      ) / 100,
    accommodationNote: "Choose a stay near the places you plan to visit.",
    foodNote: "Leave room for local food and unplanned stops.",
    packingNote:
      "Weather-appropriate layers, comfortable shoes, and essential documents.",
    bestTime: "Check local seasonal conditions before booking.",
    weather: "Check a forecast closer to departure.",
    localInfo: "Keep copies of bookings and confirm opening hours.",
    preferences,
    days,
    expenses: [],
    documents: [],
  };
}
