// Local recommendation lookup — maps a diagnosed disease/pest name to treatment guidance.
// This is intentionally simple for the demo. Expand this table as needed; in a full
// product this would likely move into the data store so it can be edited without a
// code deploy.

const recommendations = {
  'Early Blight': 'Remove and destroy affected leaves. Apply a copper-based fungicide and avoid overhead watering to reduce leaf wetness.',
  'Late Blight': 'Remove infected plants promptly to prevent spread. Apply a fungicide labeled for late blight and improve airflow around plants.',
  'Powdery Mildew': 'Apply a sulfur-based or potassium bicarbonate fungicide. Prune to improve air circulation and avoid overhead watering.',
  'Aphids': 'Introduce natural predators such as ladybirds, or apply insecticidal soap/neem oil directly to affected areas.',
  'Spider Mites': 'Increase humidity around plants, rinse foliage with water, and apply miticide or neem oil if infestation is heavy.',
  'Leaf Spot': 'Remove affected leaves, avoid overhead watering, and apply a fungicide appropriate for the specific pathogen if it persists.',
};

const DEFAULT_RECOMMENDATION =
  'No specific recommendation on file for this result — consult a local agronomist or extension officer for guidance.';

export function getRecommendation(diseaseName) {
  if (!diseaseName) return DEFAULT_RECOMMENDATION;
  return recommendations[diseaseName] || DEFAULT_RECOMMENDATION;
}
