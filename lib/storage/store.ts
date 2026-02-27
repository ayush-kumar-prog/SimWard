/**
 * Storage System - Local Storage Implementation
 * Phase 8/9: Basic implementation for analytics support
 * 
 * Full implementation will be completed in Phase 9
 */

import type { Run, RunStore, RunStoreOptions } from '../types';

/**
 * LocalStorage-based run store
 * Uses browser localStorage for persistence
 */
export class LocalRunStore implements RunStore {
  private readonly storageKey = 'simward_runs';
  private runs: Map<string, Run>;

  constructor() {
    this.runs = new Map();
    this.loadFromStorage();
  }

  /**
   * Load runs from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const runsArray: Run[] = JSON.parse(stored);
        runsArray.forEach(run => this.runs.set(run.runId, run));
      }
    } catch (err) {
      console.error('Failed to load runs from storage:', err);
    }
  }

  /**
   * Save runs to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const runsArray = Array.from(this.runs.values());
      localStorage.setItem(this.storageKey, JSON.stringify(runsArray));
    } catch (err) {
      console.error('Failed to save runs to storage:', err);
    }
  }

  /**
   * Save a run
   */
  async saveRun(run: Run): Promise<void> {
    this.runs.set(run.runId, run);
    this.saveToStorage();
  }

  /**
   * List runs with optional filters
   */
  async listRuns(opts?: RunStoreOptions): Promise<Run[]> {
    let runsArray = Array.from(this.runs.values());

    // Apply filters
    if (opts?.scenarioId) {
      runsArray = runsArray.filter(run => run.scenarioId === opts.scenarioId);
    }

    if (opts?.mode) {
      runsArray = runsArray.filter(run => run.mode === opts.mode);
    }

    // Sort by date (newest first)
    runsArray.sort((a, b) => b.startedAt - a.startedAt);

    // Apply limit
    if (opts?.limit) {
      runsArray = runsArray.slice(0, opts.limit);
    }

    return runsArray;
  }

  /**
   * Get a specific run by ID
   */
  async getRun(runId: string): Promise<Run | null> {
    return this.runs.get(runId) || null;
  }

  /**
   * Delete a run
   */
  async deleteRun(runId: string): Promise<void> {
    this.runs.delete(runId);
    this.saveToStorage();
  }

  /**
   * Clear all runs (useful for testing)
   */
  async clearAll(): Promise<void> {
    this.runs.clear();
    this.saveToStorage();
  }

  /**
   * Get total count of runs
   */
  async getCount(): Promise<number> {
    return this.runs.size;
  }
}

/**
 * Global singleton instance
 */
let globalStore: LocalRunStore | null = null;

/**
 * Get the global run store instance
 */
export function getRunStore(): LocalRunStore {
  if (typeof window === 'undefined') {
    // Server-side: return a dummy store
    return new LocalRunStore();
  }

  if (!globalStore) {
    globalStore = new LocalRunStore();
  }

  return globalStore;
}

/**
 * Generate a unique run ID
 */
export function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
