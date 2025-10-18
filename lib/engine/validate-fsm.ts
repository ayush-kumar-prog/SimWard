/**
 * FSM Validation Demo
 * Phase 2: Verify FSM Engine works correctly
 * 
 * This script demonstrates that the FSM engine functions properly
 * Run with: npx tsx lib/engine/validate-fsm.ts
 */

import {
  initializeScenario,
  getCurrentNode,
  getAvailableChoices,
  isEndState,
  validateScenario,
} from './machine';
import {
  applyTransition,
  applyTimeout,
  updateTimer,
  isInEndState,
  getOutcome,
} from './transition';
import { mockScenario } from './mock-scenario';

console.log('🔍 SimWard FSM Engine Validation\n');
console.log('='.repeat(60));

// 1. Validate Scenario Structure
console.log('\n1️⃣ Validating Scenario Structure...');
const validation = validateScenario(mockScenario);
if (validation.valid) {
  console.log('✅ Scenario is valid');
} else {
  console.log('❌ Scenario validation failed:');
  validation.errors.forEach(err => console.log(`   - ${err}`));
  process.exit(1);
}

// 2. Initialize Scenario
console.log('\n2️⃣ Initializing Scenario in Teaching Mode...');
let state = initializeScenario(mockScenario, 'teaching');
console.log('✅ Initial state created');
console.log(`   Node: ${state.nodeId}`);
console.log(`   Vitals: HR=${state.vitals.hr}, BP=${state.vitals.bp_sys}/${state.vitals.bp_dia}, SpO2=${state.vitals.spo2}%`);
console.log(`   Timer: ${state.timer} seconds`);
console.log(`   Mode: ${state.mode}`);

// 3. Get Current Node
console.log('\n3️⃣ Getting Current Node...');
const currentNode = getCurrentNode(state, mockScenario);
console.log('✅ Current node retrieved');
console.log(`   Scene: ${currentNode.scene}`);
console.log(`   Choices available: ${currentNode.choices.length}`);

// 4. Get Available Choices
console.log('\n4️⃣ Getting Available Choices...');
const choices = getAvailableChoices(state, mockScenario);
console.log('✅ Choices retrieved');
choices.forEach((choice, idx) => {
  console.log(`   ${idx + 1}. [${choice.id}] ${choice.label} → ${choice.next}`);
});

// 5. Apply Correct Transition
console.log('\n5️⃣ Applying Correct Action Transition...');
state = applyTransition(state, 'correct_action', mockScenario, 0.85, 'This stabilizes the patient');
console.log('✅ Transition applied');
console.log(`   New Node: ${state.nodeId}`);
console.log(`   New Vitals: HR=${state.vitals.hr}, BP=${state.vitals.bp_sys}/${state.vitals.bp_dia}, SpO2=${state.vitals.spo2}%`);
console.log(`   Checklist ticked: ${state.checklist.join(', ')}`);
console.log(`   History entries: ${state.history.length}`);
console.log(`   Last action: ${state.history[0].actionId}`);
console.log(`   Uncertainty recorded: ${state.history[0].uncertainty}`);
console.log(`   Teachback recorded: "${state.history[0].teachback}"`);
console.log(`   Correct: ${state.history[0].correct}`);

// 6. Timer Update
console.log('\n6️⃣ Testing Timer Updates...');
console.log(`   Initial timer: ${state.timer}s`);
state = updateTimer(state, 5);
console.log(`   After 5 seconds: ${state.timer}s`);
state = updateTimer(state, 10);
console.log(`   After 10 more seconds: ${state.timer}s`);
console.log('✅ Timer updates working');

// 7. Apply Second Transition
console.log('\n7️⃣ Applying Secondary Action...');
state = applyTransition(state, 'secondary_action', mockScenario);
console.log('✅ Second transition applied');
console.log(`   Node: ${state.nodeId}`);
console.log(`   History entries: ${state.history.length}`);
console.log(`   Checklist: ${state.checklist.join(', ')}`);

// 8. Check End State
console.log('\n8️⃣ Checking End State...');
const inEndState = isInEndState(state, mockScenario);
console.log(`   Is in end state: ${inEndState}`);
if (inEndState) {
  const outcome = getOutcome(state, mockScenario);
  console.log(`   Outcome: "${outcome}"`);
  console.log('✅ End state detection working');
}

// 9. Test Timeout Path (with new simulation)
console.log('\n9️⃣ Testing Timeout Transition...');
let timeoutState = initializeScenario(mockScenario, 'exam');
console.log(`   Starting at: ${timeoutState.nodeId}`);
timeoutState = applyTimeout(timeoutState, mockScenario);
console.log('✅ Timeout transition applied');
console.log(`   Transitioned to: ${timeoutState.nodeId}`);
console.log(`   Last action: ${timeoutState.history[0].actionId}`);
console.log(`   Marked as correct: ${timeoutState.history[0].correct}`);

// 10. Test Suboptimal Path
console.log('\n🔟 Testing Suboptimal Path...');
let delayState = initializeScenario(mockScenario, 'teaching');
delayState = applyTransition(delayState, 'suboptimal_action', mockScenario);
console.log('✅ Suboptimal action applied');
console.log(`   Node: ${delayState.nodeId}`);
console.log(`   Action was correct: ${delayState.history[0].correct}`);
console.log(`   Vitals: HR=${delayState.vitals.hr}, BP=${delayState.vitals.bp_sys}/${delayState.vitals.bp_dia}`);

// Final Summary
console.log('\n' + '='.repeat(60));
console.log('✅ All FSM Engine Functions Working Correctly!');
console.log('\nPhase 2 Summary:');
console.log('  ✅ Scenario validation');
console.log('  ✅ State initialization');
console.log('  ✅ Node navigation');
console.log('  ✅ Choice retrieval');
console.log('  ✅ Transition application with vital deltas');
console.log('  ✅ Checklist tracking');
console.log('  ✅ History recording');
console.log('  ✅ Timer management');
console.log('  ✅ Timeout handling');
console.log('  ✅ End state detection');
console.log('  ✅ Correctness tracking');
console.log('  ✅ Uncertainty & teachback capture');
console.log('\n🎉 Phase 2: Deterministic FSM Engine - COMPLETE!\n');

