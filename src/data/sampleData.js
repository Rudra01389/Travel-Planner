export const CATEGORIES = ["Stay", "Food", "Transport", "Experiences", "Miscellaneous"];

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
  { id: "e1", date: "2026-06-12", description: "Casa Buonocore, 3 nights", category: "Stay", amount: 82000 },
  { id: "e2", date: "2026-06-13", description: "Lunch, Path of the Gods", category: "Food", amount: 4200 },
  { id: "e3", date: "2026-06-13", description: "Bus to trailhead", category: "Transport", amount: 1200 },
  { id: "e4", date: "2026-06-14", description: "Boat to Capri", category: "Experiences", amount: 12200 },
  { id: "e5", date: "2026-06-14", description: "Dinner, Da Vincenzo", category: "Food", amount: 7600 },
];

const amalfiDocuments = [
  { id: "doc1", name: "Flight ticket", status: "Uploaded 2 weeks ago", url: null },
  { id: "doc2", name: "Hotel confirmation", status: "Uploaded 2 weeks ago", url: null },
  { id: "doc3", name: "Travel insurance", status: "Uploaded 5 days ago", url: null },
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
    localInfo: "Ferries between towns are faster than the coastal road — book the first crossing early in high season.",
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
    accommodationNote: "A quiet ryokan near Higashiyama, tatami rooms and an onsen bath.",
    foodNote: "Mostly set lunches and izakaya dinners, ₹2,000–3,500 per meal.",
    packingNote: "Layered jackets, comfortable walking shoes, a compact umbrella.",
    bestTime: "Early-to-mid October, ahead of peak autumn foliage crowds.",
    weather: "Cool mornings around 15°C, mild afternoons near 22°C.",
    localInfo: "Get an ICOCA card on arrival — it covers trains, buses, and most vending machines.",
    days: [
      {
        id: "k1",
        label: "Day 01 · Arrive",
        title: "Higashiyama at dusk",
        detail: "Stay · Ryokan Sora | Meals ₹2,600",
        accommodation: "Ryokan Sora, tatami room",
        activities: "Check in, evening walk through Higashiyama's lantern-lit lanes",
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
      { id: "ke1", date: "2026-10-03", description: "Ryokan Sora, 2 nights", category: "Stay", amount: 24000 },
      { id: "ke2", date: "2026-10-04", description: "Izakaya dinner", category: "Food", amount: 2600 },
    ],
    documents: [{ id: "kdoc1", name: "Flight ticket", status: "Uploaded 3 days ago", url: null }],
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
    accommodationNote: "A riad inside the medina walls, rooftop breakfast included.",
    foodNote: "Tagines and mint tea in the souks, ₹1,500–3,000 per meal.",
    packingNote: "Modest, breathable layers, a scarf for the medina, comfortable flat shoes.",
    bestTime: "March–May or September–November, avoiding peak summer heat.",
    weather: "Hot, dry days; desert-cool evenings.",
    localInfo: "Agree on taxi fares before you get in — meters are rarely used.",
    days: [],
    expenses: [],
    documents: [],
  },
];

export function generateItinerary({ destination, startDate, endDate, travellers, budget, preferences }) {
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 5 * 86400000);
  const nights = Math.max(1, Math.round((end - start) / 86400000));
  const totalBudget = Number(budget) || 200000;

  const stayCost = Math.round(totalBudget * 0.38);
  const foodCost = Math.round(totalBudget * 0.22);
  const transportCost = Math.round(totalBudget * 0.14);
  const experiencesCost = Math.round(totalBudget * 0.18);
  const flexFund = totalBudget - stayCost - foodCost - transportCost - experiencesCost;

  const dayThemes = [
    { label: "Arrive", title: `Settle into ${destination.split(",")[0]}`, activities: "Check in, orientation walk, early dinner nearby" },
    { label: "Explore", title: "Old town & local markets", activities: "Wander the historic core, browse local markets, people-watch at a café" },
    { label: "Slow", title: "A slower day", activities: "Late breakfast, short walk, rest in the afternoon" },
    { label: "Adventure", title: "Signature day trip", activities: "Half-day excursion outside the city, packed lunch" },
    { label: "Local", title: "Eat like a local", activities: "Food tour or cooking class, evening stroll" },
    { label: "Depart", title: "Last views & departure", activities: "Final walk, souvenir shopping, transfer to airport" },
  ];

  const perDayBudget = Math.round((foodCost + transportCost + experiencesCost) / nights);

  const days = Array.from({ length: nights }).map((_, i) => {
    const theme = dayThemes[Math.min(i, dayThemes.length - 1)];
    return {
      id: `gd${i + 1}`,
      label: `Day ${String(i + 1).padStart(2, "0")} · ${theme.label}`,
      title: theme.title,
      detail: `Meals ₹${Math.round(perDayBudget * 0.4).toLocaleString("en-IN")} | Transport ₹${Math.round(
        perDayBudget * 0.2
      ).toLocaleString("en-IN")}`,
      accommodation: `Stay near ${destination.split(",")[0]} city centre`,
      activities: theme.activities,
      meals: `Local meals budgeted around ₹${Math.round(perDayBudget * 0.4).toLocaleString("en-IN")}`,
      transport: `Local transport, ₹${Math.round(perDayBudget * 0.2).toLocaleString("en-IN")}`,
      cost: perDayBudget,
    };
  });

  const prefText =
    preferences && preferences.length ? preferences[0].toLowerCase() : "a balanced pace";

  return {
    id: destination.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + nextId("trip"),
    destination,
    tagline: `${nights} day${nights > 1 ? "s" : ""}, ${prefText}`,
    startDate: startDate || "",
    endDate: endDate || "",
    travellers: Number(travellers) || 1,
    budget: totalBudget,
    status: "planned",
    heroBudgetLabel: `₹ ${(totalBudget / 100000).toFixed(2)} L all considered`,
    stayCost,
    foodCost,
    transportCost,
    experiencesCost,
    flexFund,
    accommodationNote: `A well-located stay in ${destination}, chosen for comfort over spectacle. Roughly ₹${Math.round(
      stayCost / nights
    ).toLocaleString("en-IN")} per night.`,
    foodNote: `Budgeted for local food over tourist spots, around ₹${Math.round(
      foodCost / nights
    ).toLocaleString("en-IN")} a day across meals.`,
    packingNote: "Weather-appropriate layers, comfortable walking shoes, and a day bag for excursions.",
    bestTime: "Shoulder season travel tends to offer the best balance of weather and crowds.",
    weather: "Check a 10-day forecast closer to departure and pack layers accordingly.",
    localInfo: "Keep a digital and printed copy of every booking, and notify your bank of travel dates.",
    days,
    expenses: [],
    documents: [],
  };
}
