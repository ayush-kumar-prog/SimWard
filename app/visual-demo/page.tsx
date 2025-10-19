/**
 * Phase 4 Visual Demo
 * Showcase all monitor components with live animations
 */

'use client';

import { useState } from 'react';
import { VitalSignsDisplay } from '@/app/components/VitalSignsDisplay';
import { ECGWaveform } from '@/app/components/ECGWaveform';
import { Timer, TimerBar } from '@/app/components/Timer';
import { audioManager } from '@/lib/anim/audio';
import type { VitalSigns } from '@/lib/types';

export default function VisualDemoPage() {
  // Preset vital sign states
  const [currentPreset, setCurrentPreset] = useState(0);
  
  const presets: { name: string; vitals: VitalSigns; description: string }[] = [
    {
      name: 'Normal',
      vitals: { hr: 75, bp_sys: 120, bp_dia: 80, rr: 16, spo2: 98 },
      description: 'All vitals within normal range',
    },
    {
      name: 'Anaphylaxis (Critical)',
      vitals: { hr: 124, bp_sys: 78, bp_dia: 40, rr: 28, spo2: 88 },
      description: 'Hypotension, tachycardia, low SpO2',
    },
    {
      name: 'After Adrenaline',
      vitals: { hr: 110, bp_sys: 95, bp_dia: 55, rr: 26, spo2: 95 },
      description: 'Improving vitals',
    },
    {
      name: 'Stabilized',
      vitals: { hr: 85, bp_sys: 115, bp_dia: 75, rr: 18, spo2: 97 },
      description: 'Near-normal values',
    },
  ];

  const currentVitals = presets[currentPreset].vitals;

  // Timer state
  const [timerValue, setTimerValue] = useState(30);
  const [timerTotal] = useState(30);

  const cyclePreset = () => {
    setCurrentPreset((prev) => (prev + 1) % presets.length);
    audioManager.playActionConfirm();
  };

  const handleQRSBeat = () => {
    audioManager.playQRSBeep();
  };

  const testSounds = () => {
    audioManager.playSuccessChime();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🏥 Phase 4: Medical Monitor Demo
              </h1>
              <p className="text-gray-600 mt-2">
                Real-time vital signs with animations, ECG, and audio cues
              </p>
            </div>
            <button
              onClick={testSounds}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              🔊 Test Sounds
            </button>
          </div>
        </div>

        {/* Main Monitor Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Vital Signs */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <VitalSignsDisplay vitals={currentVitals} animated={true} />
              
              <div className="mt-6 space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm font-medium text-blue-900">Current Scenario:</p>
                  <p className="text-lg font-bold text-blue-700">{presets[currentPreset].name}</p>
                  <p className="text-xs text-blue-600 mt-1">{presets[currentPreset].description}</p>
                </div>

                <button
                  onClick={cyclePreset}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  🔄 Change Scenario
                </button>
              </div>
            </div>
          </div>

          {/* Center & Right: ECG and Timer */}
          <div className="lg:col-span-2 space-y-6">
            {/* ECG Waveform */}
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Electrocardiogram (ECG)
              </h3>
              <ECGWaveform
                hr={currentVitals.hr}
                rhythm={currentVitals.hr > 110 ? 'tachycardia' : currentVitals.hr < 60 ? 'bradycardia' : 'normal'}
                height={150}
                showBeep={true}
                onBeat={handleQRSBeat}
              />
              <div className="mt-3 text-sm text-gray-600">
                <p>• Green trace scrolls in real-time</p>
                <p>• QRS complexes generated based on heart rate</p>
                <p>• Click "Pause" button to stop animation</p>
              </div>
            </div>

            {/* Timers */}
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Timer System
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Circular Timer */}
                <div className="flex flex-col items-center space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">Circular Timer</h4>
                  <Timer
                    timeRemaining={timerValue}
                    totalTime={timerTotal}
                    size={140}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setTimerValue(30)}
                      className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                    >
                      30s
                    </button>
                    <button
                      onClick={() => setTimerValue(10)}
                      className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                    >
                      10s (Warning)
                    </button>
                    <button
                      onClick={() => setTimerValue(3)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                    >
                      3s (Critical)
                    </button>
                  </div>
                </div>

                {/* Bar Timer */}
                <div className="flex flex-col space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">Bar Timer</h4>
                  <div className="flex-1 flex items-center">
                    <TimerBar
                      timeRemaining={timerValue}
                      totalTime={timerTotal}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600 space-y-1">
                <p>• Green → Yellow → Red transitions based on time</p>
                <p>• Pulse animation when critical (&lt;5s)</p>
                <p>• Audio warnings at 10s, 5s, and 2s</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Smooth Animations</h3>
            <p className="text-sm text-gray-600">
              Vital signs interpolate smoothly using cubic easing functions. Values never jump, they transition naturally.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="text-4xl mb-3">🎨</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Color-Coded Severity</h3>
            <p className="text-sm text-gray-600">
              Green (normal), yellow (warning), red (critical) based on clinical ranges for each vital sign.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="text-4xl mb-3">🔊</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Audio Feedback</h3>
            <p className="text-sm text-gray-600">
              QRS beeps on each heartbeat, timer warnings, action confirmations, and alarm sounds.
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">🎮 Try It Out!</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Click <strong>"Change Scenario"</strong> to cycle through different clinical states</li>
            <li>Watch vitals animate smoothly and colors change based on severity</li>
            <li>See the ECG trace adjust its rate based on heart rate</li>
            <li>Click timer buttons to see color transitions and pulse effects</li>
            <li>Listen for QRS beeps with each heartbeat (may need to enable audio)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

