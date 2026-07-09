import {
  xpProgress,
  levelForXp,
  xpToNextLevel,
  XP_BY_PRIORITY,
  FOCUS_POINTS_BY_PRIORITY,
} from '../gamificationConfig';

describe('xpProgress / levelForXp', () => {
  it('starts at level 1 with zero xp', () => {
    expect(xpProgress(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: xpToNextLevel(1) });
    expect(levelForXp(0)).toBe(1);
  });

  it('stays level 1 until the level-1 threshold is met', () => {
    const threshold = xpToNextLevel(1);
    expect(levelForXp(threshold - 1)).toBe(1);
    expect(levelForXp(threshold)).toBe(2);
  });

  it('accumulates across multiple level thresholds', () => {
    const level1Cost = xpToNextLevel(1);
    const level2Cost = xpToNextLevel(2);
    const xp = level1Cost + level2Cost + 5;
    const progress = xpProgress(xp);
    expect(progress.level).toBe(3);
    expect(progress.xpIntoLevel).toBe(5);
  });

  it('never produces a negative xpIntoLevel', () => {
    for (let xp = 0; xp <= 500; xp += 7) {
      expect(xpProgress(xp).xpIntoLevel).toBeGreaterThanOrEqual(0);
    }
  });

  it('is monotonic: more xp never yields a lower level', () => {
    let lastLevel = 1;
    for (let xp = 0; xp <= 1000; xp += 3) {
      const level = levelForXp(xp);
      expect(level).toBeGreaterThanOrEqual(lastLevel);
      lastLevel = level;
    }
  });
});

describe('priority tables', () => {
  it('gives strictly more XP/points for higher priority', () => {
    expect(XP_BY_PRIORITY.P1).toBeGreaterThan(XP_BY_PRIORITY.P2);
    expect(XP_BY_PRIORITY.P2).toBeGreaterThan(XP_BY_PRIORITY.P3);
    expect(FOCUS_POINTS_BY_PRIORITY.P1).toBeGreaterThan(FOCUS_POINTS_BY_PRIORITY.P2);
    expect(FOCUS_POINTS_BY_PRIORITY.P2).toBeGreaterThan(FOCUS_POINTS_BY_PRIORITY.P3);
  });

  it('never awards zero or negative XP/points for any priority', () => {
    (['P1', 'P2', 'P3'] as const).forEach((p) => {
      expect(XP_BY_PRIORITY[p]).toBeGreaterThan(0);
      expect(FOCUS_POINTS_BY_PRIORITY[p]).toBeGreaterThan(0);
    });
  });
});
