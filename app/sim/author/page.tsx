/**
 * Scenario Authoring Tool
 * Phase 8: Simple form-based authoring tool to create/edit scenarios
 * 
 * Features:
 * - Import existing JSON
 * - Edit scenario metadata
 * - Add/edit nodes and choices
 * - Export as JSON
 */

'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Scenario, Node, Choice, ChecklistItem, TeachBack } from '@/lib/types';
import { validateScenario, checkScenarioIntegrity } from '@/lib/engine/loader';

export default function ScenarioAuthorPage() {
  const [scenario, setScenario] = useState<Partial<Scenario> | null>(null);
  const [editMode, setEditMode] = useState<'metadata' | 'nodes' | 'scoring'>('metadata');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [showJsonExport, setShowJsonExport] = useState(false);

  // Initialize new scenario
  const createNewScenario = useCallback(() => {
    const newScenario: Partial<Scenario> = {
      id: '',
      title: '',
      initial_state: 'S0',
      mode_defaults: {
        teaching: true,
        exam: true,
      },
      checklist: [],
      teachbacks: {},
      nodes: {
        S0: {
          scene: 'bg/default.png',
          vitals: { hr: 80, bp_sys: 120, bp_dia: 80, rr: 16, spo2: 98 },
          choices: [],
          time_limit_sec: 60,
        },
      },
      end_states: {
        END_GOOD: { outcome: 'Successful outcome' },
      },
      captions: {},
      scoring: {
        weights: { timing: 40, correctness: 40, completeness: 20, calibration: 0 },
        timers: {},
        correct: {},
        completeness: {
          checklist: {},
          teachback_pass: 0,
          hint_penalty: -3,
        },
      },
    };
    setScenario(newScenario);
    setValidationErrors([]);
  }, []);

  // Import from JSON
  const importFromJson = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      const validated = validateScenario(parsed);
      const warnings = checkScenarioIntegrity(validated);
      
      setScenario(validated);
      setValidationErrors(warnings);
      
      if (warnings.length === 0) {
        alert('Scenario imported successfully!');
      } else {
        alert(`Scenario imported with ${warnings.length} warnings. Check the validation panel.`);
      }
    } catch (err) {
      alert(`Failed to import: ${err instanceof Error ? err.message : 'Invalid JSON'}`);
    }
  }, []);

  // Export to JSON
  const exportToJson = useCallback(() => {
    if (!scenario) return '';
    return JSON.stringify(scenario, null, 2);
  }, [scenario]);

  // Download JSON file
  const downloadJson = useCallback(() => {
    if (!scenario || !scenario.id) {
      alert('Please set a scenario ID before exporting');
      return;
    }

    const json = exportToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scenario.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [scenario, exportToJson]);

  // Validate current scenario
  const validateCurrent = useCallback(() => {
    if (!scenario) return;

    try {
      const validated = validateScenario(scenario);
      const warnings = checkScenarioIntegrity(validated);
      setValidationErrors(warnings);
      
      if (warnings.length === 0) {
        alert('✅ Scenario is valid!');
      }
    } catch (err) {
      alert(`Validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [scenario]);

  // Add new node
  const addNode = useCallback(() => {
    if (!scenario || !scenario.nodes) return;

    const nodeId = prompt('Enter new node ID (e.g., S1_DELAY):');
    if (!nodeId || nodeId in scenario.nodes) {
      alert('Invalid or duplicate node ID');
      return;
    }

    const newNode: Node = {
      scene: 'bg/default.png',
      vitals: { hr: 80, bp_sys: 120, bp_dia: 80, rr: 16, spo2: 98 },
      choices: [],
      time_limit_sec: 60,
    };

    setScenario({
      ...scenario,
      nodes: {
        ...scenario.nodes,
        [nodeId]: newNode,
      },
    });
    setCurrentNodeId(nodeId);
  }, [scenario]);

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    if (!scenario || !scenario.nodes) return;
    if (!confirm(`Delete node ${nodeId}?`)) return;

    const { [nodeId]: removed, ...remainingNodes } = scenario.nodes;
    setScenario({
      ...scenario,
      nodes: remainingNodes,
    });
    
    if (currentNodeId === nodeId) {
      setCurrentNodeId(null);
    }
  }, [scenario, currentNodeId]);

  // Add choice to current node
  const addChoice = useCallback(() => {
    if (!scenario || !scenario.nodes || !currentNodeId) return;

    const choiceId = prompt('Enter choice ID (e.g., adrenaline_im):');
    if (!choiceId) return;

    const newChoice: Choice = {
      id: choiceId,
      label: 'New Action',
      next: 'END_GOOD',
      voice_aliases: [],
    };

    const currentNode = scenario.nodes[currentNodeId];
    const updatedNode: Node = {
      ...currentNode,
      choices: [...currentNode.choices, newChoice],
    };

    setScenario({
      ...scenario,
      nodes: {
        ...scenario.nodes,
        [currentNodeId]: updatedNode,
      },
    });
  }, [scenario, currentNodeId]);

  if (!scenario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">🎨 Scenario Authoring Tool</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create New */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createNewScenario}
              className="p-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl text-left"
            >
              <div className="text-4xl mb-4">📝</div>
              <h2 className="text-2xl font-bold mb-2">Create New Scenario</h2>
              <p className="text-blue-100">Start from a blank template</p>
            </motion.button>

            {/* Import Existing */}
            <motion.label
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-8 bg-gradient-to-br from-green-600 to-green-700 rounded-xl text-left cursor-pointer"
            >
              <div className="text-4xl mb-4">📂</div>
              <h2 className="text-2xl font-bold mb-2">Import Scenario</h2>
              <p className="text-green-100">Load existing JSON file</p>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const content = evt.target?.result as string;
                      importFromJson(content);
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </motion.label>
          </div>

          {/* Sample JSON */}
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-2">💡 Quick Start</h3>
            <p className="text-gray-400 text-sm mb-4">
              Import the example anaphylaxis scenario from <code className="bg-gray-700 px-2 py-1 rounded">/public/scenarios/anaphylaxis_pacu_v1.json</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">🎨 Authoring Tool</h1>
            <p className="text-gray-400">{scenario.title || 'Untitled Scenario'}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={validateCurrent}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              ✓ Validate
            </button>
            <button
              onClick={() => setShowJsonExport(!showJsonExport)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              📄 View JSON
            </button>
            <button
              onClick={downloadJson}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              💾 Download
            </button>
          </div>
        </div>

        {/* Validation Warnings */}
        {validationErrors.length > 0 && (
          <div className="mb-6 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-4">
            <h3 className="font-bold text-yellow-400 mb-2">⚠️ Validation Warnings ({validationErrors.length})</h3>
            <ul className="text-sm text-yellow-200 space-y-1">
              {validationErrors.slice(0, 5).map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
              {validationErrors.length > 5 && (
                <li className="text-yellow-300">... and {validationErrors.length - 5} more</li>
              )}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Navigation */}
          <div className="col-span-3 space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-bold text-gray-400 mb-3">SECTIONS</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setEditMode('metadata')}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    editMode === 'metadata' ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                >
                  📋 Metadata
                </button>
                <button
                  onClick={() => setEditMode('nodes')}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    editMode === 'nodes' ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                >
                  🗺️ Nodes ({Object.keys(scenario.nodes || {}).length})
                </button>
                <button
                  onClick={() => setEditMode('scoring')}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    editMode === 'scoring' ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                >
                  🎯 Scoring
                </button>
              </div>
            </div>

            {/* Node List */}
            {editMode === 'nodes' && scenario.nodes && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-400">NODES</h3>
                  <button
                    onClick={addNode}
                    className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 rounded"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-1">
                  {Object.keys(scenario.nodes).map(nodeId => (
                    <button
                      key={nodeId}
                      onClick={() => setCurrentNodeId(nodeId)}
                      className={`w-full text-left px-3 py-2 rounded transition-colors text-sm ${
                        currentNodeId === nodeId ? 'bg-blue-600' : 'hover:bg-gray-700'
                      }`}
                    >
                      {nodeId}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="col-span-9 bg-gray-800 rounded-lg p-6">
            {/* Metadata Editor */}
            {editMode === 'metadata' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold mb-6">Scenario Metadata</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Scenario ID *
                  </label>
                  <input
                    type="text"
                    value={scenario.id || ''}
                    onChange={(e) => setScenario({ ...scenario, id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    placeholder="e.g., anaphylaxis_pacu_v1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={scenario.title || ''}
                    onChange={(e) => setScenario({ ...scenario, title: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    placeholder="e.g., PACU Anaphylaxis"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Initial State *
                  </label>
                  <input
                    type="text"
                    value={scenario.initial_state || ''}
                    onChange={(e) => setScenario({ ...scenario, initial_state: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    placeholder="e.g., S0"
                  />
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <p className="text-sm text-gray-400 mb-4">
                    ℹ️ Use the Nodes and Scoring sections to configure the scenario graph, actions, and scoring rules.
                  </p>
                  <p className="text-xs text-gray-500">
                    This is a simplified authoring tool. For complex scenarios, consider editing JSON directly.
                  </p>
                </div>
              </div>
            )}

            {/* Node Editor */}
            {editMode === 'nodes' && currentNodeId && scenario.nodes && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Node: {currentNodeId}</h2>
                  <button
                    onClick={() => deleteNode(currentNodeId)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                  >
                    🗑️ Delete Node
                  </button>
                </div>

                {scenario.nodes[currentNodeId] && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Scene Image Path
                      </label>
                      <input
                        type="text"
                        value={scenario.nodes[currentNodeId].scene}
                        onChange={(e) => {
                          const updatedNode = { ...scenario.nodes![currentNodeId], scene: e.target.value };
                          setScenario({
                            ...scenario,
                            nodes: { ...scenario.nodes, [currentNodeId]: updatedNode },
                          });
                        }}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                        placeholder="bg/scene.png"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Time Limit (seconds)
                      </label>
                      <input
                        type="number"
                        value={scenario.nodes[currentNodeId].time_limit_sec || 60}
                        onChange={(e) => {
                          const updatedNode = { 
                            ...scenario.nodes![currentNodeId], 
                            time_limit_sec: parseInt(e.target.value) 
                          };
                          setScenario({
                            ...scenario,
                            nodes: { ...scenario.nodes, [currentNodeId]: updatedNode },
                          });
                        }}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold">Choices</h3>
                        <button
                          onClick={addChoice}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                        >
                          + Add Choice
                        </button>
                      </div>
                      
                      {scenario.nodes[currentNodeId].choices.length === 0 ? (
                        <p className="text-gray-400 text-sm italic">No choices yet. Add one to get started.</p>
                      ) : (
                        <div className="space-y-3">
                          {scenario.nodes[currentNodeId].choices.map((choice, idx) => (
                            <div key={idx} className="p-4 bg-gray-700 rounded border border-gray-600">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-sm text-gray-400">{choice.id}</span>
                                <button
                                  onClick={() => {
                                    const choices = scenario.nodes![currentNodeId].choices.filter((_, i) => i !== idx);
                                    const updatedNode = { ...scenario.nodes![currentNodeId], choices };
                                    setScenario({
                                      ...scenario,
                                      nodes: { ...scenario.nodes, [currentNodeId]: updatedNode },
                                    });
                                  }}
                                  className="text-xs text-red-400 hover:text-red-300"
                                >
                                  Remove
                                </button>
                              </div>
                              <p className="font-medium">{choice.label}</p>
                              <p className="text-sm text-gray-400">→ {choice.next}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Scoring Editor */}
            {editMode === 'scoring' && scenario.scoring && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Scoring Configuration</h2>
                
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Timing Weight
                    </label>
                    <input
                      type="number"
                      value={scenario.scoring.weights.timing}
                      onChange={(e) => setScenario({
                        ...scenario,
                        scoring: {
                          ...scenario.scoring!,
                          weights: {
                            ...scenario.scoring!.weights,
                            timing: parseInt(e.target.value),
                          },
                        },
                      })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Correctness Weight
                    </label>
                    <input
                      type="number"
                      value={scenario.scoring.weights.correctness}
                      onChange={(e) => setScenario({
                        ...scenario,
                        scoring: {
                          ...scenario.scoring!,
                          weights: {
                            ...scenario.scoring!.weights,
                            correctness: parseInt(e.target.value),
                          },
                        },
                      })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Completeness Weight
                    </label>
                    <input
                      type="number"
                      value={scenario.scoring.weights.completeness}
                      onChange={(e) => setScenario({
                        ...scenario,
                        scoring: {
                          ...scenario.scoring!,
                          weights: {
                            ...scenario.scoring!.weights,
                            completeness: parseInt(e.target.value),
                          },
                        },
                      })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Calibration Weight
                    </label>
                    <input
                      type="number"
                      value={scenario.scoring.weights.calibration}
                      onChange={(e) => setScenario({
                        ...scenario,
                        scoring: {
                          ...scenario.scoring!,
                          weights: {
                            ...scenario.scoring!.weights,
                            calibration: parseInt(e.target.value),
                          },
                        },
                      })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <p className="text-sm text-gray-400">
                    ℹ️ Configure timing rules, correct actions, and checklist points in the JSON editor for full control.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* JSON Export Modal */}
        {showJsonExport && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-8">
            <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-xl font-bold">Scenario JSON</h3>
                <button
                  onClick={() => setShowJsonExport(false)}
                  className="text-2xl hover:text-gray-400"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">
                  {exportToJson()}
                </pre>
              </div>
              <div className="p-4 border-t border-gray-700 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(exportToJson());
                    alert('Copied to clipboard!');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  📋 Copy
                </button>
                <button
                  onClick={downloadJson}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                >
                  💾 Download
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
