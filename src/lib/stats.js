export function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function pearsonR(points) {
  if (points.length < 2) return 0;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const meanX = mean(xs);
  const meanY = mean(ys);

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (const point of points) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  if (denomX === 0 || denomY === 0) return 0;
  return numerator / Math.sqrt(denomX * denomY);
}

export function leastSquares(points) {
  if (points.length < 2) {
    return { slope: 0, intercept: mean(points.map((point) => point.y)) || 0 };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const meanX = mean(xs);
  const meanY = mean(ys);

  let sxx = 0;
  let sxy = 0;
  for (const point of points) {
    sxx += (point.x - meanX) ** 2;
    sxy += (point.x - meanX) * (point.y - meanY);
  }

  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

export const SCATTER_PRESETS = {
  "tight-negative": [
    { x: 1, y: 9 }, { x: 2, y: 8.2 }, { x: 3, y: 7.1 }, { x: 4, y: 6.3 },
    { x: 5, y: 5.2 }, { x: 6, y: 4.1 }, { x: 7, y: 3.2 }, { x: 8, y: 2.1 },
  ],
  "loose-negative": [
    { x: 1, y: 8 }, { x: 2, y: 6.5 }, { x: 3, y: 7.2 }, { x: 4, y: 5.8 },
    { x: 5, y: 6.5 }, { x: 6, y: 4.2 }, { x: 7, y: 5.1 }, { x: 8, y: 3.5 },
  ],
  none: [
    { x: 2, y: 5.5 }, { x: 3, y: 3.2 }, { x: 4, y: 6.1 }, { x: 5, y: 4.4 },
    { x: 6, y: 5.8 }, { x: 7, y: 3.9 }, { x: 8, y: 6.2 }, { x: 9, y: 4.7 },
  ],
  "tight-positive": [
    { x: 1, y: 2 }, { x: 2, y: 2.8 }, { x: 3, y: 3.9 }, { x: 4, y: 4.8 },
    { x: 5, y: 5.7 }, { x: 6, y: 6.6 }, { x: 7, y: 7.5 }, { x: 8, y: 8.4 },
  ],
  sandbox: [
    { x: 2, y: 3 }, { x: 3, y: 4.5 }, { x: 4, y: 4.8 }, { x: 5, y: 6.2 },
    { x: 6, y: 6.5 }, { x: 7, y: 7.8 }, { x: 8, y: 8.2 },
  ],
  tutoring: [
    { x: 10, y: 70 }, { x: 12, y: 72 }, { x: 14, y: 78 }, { x: 16, y: 80 },
    { x: 18, y: 85 }, { x: 20, y: 88 },
  ],
  repair: [
    { x: 1, y: 248 }, { x: 2, y: 288 }, { x: 3, y: 338 }, { x: 4, y: 378 },
    { x: 5, y: 428 }, { x: 6, y: 468 }, { x: 8, y: 560 }, { x: 10, y: 648 },
    { x: 12, y: 742 },
  ],
};

export function getPresetPoints(preset) {
  return (SCATTER_PRESETS[preset] || SCATTER_PRESETS.sandbox).map((point) => ({ ...point }));
}

export function formatR(value) {
  return value.toFixed(2);
}
