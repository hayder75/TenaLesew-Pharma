// Static seasonal medicine recommendations (placeholder - real learning logic comes later)

export interface SeasonalMedicine {
  name: string;
  category: string;
  suggestedStock: number;
  reason: string;
}

export interface SeasonalInfo {
  month: number;
  title: string;
  note: string;
  medicines: SeasonalMedicine[];
}

export const seasonalMedicines: SeasonalInfo[] = [
  {
    month: 1,
    title: "Dry Cold Season (January)",
    note: "Cold dry weather brings more coughs, sore throats and vitamin deficiencies.",
    medicines: [
      { name: "Cough Syrup", category: "Cough & Cold", suggestedStock: 120, reason: "Cold season spikes cough treatments" },
      { name: "Vitamin C 1000mg", category: "Vitamins", suggestedStock: 200, reason: "Customers stock up for immunity" },
      { name: "Paracetamol 500mg", category: "Pain Relief", suggestedStock: 400, reason: "Fever & headache cases rise" },
    ],
  },
  {
    month: 2,
    title: "Late Dry Cold Season (February)",
    note: "Continuing cold weather plus the start of grass pollen season.",
    medicines: [
      { name: "Cetirizine 10mg", category: "Allergy", suggestedStock: 120, reason: "Pollen allergy season begins" },
      { name: "Cough Syrup", category: "Cough & Cold", suggestedStock: 100, reason: "Coughs still common" },
      { name: "Vitamin C 1000mg", category: "Vitamins", suggestedStock: 200, reason: "Immunity supplements selling well" },
    ],
  },
  {
    month: 3,
    title: "Spring Season (March)",
    note: "Warming up - allergies peak as plants flower.",
    medicines: [
      { name: "Cetirizine 10mg", category: "Allergy", suggestedStock: 150, reason: "Hay fever peak" },
      { name: "Cough Syrup", category: "Cough & Cold", suggestedStock: 100, reason: "Spring colds common" },
      { name: "Neurobion", category: "Vitamins", suggestedStock: 80, reason: "B-vitamin sales increase" },
    ],
  },
  {
    month: 4,
    title: "Spring Season (April)",
    note: "Allergies continue, waterborne bugs start appearing in warmer wet weather.",
    medicines: [
      { name: "Cetirizine 10mg", category: "Allergy", suggestedStock: 150, reason: "Pollen season" },
      { name: "ORS Packet", category: "Digestive", suggestedStock: 300, reason: "Diarrhoea cases rise" },
      { name: "Paracetamol 500mg", category: "Pain Relief", suggestedStock: 300, reason: "General fever/flu support" },
    ],
  },
  {
    month: 5,
    title: "Warm Season (May)",
    note: "Hotter days - more dehydration, sun exposure and start of malaria season in lowlands.",
    medicines: [
      { name: "ORS Packet", category: "Digestive", suggestedStock: 300, reason: "Dehydration from heat" },
      { name: "Paracetamol 500mg", category: "Pain Relief", suggestedStock: 300, reason: "Heat headaches & fevers" },
      { name: "Artemether/Lumefantrine 80/480mg", category: "Antimalarial", suggestedStock: 100, reason: "Malaria season begins" },
    ],
  },
  {
    month: 6,
    title: "Rainy Season Begins (June)",
    note: "Kiremt rains arrive - malaria, flu and fever cases climb sharply.",
    medicines: [
      { name: "Artemether/Lumefantrine 80/480mg", category: "Antimalarial", suggestedStock: 200, reason: "Malaria risk peaks after rains" },
      { name: "Paracetamol 500mg", category: "Pain Relief", suggestedStock: 400, reason: "Malaria/fever symptoms" },
      { name: "ORS Packet", category: "Digestive", suggestedStock: 300, reason: "Waterborne illness season" },
    ],
  },
  {
    month: 7,
    title: "Peak Rainy Season (July)",
    note: "Heavy Kiremt rains - highest malaria and waterborne disease risk of the year.",
    medicines: [
      { name: "Artemether/Lumefantrine 80/480mg", category: "Antimalarial", suggestedStock: 250, reason: "Malaria case peak" },
      { name: "ORS Packet", category: "Digestive", suggestedStock: 400, reason: "Diarrhoea & dehydration peak" },
      { name: "Amoxicillin 500mg", category: "Antibiotics", suggestedStock: 150, reason: "Secondary infections common" },
    ],
  },
  {
    month: 8,
    title: "Rainy Season (August)",
    note: "Still raining - malaria, colds and fever remain high. Stock up on the essentials.",
    medicines: [
      { name: "Artemether/Lumefantrine 80/480mg", category: "Antimalarial", suggestedStock: 250, reason: "Malaria transmission high" },
      { name: "ORS Packet", category: "Digestive", suggestedStock: 400, reason: "Waterborne illness still common" },
      { name: "Cough Syrup", category: "Cough & Cold", suggestedStock: 150, reason: "Rainy season colds" },
      { name: "Paracetamol 500mg", category: "Pain Relief", suggestedStock: 400, reason: "Fever support" },
      { name: "Vitamin C 1000mg", category: "Vitamins", suggestedStock: 200, reason: "Immunity during rains" },
    ],
  },
  {
    month: 9,
    title: "End of Rainy Season (September)",
    note: "Rains ease but malaria and colds linger; back-to-school drives infections.",
    medicines: [
      { name: "Artemether/Lumefantrine 80/480mg", category: "Antimalarial", suggestedStock: 200, reason: "Malaria still circulating" },
      { name: "Cough Syrup", category: "Cough & Cold", suggestedStock: 150, reason: "School-driven colds" },
      { name: "Paracetamol 500mg", category: "Pain Relief", suggestedStock: 350, reason: "Fever & headache support" },
    ],
  },
  {
    month: 10,
    title: "Cold Season Begins (October)",
    note: "Cooler evenings return - cold and flu season begins.",
    medicines: [
      { name: "Cough Syrup", category: "Cough & Cold", suggestedStock: 150, reason: "Cold & flu season starts" },
      { name: "Paracetamol 500mg", category: "Pain Relief", suggestedStock: 350, reason: "Fever & cold support" },
      { name: "Amoxicillin 500mg", category: "Antibiotics", suggestedStock: 150, reason: "Respiratory infections rise" },
    ],
  },
  {
    month: 11,
    title: "Cold Season (November)",
    note: "Colder nights - flu, respiratory infections and vitamins are in high demand.",
    medicines: [
      { name: "Cough Syrup", category: "Cough & Cold", suggestedStock: 180, reason: "Flu & cold peak" },
      { name: "Vitamin C 1000mg", category: "Vitamins", suggestedStock: 250, reason: "Immunity push" },
      { name: "Amoxicillin 500mg", category: "Antibiotics", suggestedStock: 150, reason: "Respiratory infections" },
    ],
  },
  {
    month: 12,
    title: "Cold & Holiday Season (December)",
    note: "Winter colds peak and festive travel spreads infections.",
    medicines: [
      { name: "Cough Syrup", category: "Cough & Cold", suggestedStock: 200, reason: "Cold & flu peak" },
      { name: "Vitamin C 1000mg", category: "Vitamins", suggestedStock: 250, reason: "Holiday immunity sales" },
      { name: "Paracetamol 500mg", category: "Pain Relief", suggestedStock: 400, reason: "Flu/fever support" },
    ],
  },
];

export const getSeasonalMedicines = (): SeasonalInfo => {
  const month = new Date().getMonth() + 1;
  const fallback: SeasonalInfo = {
    month,
    title: "This Month",
    note: "Seasonal recommendations based on typical demand for this time of year.",
    medicines: [
      { name: "Paracetamol 500mg", category: "Pain Relief", suggestedStock: 300, reason: "Always in demand" },
      { name: "ORS Packet", category: "Digestive", suggestedStock: 300, reason: "General stocking advice" },
    ],
  };
  return seasonalMedicines.find(s => s.month === month) || fallback;
};