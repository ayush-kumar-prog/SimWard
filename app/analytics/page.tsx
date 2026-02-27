/**
 * Analytics Dashboard
 * Phase 8: Display performance metrics and insights
 * 
 * Shows:
 * - Total runs count
 * - Median time-to-critical-action
 * - Pass rate
 * - Average calibration
 * - Hint usage stats
 * - Run history table
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { Run, AnalyticsSummary, SimulationMode } from '@/lib/types';
import { getRunStore } from '@/lib/storage/store';

export default function AnalyticsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  // Filters
  const [scenarioFilter, setScenarioFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<SimulationMode | 'all'>('all');

  // Load runs on mount
  useEffect(() => {
    loadRuns();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [runs, scenarioFilter, modeFilter]);

  // Calculate analytics when filtered runs change
  useEffect(() => {
    if (filteredRuns.length > 0) {
      calculateAnalytics();
    }
  }, [filteredRuns]);

  const loadRuns = async () => {
    try {
      const store = getRunStore();
      const allRuns = await store.listRuns();
      setRuns(allRuns);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load runs:', err);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...runs];

    if (scenarioFilter !== 'all') {
      filtered = filtered.filter(run => run.scenarioId === scenarioFilter);
    }

    if (modeFilter !== 'all') {
      filtered = filtered.filter(run => run.mode === modeFilter);
    }

    setFilteredRuns(filtered);
  };

  const calculateAnalytics = () => {
    const totalRuns = filteredRuns.length;

    // Calculate median time to critical action
    const timesToCritical = filteredRuns
      .map(run => run.metrics.timeToCritical)
      .filter(t => t !== undefined) as number[];
    
    timesToCritical.sort((a, b) => a - b);
    const medianTimeToCritical = timesToCritical.length > 0
      ? timesToCritical[Math.floor(timesToCritical.length / 2)]
      : 0;

    // Calculate pass rate (>= 70 as passing)
    const passThreshold = 70;
    const passedRuns = filteredRuns.filter(run => run.score.total >= passThreshold).length;
    const passRate = totalRuns > 0 ? (passedRuns / totalRuns) * 100 : 0;

    // Calculate average calibration
    const calibrationScores = filteredRuns.map(run => run.score.calibration);
    const avgCalibration = calibrationScores.length > 0
      ? calibrationScores.reduce((sum, score) => sum + score, 0) / calibrationScores.length
      : 0;

    // Calculate average hint usage
    const hintUsages = filteredRuns.map(run => run.metrics.usedHints);
    const avgHintUsage = hintUsages.length > 0
      ? hintUsages.reduce((sum, hints) => sum + hints, 0) / hintUsages.length
      : 0;

    // Find top misses (most common wrong actions)
    const actionCounts: Record<string, number> = {};
    filteredRuns.forEach(run => {
      run.history.forEach(entry => {
        if (entry.correct === false) {
          actionCounts[entry.actionId] = (actionCounts[entry.actionId] || 0) + 1;
        }
      });
    });

    const topMisses = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    setAnalytics({
      totalRuns,
      medianTimeToCritical,
      passRate,
      avgCalibration,
      avgHintUsage,
      topMisses,
    });
  };

  const deleteRun = async (runId: string) => {
    if (!confirm('Are you sure you want to delete this run?')) return;

    try {
      const store = getRunStore();
      await store.deleteRun(runId);
      await loadRuns();
    } catch (err) {
      console.error('Failed to delete run:', err);
    }
  };

  const clearAllRuns = async () => {
    if (!confirm('Are you sure you want to delete ALL runs? This cannot be undone.')) return;

    try {
      const store = getRunStore();
      await store.clearAll();
      await loadRuns();
    } catch (err) {
      console.error('Failed to clear runs:', err);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get unique scenario IDs for filter
  const uniqueScenarios = Array.from(new Set(runs.map(run => run.scenarioId)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">📊 Analytics Dashboard</h1>
            <p className="text-gray-400">Performance metrics and insights</p>
          </div>
          <Link
            href="/sim/runner"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
          >
            ← Back to Simulation
          </Link>
        </div>

        {/* No Data State */}
        {runs.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold mb-2">No Runs Yet</h2>
            <p className="text-gray-400 mb-6">Complete a simulation to see analytics here</p>
            <Link
              href="/sim/runner"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
            >
              Start a Simulation
            </Link>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-gray-800 rounded-lg p-4 mb-6 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-400">Scenario:</label>
                <select
                  value={scenarioFilter}
                  onChange={(e) => setScenarioFilter(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Scenarios</option>
                  {uniqueScenarios.map(scenario => (
                    <option key={scenario} value={scenario}>{scenario}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-400">Mode:</label>
                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value as SimulationMode | 'all')}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Modes</option>
                  <option value="teaching">Teaching</option>
                  <option value="exam">Exam</option>
                </select>
              </div>

              <div className="flex-1"></div>

              <button
                onClick={clearAllRuns}
                className="px-4 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
              >
                🗑️ Clear All
              </button>
            </div>

            {/* Analytics Cards */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Runs */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6"
                >
                  <div className="text-blue-100 text-sm mb-1">Total Runs</div>
                  <div className="text-4xl font-bold mb-1">{analytics.totalRuns}</div>
                  <div className="text-blue-200 text-xs">
                    {filteredRuns.length !== runs.length && `(${runs.length} total)`}
                  </div>
                </motion.div>

                {/* Pass Rate */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6"
                >
                  <div className="text-green-100 text-sm mb-1">Pass Rate</div>
                  <div className="text-4xl font-bold mb-1">{analytics.passRate.toFixed(1)}%</div>
                  <div className="text-green-200 text-xs">≥70 threshold</div>
                </motion.div>

                {/* Median Time to Critical */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6"
                >
                  <div className="text-purple-100 text-sm mb-1">Median Time to Critical</div>
                  <div className="text-4xl font-bold mb-1">{analytics.medianTimeToCritical}s</div>
                  <div className="text-purple-200 text-xs">First critical action</div>
                </motion.div>

                {/* Average Calibration */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl p-6"
                >
                  <div className="text-yellow-100 text-sm mb-1">Avg Calibration</div>
                  <div className="text-4xl font-bold mb-1">{analytics.avgCalibration.toFixed(0)}</div>
                  <div className="text-yellow-200 text-xs">Confidence accuracy</div>
                </motion.div>
              </div>
            )}

            {/* Top Misses */}
            {analytics && analytics.topMisses.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-bold mb-4">🎯 Most Common Mistakes</h3>
                <div className="space-y-2">
                  {analytics.topMisses.map((miss, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                      <span className="text-gray-300">{miss.action}</span>
                      <span className="text-red-400 font-bold">{miss.count} times</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Run History Table */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-xl font-bold">Run History</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-750">
                    <tr className="text-left text-sm text-gray-400">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Scenario</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Timing</th>
                      <th className="px-4 py-3">Correctness</th>
                      <th className="px-4 py-3">Completeness</th>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredRuns.map((run) => (
                      <tr key={run.runId} className="hover:bg-gray-750 transition-colors">
                        <td className="px-4 py-3 text-sm">{formatDate(run.startedAt)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-300">
                          {run.scenarioId}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            run.mode === 'teaching' 
                              ? 'bg-green-900 text-green-300' 
                              : 'bg-red-900 text-red-300'
                          }`}>
                            {run.mode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono">
                          {formatDuration(run.endedAt - run.startedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-lg font-bold ${
                            run.score.total >= 70 
                              ? 'text-green-400' 
                              : run.score.total >= 50 
                              ? 'text-yellow-400' 
                              : 'text-red-400'
                          }`}>
                            {run.score.total}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {run.score.timing}/40
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {run.score.correctness}/40
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {run.score.completeness}/20
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            run.metrics.branch === 'good' 
                              ? 'bg-green-900 text-green-300' 
                              : run.metrics.branch === 'delay'
                              ? 'bg-yellow-900 text-yellow-300'
                              : 'bg-red-900 text-red-300'
                          }`}>
                            {run.metrics.branch}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => deleteRun(run.runId)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
