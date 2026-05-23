type AsyncSample = () => Promise<void>;

type TimingRatioOptions = {
  samples?: number;
  beforeSample?: () => Promise<void>;
};

async function measureMs(sample: AsyncSample, beforeSample?: () => Promise<void>): Promise<number> {
  await beforeSample?.();
  const start = performance.now();
  await sample();
  return performance.now() - start;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export async function medianTimingRatio(
  left: AsyncSample,
  right: AsyncSample,
  options: TimingRatioOptions = {},
): Promise<number> {
  const samples = options.samples ?? 5;
  const leftDurations: number[] = [];
  const rightDurations: number[] = [];

  for (let i = 0; i < samples; i += 1) {
    const leftFirst = i % 2 === 0;
    if (leftFirst) {
      leftDurations.push(await measureMs(left, options.beforeSample));
      rightDurations.push(await measureMs(right, options.beforeSample));
    } else {
      rightDurations.push(await measureMs(right, options.beforeSample));
      leftDurations.push(await measureMs(left, options.beforeSample));
    }
  }

  const leftMedian = median(leftDurations);
  const rightMedian = median(rightDurations);
  return Math.max(leftMedian, rightMedian) / Math.min(leftMedian, rightMedian);
}
