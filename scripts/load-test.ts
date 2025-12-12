/**
 * Load Testing Script for Dashboard API Performance
 *
 * This script tests API endpoint performance under various load conditions.
 * Run with: npx tsx scripts/load-test.ts
 *
 * Tests:
 * 1. Single request baseline timing
 * 2. Concurrent request handling
 * 3. Burst traffic simulation
 * 4. Sustained load testing
 *
 * Metrics collected:
 * - Response time (min, max, avg, p50, p95, p99)
 * - Throughput (requests/second)
 * - Error rate
 * - Time to first byte (TTFB)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// =============================================================================
// TYPES
// =============================================================================

interface LoadTestResult {
  endpoint: string;
  requests: number;
  successCount: number;
  errorCount: number;
  responseTimes: number[];
  ttfbTimes: number[];
  startTime: number;
  endTime: number;
}

interface TestSummary {
  endpoint: string;
  requests: number;
  successRate: string;
  errorRate: string;
  minMs: string;
  maxMs: string;
  avgMs: string;
  p50Ms: string;
  p95Ms: string;
  p99Ms: string;
  avgTtfbMs: string;
  throughput: string;
  durationMs: number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function formatMs(ms: number): string {
  return ms.toFixed(2);
}

// =============================================================================
// SINGLE REQUEST TEST
// =============================================================================

async function timedFetch(url: string): Promise<{ duration: number; ttfb: number; status: number; success: boolean }> {
  const startTime = performance.now();
  let ttfb = 0;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    });

    ttfb = performance.now() - startTime;
    await response.json(); // Consume the body
    const duration = performance.now() - startTime;

    return {
      duration,
      ttfb,
      status: response.status,
      success: response.ok,
    };
  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      duration,
      ttfb: ttfb || duration,
      status: 0,
      success: false,
    };
  }
}

// =============================================================================
// LOAD TEST RUNNER
// =============================================================================

async function runLoadTest(
  endpoint: string,
  options: {
    concurrency?: number;
    totalRequests?: number;
    delayBetweenBatches?: number;
  } = {}
): Promise<LoadTestResult> {
  const {
    concurrency = 10,
    totalRequests = 100,
    delayBetweenBatches = 0,
  } = options;

  const url = `${BASE_URL}${endpoint}`;
  const result: LoadTestResult = {
    endpoint,
    requests: totalRequests,
    successCount: 0,
    errorCount: 0,
    responseTimes: [],
    ttfbTimes: [],
    startTime: performance.now(),
    endTime: 0,
  };

  console.log(`\nTesting: ${endpoint}`);
  console.log(`  Concurrency: ${concurrency}, Total Requests: ${totalRequests}`);

  // Process requests in batches
  for (let i = 0; i < totalRequests; i += concurrency) {
    const batchSize = Math.min(concurrency, totalRequests - i);
    const batch = Array(batchSize).fill(null).map(() => timedFetch(url));

    const results = await Promise.all(batch);

    results.forEach((r) => {
      if (r.success) {
        result.successCount++;
      } else {
        result.errorCount++;
      }
      result.responseTimes.push(r.duration);
      result.ttfbTimes.push(r.ttfb);
    });

    // Progress indicator
    const progress = Math.min(i + batchSize, totalRequests);
    process.stdout.write(`\r  Progress: ${progress}/${totalRequests} (${((progress / totalRequests) * 100).toFixed(0)}%)`);

    // Optional delay between batches
    if (delayBetweenBatches > 0 && i + batchSize < totalRequests) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  result.endTime = performance.now();
  console.log(''); // New line after progress

  return result;
}

// =============================================================================
// RESULT SUMMARIZATION
// =============================================================================

function summarizeResult(result: LoadTestResult): TestSummary {
  const { responseTimes, ttfbTimes } = result;
  const duration = result.endTime - result.startTime;
  const throughput = (result.requests / (duration / 1000)).toFixed(2);

  return {
    endpoint: result.endpoint,
    requests: result.requests,
    successRate: ((result.successCount / result.requests) * 100).toFixed(2) + '%',
    errorRate: ((result.errorCount / result.requests) * 100).toFixed(2) + '%',
    minMs: formatMs(Math.min(...responseTimes)),
    maxMs: formatMs(Math.max(...responseTimes)),
    avgMs: formatMs(average(responseTimes)),
    p50Ms: formatMs(percentile(responseTimes, 50)),
    p95Ms: formatMs(percentile(responseTimes, 95)),
    p99Ms: formatMs(percentile(responseTimes, 99)),
    avgTtfbMs: formatMs(average(ttfbTimes)),
    throughput: `${throughput} req/s`,
    durationMs: Math.round(duration),
  };
}

// =============================================================================
// BENCHMARK TARGETS
// =============================================================================

function evaluateAgainstTargets(summary: TestSummary): void {
  const targets = {
    avgMs: 50,
    p95Ms: 100,
    p99Ms: 200,
    errorRate: 0,
  };

  console.log('\n  Benchmark Evaluation:');

  const avgMs = parseFloat(summary.avgMs);
  const p95Ms = parseFloat(summary.p95Ms);
  const p99Ms = parseFloat(summary.p99Ms);
  const errorRate = parseFloat(summary.errorRate);

  console.log(`    Avg Response Time: ${avgMs}ms ${avgMs <= targets.avgMs ? '✅' : '❌'} (target: <${targets.avgMs}ms)`);
  console.log(`    P95 Response Time: ${p95Ms}ms ${p95Ms <= targets.p95Ms ? '✅' : '⚠️'} (target: <${targets.p95Ms}ms)`);
  console.log(`    P99 Response Time: ${p99Ms}ms ${p99Ms <= targets.p99Ms ? '✅' : '⚠️'} (target: <${targets.p99Ms}ms)`);
  console.log(`    Error Rate: ${summary.errorRate} ${errorRate <= targets.errorRate ? '✅' : '❌'} (target: 0%)`);
}

// =============================================================================
// MAIN TEST SUITE
// =============================================================================

async function runTestSuite() {
  console.log('='.repeat(70));
  console.log('LOAD TESTING SUITE');
  console.log('='.repeat(70));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Started at: ${new Date().toISOString()}`);

  // Test user IDs (adjust based on your test data)
  const volunteerUserId = 1;
  const organizationUserId = 2;

  const endpoints = [
    `/api/dashboard/summary?userId=${volunteerUserId}`,
    `/api/dashboard/summary?userId=${organizationUserId}`,
    `/api/projects?organizationId=${organizationUserId}`,
    `/api/volunteer-activities?userId=${volunteerUserId}`,
    `/api/metrics`, // Performance metrics endpoint
  ];

  const allSummaries: TestSummary[] = [];

  // Test 1: Baseline (single request timing)
  console.log('\n' + '-'.repeat(70));
  console.log('TEST 1: BASELINE (Single Request)');
  console.log('-'.repeat(70));

  for (const endpoint of endpoints) {
    const result = await runLoadTest(endpoint, {
      concurrency: 1,
      totalRequests: 5,
    });
    const summary = summarizeResult(result);
    allSummaries.push(summary);
    console.log(`  Avg: ${summary.avgMs}ms, TTFB: ${summary.avgTtfbMs}ms`);
  }

  // Test 2: Concurrent Load
  console.log('\n' + '-'.repeat(70));
  console.log('TEST 2: CONCURRENT LOAD (10 parallel requests)');
  console.log('-'.repeat(70));

  for (const endpoint of endpoints.slice(0, 3)) {
    const result = await runLoadTest(endpoint, {
      concurrency: 10,
      totalRequests: 50,
    });
    const summary = summarizeResult(result);
    allSummaries.push(summary);
    console.log(`  Avg: ${summary.avgMs}ms, P95: ${summary.p95Ms}ms, Throughput: ${summary.throughput}`);
    evaluateAgainstTargets(summary);
  }

  // Test 3: Burst Traffic
  console.log('\n' + '-'.repeat(70));
  console.log('TEST 3: BURST TRAFFIC (20 simultaneous requests)');
  console.log('-'.repeat(70));

  const burstEndpoint = `/api/dashboard/summary?userId=${volunteerUserId}`;
  const burstResult = await runLoadTest(burstEndpoint, {
    concurrency: 20,
    totalRequests: 100,
  });
  const burstSummary = summarizeResult(burstResult);
  allSummaries.push(burstSummary);
  console.log(`  Avg: ${burstSummary.avgMs}ms, P95: ${burstSummary.p95Ms}ms, P99: ${burstSummary.p99Ms}ms`);
  console.log(`  Throughput: ${burstSummary.throughput}, Success Rate: ${burstSummary.successRate}`);
  evaluateAgainstTargets(burstSummary);

  // Final Summary
  console.log('\n' + '='.repeat(70));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(70));
  console.log('\n| Endpoint | Avg (ms) | P95 (ms) | P99 (ms) | Throughput | Success |');
  console.log('|----------|----------|----------|----------|------------|---------|');

  allSummaries.forEach((s) => {
    const shortEndpoint = s.endpoint.length > 40 ? s.endpoint.substring(0, 37) + '...' : s.endpoint;
    console.log(`| ${shortEndpoint.padEnd(40)} | ${s.avgMs.padStart(8)} | ${s.p95Ms.padStart(8)} | ${s.p99Ms.padStart(8)} | ${s.throughput.padStart(10)} | ${s.successRate.padStart(7)} |`);
  });

  // Overall assessment
  console.log('\n' + '-'.repeat(70));
  console.log('OVERALL ASSESSMENT');
  console.log('-'.repeat(70));

  const avgOfAvgs = average(allSummaries.map((s) => parseFloat(s.avgMs)));
  const avgP95 = average(allSummaries.map((s) => parseFloat(s.p95Ms)));
  const totalErrors = allSummaries.reduce((sum, s) => sum + (parseFloat(s.errorRate) > 0 ? 1 : 0), 0);

  console.log(`  Average Response Time: ${avgOfAvgs.toFixed(2)}ms`);
  console.log(`  Average P95 Response Time: ${avgP95.toFixed(2)}ms`);
  console.log(`  Endpoints with Errors: ${totalErrors}/${allSummaries.length}`);

  if (avgOfAvgs < 50 && avgP95 < 100 && totalErrors === 0) {
    console.log('\n  ✅ All benchmarks PASSED! System is performing optimally.');
  } else if (avgOfAvgs < 100 && avgP95 < 200) {
    console.log('\n  ⚠️ Performance is ACCEPTABLE but could be improved.');
  } else {
    console.log('\n  ❌ Performance needs OPTIMIZATION.');
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Completed at: ${new Date().toISOString()}`);
}

// Run the test suite
runTestSuite().catch(console.error);
