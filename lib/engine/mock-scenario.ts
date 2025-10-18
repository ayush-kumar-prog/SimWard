/**
 * Mock Scenario for Testing
 * A simplified test scenario with basic branching logic
 */

import type { Scenario } from '@/lib/types';

export const mockScenario: Scenario = {
  id: 'test_scenario_v1',
  title: 'Test Emergency Scenario',
  initial_state: 'START',
  mode_defaults: {
    teaching: true,
    exam: true,
  },
  checklist: [
    { id: 'primary_action', label: 'Primary action completed' },
    { id: 'secondary_action', label: 'Secondary action completed' },
  ],
  teachbacks: {
    why_primary: {
      prompt: 'Why is this action important?',
      rubric: ['stabilize', 'prevent', 'critical'],
    },
  },
  nodes: {
    START: {
      scene: 'bg/test.png',
      vitals: {
        hr: 120,
        bp_sys: 80,
        bp_dia: 50,
        rr: 24,
        spo2: 90,
      },
      choices: [
        {
          id: 'correct_action',
          label: 'Correct Primary Action',
          next: 'GOOD_PATH',
          delta: {
            hr: '-10',
            bp_sys: '+15',
            spo2: '+5',
          },
          ticks: ['primary_action'],
          ask_uncertainty: true,
          teachback_id: 'why_primary',
          caption_key: 'correct_caption',
          voice_aliases: ['primary action', 'do the right thing'],
        },
        {
          id: 'suboptimal_action',
          label: 'Suboptimal Action',
          next: 'DELAY_PATH',
          delta: {
            bp_sys: '+5',
          },
          caption_key: 'suboptimal_caption',
          voice_aliases: ['other action'],
        },
      ],
      time_limit_sec: 30,
      timeout_next: 'TIMEOUT_PATH',
    },
    GOOD_PATH: {
      scene: 'bg/test.png',
      vitals_target: {
        hr: 110,
        bp_sys: 95,
        bp_dia: 55,
        rr: 22,
        spo2: 95,
      },
      choices: [
        {
          id: 'secondary_action',
          label: 'Secondary Action',
          next: 'END_SUCCESS',
          ticks: ['secondary_action'],
          voice_aliases: ['secondary'],
        },
      ],
      time_limit_sec: 20,
      timeout_next: 'END_TIMEOUT',
    },
    DELAY_PATH: {
      scene: 'bg/test.png',
      vitals: {
        hr: 118,
        bp_sys: 85,
        bp_dia: 52,
        rr: 23,
        spo2: 91,
      },
      choices: [
        {
          id: 'recovery_action',
          label: 'Recovery Action',
          next: 'END_OK',
          voice_aliases: ['recover'],
        },
      ],
      time_limit_sec: 15,
      timeout_next: 'END_TIMEOUT',
    },
    TIMEOUT_PATH: {
      scene: 'bg/test.png',
      vitals: {
        hr: 125,
        bp_sys: 75,
        bp_dia: 48,
        rr: 26,
        spo2: 88,
      },
      choices: [
        {
          id: 'late_action',
          label: 'Late Intervention',
          next: 'END_POOR',
          voice_aliases: ['late action'],
        },
      ],
      time_limit_sec: 10,
    },
  },
  end_states: {
    END_SUCCESS: {
      outcome: 'Patient stabilized - Excellent response',
    },
    END_OK: {
      outcome: 'Patient stable - Delayed but adequate',
    },
    END_POOR: {
      outcome: 'Patient requires advanced intervention',
    },
    END_TIMEOUT: {
      outcome: 'Critical delay in treatment',
    },
  },
  captions: {
    correct_caption: 'Excellent choice - this is the primary intervention.',
    suboptimal_caption: 'This helps but is not the first-line treatment.',
  },
  scoring: {
    weights: {
      timing: 40,
      correctness: 40,
      completeness: 20,
      calibration: 0,
    },
    timers: {
      correct_action: {
        '<=15': 20,
        '<=30': 15,
        '>30': 0,
      },
    },
    correct: {
      START: ['correct_action'],
      GOOD_PATH: ['secondary_action'],
    },
    completeness: {
      checklist: {
        primary_action: 10,
        secondary_action: 5,
      },
      teachback_pass: 5,
      hint_penalty: -3,
    },
  },
};

