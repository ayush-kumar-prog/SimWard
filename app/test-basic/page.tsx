/**
 * Basic Test - Just verify page loads
 */

'use client';

import { useState } from 'react';

export default function BasicTestPage() {
  const [apiResult, setApiResult] = useState<string>('Not tested yet');
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/parse-action');
      const data = await response.json();
      setApiResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setApiResult(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Basic Test Page</h1>
        
        <p className="mb-4">✅ Page loaded successfully!</p>
        
        <button
          onClick={testAPI}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test API Endpoint'}
        </button>
        
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre className="text-sm">{apiResult}</pre>
        </div>
      </div>
    </div>
  );
}

