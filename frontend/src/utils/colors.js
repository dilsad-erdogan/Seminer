/**
 * Generates a distinct, vibrant HSL color for any district ID
 * using Golden Ratio hue distribution for maximum contrast.
 */
export const getDistrictColor = (ilceId) => {
  if (!ilceId) return '#3b82f6';
  const numericId = parseInt(ilceId, 10) || 0;
  const hue = Math.round((numericId * 137.508) % 360);
  return `hsl(${hue}, 85%, 60%)`;
};

/**
 * Computes the 2D Convex Hull for an array of [lat, lng] points
 * using Andrew's Monotone Chain Algorithm.
 */
export const getConvexHull = (points) => {
  if (points.length <= 2) return points;

  // Remove duplicates
  const uniquePointsMap = new Map();
  points.forEach(p => uniquePointsMap.set(`${p[0]},${p[1]}`, p));
  const uniquePoints = Array.from(uniquePointsMap.values());

  if (uniquePoints.length <= 2) return uniquePoints;

  // Sort points by lat, then lng
  const sorted = uniquePoints.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const crossProduct = (o, a, b) => {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  };

  // Lower hull
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  // Upper hull
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  // Remove last point of each half because it's repeated at beginning of other half
  lower.pop();
  upper.pop();

  return lower.concat(upper);
};
