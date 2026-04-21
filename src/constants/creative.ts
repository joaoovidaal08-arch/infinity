export const CREATIVE_MODES = [
  "minimal_twitter",
  "viral_bold",
  "hybrid",
] as const;

export const CREATIVE_RULES = {
  minimal_twitter: {
    maxHeadlineWords: 8,
    visualDensity: 20,
    graphicsIntensity: 10,
    emphasisSlides: [1],
  },
  viral_bold: {
    maxHeadlineWords: 10,
    visualDensity: 65,
    graphicsIntensity: 55,
    emphasisSlides: [1, 2],
  },
  hybrid: {
    maxHeadlineWords: 9,
    visualDensity: 40,
    graphicsIntensity: 30,
    emphasisSlides: [1, 2, -1],
  },
} as const;
