/**
 * Simple Diagnostic Test
 * Step-by-step validation
 */

'use client';

import { useState } from 'react';

export default function SimpleTestPage() {
  const [step, setStep] = useState(1);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setResults(prev => [...prev, result]);
  };

  // Test 1: Check if page loads
  const test1 = () => {
    addResult('✅ Page loaded successfully');
    setStep(2);
  };

  // Test 2: Test API endpoint
  const test2 = async () => {
    try {
      const response = await fetch('/api/parse-action', {
        method: 'GET',
      });
      const data = await response.json();
      addResult(`✅ API health check: ${JSON.stringify(data)}`);
      setStep(3);
    } catch (err) {
      addResult(`❌ API health check failed: ${err}`);
    }
  };

  // Test 3: Test API with sample data
  const test3 = async () => {
    try {
      const response = await fetch('/api/parse-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: 'correct action',
          allowed: [
            { id: 'correct_action', label: 'Correct Primary Action', aliases: ['primary action'] },
            { id: 'other_action', label: 'Other Action', aliases: [] },
          ],
        }),
      });
      const data = await response.json();
      addResult(`✅ API parse test: ${JSON.stringify(data)}`);
      setStep(4);
    } catch (err) {
      addResult(`❌ API parse test failed: ${err}`);
    }
  };

  // Test 4: Check FSM imports
  const test4 = async () => {
    try {
      const { initializeScenario } = await import('@/lib/engine/machine');
      const { mockScenario } = await import('@/lib/engine/mock-scenario');
      const state = initializeScenario(mockScenario, 'teaching');
      addResult(`✅ FSM initialized: Node=${state.nodeId}, HR=${state.vitals.hr}`);
      setStep(5);
    } catch (err) {
      addResult(`❌ FSM test failed: ${err}`);
    }
  };

  // Test 5: Check Voice components
  const test5 = async () => {
    try {
      const { isSpeechRecognitionAvailable } = await import('@/lib/voice/stt');
      const available = isSpeechRecognitionAvailable();
      addResult(`${available ? '✅' : '⚠️'} Speech recognition available: ${available}`);
      setStep(6);
    } catch (err) {
      addResult(`❌ Voice component test failed: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">🔧 Diagnostic Test</h1>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className="text-white font-bold">1</span>
              </div>
              <span className="font-medium">Page Load</span>
              {step === 1 && (
                <button
                  onClick={test1}
                  className="ml-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Run Test
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className="text-white font-bold">2</span>
              </div>
              <span className="font-medium">API Health Check</span>
              {step === 2 && (
                <button
                  onClick={test2}
                  className="ml-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Run Test
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className="text-white font-bold">3</span>
              </div>
              <span className="font-medium">API Parse Action</span>
              {step === 3 && (
                <button
                  onClick={test3}
                  className="ml-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Run Test
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className="text-white font-bold">4</span>
              </div>
              <span className="font-medium">FSM Engine</span>
              {step === 4 && (
                <button
                  onClick={test4}
                  className="ml-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Run Test
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 5 ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className="text-white font-bold">5</span>
              </div>
              <span className="font-medium">Voice Components</span>
              {step === 5 && (
                <button
                  onClick={test5}
                  className="ml-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Run Test
                </button>
              )}
            </div>

            {step >= 6 && (
              <div className="p-4 bg-green-50 border border-green-500 rounded-lg">
                <p className="text-green-900 font-bold">🎉 All Tests Passed!</p>
                <p className="text-green-700 text-sm mt-2">
                  Now try the full integration test at: <a href="/test" className="underline">http://localhost:3000/test</a>
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Test Results:</h2>
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm space-y-2 max-h-96 overflow-auto">
              {results.length === 0 ? (
                <div className="text-gray-500">Click "Run Test" to start...</div>
              ) : (
                results.map((result, idx) => (
                  <div key={idx}>{result}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

