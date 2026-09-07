import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { EngineProvider } from '../../../context/EngineContext.jsx';
import { StreamPlanner } from '../StreamPlanner.jsx';
import * as StreamPlannerModule from '../StreamPlanner.jsx';

describe('stream planner component', () => {
  it('exposes a default export for React.lazy (FamilyView code-split)', () => {
    // Regression: missing default broke React.lazy resolution on the Family tab.
    expect(typeof StreamPlannerModule.default).toBe('function');
  });

  it('renders without crashing', () => {
    const html = renderToString(
      <EngineProvider>
        <StreamPlanner />
      </EngineProvider>
    );
    expect(html).toContain('College Stream Planner');
  });
});
