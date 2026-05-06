import { describe, expect, it } from 'vitest';
import {
  TRANSITIONS,
  availableTransitions,
} from '@/components/content/transitions';

describe('TRANSITIONS table parity with server state machine', () => {
  it('mirrors all 9 edges from src/server/services/content.service.ts', () => {
    // If this list ever drifts, fix BOTH files. We assert each expected edge
    // is present rather than equality on the full table so role ordering
    // changes don't cause spurious failures.
    const edges = TRANSITIONS.map((t) => `${t.from}->${t.to}`);
    expect(edges).toEqual(
      expect.arrayContaining([
        'DRAFT->IN_REVIEW',
        'DRAFT->ARCHIVED',
        'DRAFT->PUBLISHED',
        'IN_REVIEW->DRAFT',
        'IN_REVIEW->PUBLISHED',
        'IN_REVIEW->ARCHIVED',
        'PUBLISHED->ARCHIVED',
        'PUBLISHED->DRAFT',
        'ARCHIVED->DRAFT',
      ]),
    );
    expect(TRANSITIONS).toHaveLength(9);
  });
});

describe('availableTransitions', () => {
  it('AUTHOR who owns a DRAFT can submit for review or archive (no publish)', () => {
    const out = availableTransitions('DRAFT', 'AUTHOR', true);
    expect(out).toEqual(expect.arrayContaining(['IN_REVIEW', 'ARCHIVED']));
    expect(out).not.toContain('PUBLISHED');
  });

  it('AUTHOR who does NOT own the row gets nothing', () => {
    expect(availableTransitions('DRAFT', 'AUTHOR', false)).toEqual([]);
    expect(availableTransitions('IN_REVIEW', 'AUTHOR', false)).toEqual([]);
  });

  it('EDITOR can publish from DRAFT (ownership not required)', () => {
    expect(availableTransitions('DRAFT', 'EDITOR', false)).toEqual(
      expect.arrayContaining(['IN_REVIEW', 'ARCHIVED', 'PUBLISHED']),
    );
  });

  it('EDITOR cannot transition out of PUBLISHED into IN_REVIEW', () => {
    const out = availableTransitions('PUBLISHED', 'EDITOR', true);
    expect(out).not.toContain('IN_REVIEW');
    expect(out).toEqual(expect.arrayContaining(['ARCHIVED', 'DRAFT']));
  });

  it('ADMIN matches EDITOR for the documented edges', () => {
    expect(availableTransitions('IN_REVIEW', 'ADMIN', false).sort()).toEqual(
      availableTransitions('IN_REVIEW', 'EDITOR', false).sort(),
    );
  });

  it('ARCHIVED → DRAFT is editor-plus only', () => {
    expect(availableTransitions('ARCHIVED', 'AUTHOR', true)).toEqual([]);
    expect(availableTransitions('ARCHIVED', 'EDITOR', false)).toEqual(['DRAFT']);
  });
});
