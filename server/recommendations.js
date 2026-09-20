// Local recommendation lookup — maps a diagnosed disease/pest name to treatment guidance.
//
// Two layers:
//   1. Exact matches — curated entries for diseases/pests most relevant to crops
//      grown in Botswana (maize, sorghum, tomatoes, beans, groundnuts, cabbage).
//   2. Category fallback — if the exact name isn't in the table, we match on
//      keywords in the name (e.g. "Bacterial Rust" -> "rust") and return general
//      guidance for that category instead of giving up entirely.
//
// This is still a curated starter set, not an exhaustive disease database — see
// the grant narrative for the plan to expand it via an open plant-disease dataset
// and agronomist-contributed entries.

const recommendations = {
  'Early Blight': 'Remove and destroy affected leaves. Apply a copper-based fungicide and avoid overhead watering to reduce leaf wetness.',
  'Late Blight': 'Remove infected plants promptly to prevent spread. Apply a fungicide labeled for late blight and improve airflow around plants.',
  'Powdery Mildew': 'Apply a sulfur-based or potassium bicarbonate fungicide. Prune to improve air circulation and avoid overhead watering.',
  'Downy Mildew': 'Improve airflow and avoid wetting leaves when watering. Apply a copper-based or targeted downy mildew fungicide.',
  'Aphids': 'Introduce natural predators such as ladybirds, or apply insecticidal soap/neem oil directly to affected areas.',
  'Spider Mites': 'Increase humidity around plants, rinse foliage with water, and apply miticide or neem oil if infestation is heavy.',
  'Whiteflies': 'Use yellow sticky traps to monitor, apply insecticidal soap or neem oil, and remove heavily infested leaves.',
  'Thrips': 'Apply insecticidal soap or spinosad-based treatment. Remove weeds nearby that can host thrips between crops.',
  'Leaf Spot': 'Remove affected leaves, avoid overhead watering, and apply a fungicide appropriate for the specific pathogen if it persists.',
  'Bacterial Wilt': 'Remove and destroy infected plants immediately — there is no cure once infected. Rotate crops and control cucumber beetles, which spread it.',
  'Fusarium Wilt': 'Remove infected plants and avoid replanting the same crop family in that soil for several seasons. Ensure good drainage.',
  'Rust': 'Remove and destroy infected leaves. Apply a fungicide labeled for rust and avoid overhead watering.',
  'Anthracnose': 'Remove infected plant debris, apply a copper-based fungicide, and avoid working in the field when plants are wet.',
  'Mosaic Virus': 'There is no cure — remove and destroy infected plants to stop spread. Control aphids, which spread the virus, and disinfect tools between plants.',
  'Root Rot': 'Improve drainage and reduce watering frequency. Remove severely affected plants; there is no treatment once roots are badly rotted.',
  'Charcoal Rot': 'Avoid drought stress with consistent watering, rotate crops away from susceptible species, and remove infected plant debris after harvest.',
  'Smut': 'Remove and destroy infected plant parts before spores spread. Use resistant varieties and rotate crops in future seasons.',
  'Maize Streak Virus': 'Remove and destroy infected plants early. Control leafhoppers, which spread the virus, and consider resistant maize varieties next season.',
  'Gray Leaf Spot': 'Rotate crops away from maize for a season, remove crop debris after harvest, and apply a fungicide if the infection is severe.',
  'Fall Armyworm': 'Inspect plants regularly for egg masses and larvae. Handpick where possible; for heavier infestations, apply a recommended biological or chemical insecticide early, targeting young larvae.',
  'Groundnut Leaf Spot': 'Remove infected leaves, rotate crops away from groundnuts for a season, and apply a fungicide if spotting is widespread.',
  'Cutworms': 'Use collars around young seedlings to prevent stem cutting, and till soil before planting to expose larvae to predators.',
};

const DEFAULT_RECOMMENDATION =
  'No specific recommendation on file for this result — consult a local agronomist or extension officer for guidance.';

// Category fallback — keyword matched against the disease/pest name (case-insensitive).
// Order matters: first match wins, so more specific keywords should come first.
const categoryFallbacks = [
  {
    keywords: ['blight'],
    category: 'a blight-type disease',
    advice: 'Remove and destroy affected leaves promptly. Apply a broad-spectrum fungicide and avoid overhead watering to limit spread.',
  },
  {
    keywords: ['rust'],
    category: 'a rust disease',
    advice: 'Remove infected leaves where possible, apply a fungicide labeled for rust, and avoid wetting foliage when watering.',
  },
  {
    keywords: ['wilt'],
    category: 'a wilt disease',
    advice: 'Remove and destroy severely wilted plants to limit spread, since many wilts have no cure once established. Rotate crops in affected soil next season.',
  },
  {
    keywords: ['mildew'],
    category: 'a mildew',
    advice: 'Improve airflow around plants, avoid overhead watering, and apply a fungicide suited to mildew if it continues to spread.',
  },
  {
    keywords: ['mold', 'mould'],
    category: 'a mold issue',
    advice: 'Improve airflow and reduce humidity around plants where possible. Remove affected material and apply a fungicide if it spreads.',
  },
  {
    keywords: ['spot'],
    category: 'a leaf spot disease',
    advice: 'Remove affected leaves, avoid overhead watering, and apply a general fungicide if spotting continues to spread.',
  },
  {
    keywords: ['rot'],
    category: 'a rot disease',
    advice: 'Improve drainage, remove severely affected material, and avoid excess moisture around the base of the plant.',
  },
  {
    keywords: ['virus', 'mosaic', 'streak'],
    category: 'a viral infection',
    advice: 'There is usually no cure — remove and destroy infected plants to prevent spread, and control sap-feeding insects (aphids, leafhoppers), which often spread these viruses.',
  },
  {
    keywords: ['aphid', 'mite', 'worm', 'beetle', 'fly', 'thrip', 'weevil', 'borer', 'moth', 'caterpillar'],
    category: 'pest or insect damage',
    advice: 'Inspect plants regularly and handpick pests where feasible. Insecticidal soap or neem oil is a reasonable first treatment for most soft-bodied pests before escalating to a targeted insecticide.',
  },
];

export function getRecommendation(diseaseName) {
  if (!diseaseName) {
    return { text: DEFAULT_RECOMMENDATION, matchType: 'none' };
  }

  if (recommendations[diseaseName]) {
    return { text: recommendations[diseaseName], matchType: 'exact' };
  }

  const lowerName = diseaseName.toLowerCase();
  const fallback = categoryFallbacks.find((entry) =>
    entry.keywords.some((keyword) => lowerName.includes(keyword))
  );

  if (fallback) {
    return {
      text: `We don't have a specific match for "${diseaseName}" yet, but this looks like ${fallback.category}. General guidance: ${fallback.advice}`,
      matchType: 'category',
      category: fallback.category,
    };
  }

  return { text: DEFAULT_RECOMMENDATION, matchType: 'none' };
}