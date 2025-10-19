'use client';

/**
 * Phase 7 Test Page - Scenario Loading & Validation
 * Tests scenario loader, validator, and asset preloader
 */

import { useState } from 'react';
import {
  loadScenario,
  listScenarios,
  getScenarioMetadata,
  validateScenario,
  checkScenarioIntegrity,
} from '@/lib/engine/loader';
import {
  preloadScenarioAssets,
  extractAssetPaths,
  validateScenarioAssets,
  type PreloadProgress,
} from '@/lib/engine/preloader';
import type { Scenario } from '@/lib/types';

export default function TestScenarioPage() {
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [preloadProgress, setPreloadProgress] = useState<PreloadProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [assetPaths, setAssetPaths] = useState<string[]>([]);
  const [missingAssets, setMissingAssets] = useState<string[]>([]);

  // Load available scenarios
  const loadScenarioList = async () => {
    try {
      const list = await listScenarios();
      setScenarios(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list scenarios');
    }
  };

  // Load a specific scenario
  const handleLoadScenario = async (scenarioId: string) => {
    setLoading(true);
    setError(null);
    setWarnings([]);
    setSelectedScenario(null);
    setAssetPaths([]);
    setMissingAssets([]);
    setPreloadProgress(null);

    try {
      const scenario = await loadScenario(scenarioId);
      setSelectedScenario(scenario);

      // Check integrity
      const integrityWarnings = checkScenarioIntegrity(scenario);
      setWarnings(integrityWarnings);

      // Extract asset paths
      const assets = extractAssetPaths(scenario);
      setAssetPaths(assets);

      // Validate assets exist
      const missing = await validateScenarioAssets(scenario);
      setMissingAssets(missing);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenario');
    } finally {
      setLoading(false);
    }
  };

  // Preload scenario assets
  const handlePreloadAssets = async () => {
    if (!selectedScenario) return;

    setPreloadProgress({ loaded: 0, total: assetPaths.length, percentage: 0, currentAsset: '' });

    try {
      await preloadScenarioAssets(
        selectedScenario,
        (progress) => {
          setPreloadProgress(progress);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preload assets');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-gray-800 pb-6">
          <h1 className="text-4xl font-bold text-blue-400 mb-2">
            Phase 7: Scenario System Test
          </h1>
          <p className="text-gray-400">
            Test scenario loading, validation, and asset preloading
          </p>
        </div>

        {/* Scenario List */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-300">
            Available Scenarios
          </h2>

          <button
            onClick={loadScenarioList}
            className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            List Scenarios
          </button>

          {scenarios.length > 0 && (
            <div className="space-y-2">
              {scenarios.map((scenarioId) => (
                <button
                  key={scenarioId}
                  onClick={() => handleLoadScenario(scenarioId)}
                  disabled={loading}
                  className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {scenarioId}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-950 border border-red-800 rounded-lg p-4">
            <h3 className="text-red-400 font-semibold mb-2">Error</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
              <span>Loading scenario...</span>
            </div>
          </div>
        )}

        {/* Scenario Details */}
        {selectedScenario && (
          <>
            {/* Basic Info */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-300">
                Scenario Loaded
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <InfoCard label="ID" value={selectedScenario.id} />
                <InfoCard label="Title" value={selectedScenario.title} />
                <InfoCard label="Initial State" value={selectedScenario.initial_state} />
                <InfoCard label="Nodes" value={Object.keys(selectedScenario.nodes).length.toString()} />
                <InfoCard label="End States" value={Object.keys(selectedScenario.end_states).length.toString()} />
                <InfoCard label="Checklist Items" value={selectedScenario.checklist.length.toString()} />
                <InfoCard label="Teaching Mode" value={selectedScenario.mode_defaults.teaching ? 'Yes' : 'No'} />
                <InfoCard label="Exam Mode" value={selectedScenario.mode_defaults.exam ? 'Yes' : 'No'} />
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="bg-yellow-950 border border-yellow-800 rounded-lg p-4">
                <h3 className="text-yellow-400 font-semibold mb-2">
                  Integrity Warnings ({warnings.length})
                </h3>
                <ul className="list-disc list-inside space-y-1 text-yellow-300">
                  {warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Asset Info */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-300">
                Assets ({assetPaths.length})
              </h2>

              {assetPaths.length > 0 ? (
                <>
                  <div className="mb-4 space-y-2">
                    {assetPaths.map((asset, idx) => (
                      <div
                        key={idx}
                        className={`text-sm font-mono px-3 py-2 rounded ${
                          missingAssets.includes(asset)
                            ? 'bg-red-900 text-red-300'
                            : 'bg-gray-800 text-gray-300'
                        }`}
                      >
                        {missingAssets.includes(asset) && '⚠️ '}{asset}
                      </div>
                    ))}
                  </div>

                  {missingAssets.length > 0 && (
                    <div className="bg-red-950 border border-red-800 rounded p-3 mb-4">
                      <p className="text-red-400 text-sm">
                        ⚠️ {missingAssets.length} asset(s) not found
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handlePreloadAssets}
                    disabled={preloadProgress !== null && preloadProgress.percentage < 100}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors"
                  >
                    {preloadProgress && preloadProgress.percentage < 100
                      ? 'Preloading...'
                      : 'Preload Assets'}
                  </button>

                  {preloadProgress && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Loading assets...</span>
                        <span>{preloadProgress.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${preloadProgress.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {preloadProgress.loaded} / {preloadProgress.total} loaded
                        {preloadProgress.currentAsset && ` - ${preloadProgress.currentAsset}`}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-400">No assets to preload</p>
              )}
            </div>

            {/* Node Graph */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-300">
                Node Graph
              </h2>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {Object.entries(selectedScenario.nodes).map(([nodeId, node]) => (
                  <div key={nodeId} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-lg">{nodeId}</span>
                      <span className="text-sm text-gray-400">
                        {node.choices.length} choice(s)
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      {node.choices.map((choice, idx) => (
                        <div key={idx} className="text-gray-300 flex items-center gap-2">
                          <span className="text-gray-500">→</span>
                          <span>{choice.label}</span>
                          <span className="text-blue-400">({choice.next})</span>
                        </div>
                      ))}
                      {node.timeout_next && (
                        <div className="text-red-400 flex items-center gap-2">
                          <span className="text-gray-500">⏱</span>
                          <span>Timeout → {node.timeout_next}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Checklist */}
            <div className="bg-blue-950 border border-blue-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-3 text-blue-300">
                Validation Checklist
              </h2>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Scenario JSON loaded successfully</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Schema validation passed (Zod)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={warnings.length === 0 ? 'text-green-400' : 'text-yellow-400'}>
                    {warnings.length === 0 ? '✓' : '⚠'}
                  </span>
                  <span>Integrity check: {warnings.length} warning(s)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={assetPaths.length > 0 ? 'text-green-400' : 'text-gray-500'}>
                    {assetPaths.length > 0 ? '✓' : '○'}
                  </span>
                  <span>Asset paths extracted ({assetPaths.length} found)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={missingAssets.length === 0 ? 'text-green-400' : 'text-red-400'}>
                    {missingAssets.length === 0 ? '✓' : '✗'}
                  </span>
                  <span>All assets exist ({missingAssets.length} missing)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={preloadProgress?.percentage === 100 ? 'text-green-400' : 'text-gray-500'}>
                    {preloadProgress?.percentage === 100 ? '✓' : '○'}
                  </span>
                  <span>Assets preloaded</span>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper component
function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

