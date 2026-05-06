import { describe, expect, it } from 'vitest';
import { hasRole, isAdmin, isEditorPlus, ROLE_LABEL } from '@/lib/roles';
import type { SessionUser } from '@/lib/types';

const author: Pick<SessionUser, 'role'> = { role: 'AUTHOR' };
const editor: Pick<SessionUser, 'role'> = { role: 'EDITOR' };
const admin: Pick<SessionUser, 'role'> = { role: 'ADMIN' };

describe('hasRole', () => {
  it('returns false for null/undefined user', () => {
    expect(hasRole(null, 'AUTHOR')).toBe(false);
    expect(hasRole(undefined, 'EDITOR')).toBe(false);
  });

  it('AUTHOR satisfies AUTHOR but not EDITOR/ADMIN', () => {
    expect(hasRole(author, 'AUTHOR')).toBe(true);
    expect(hasRole(author, 'EDITOR')).toBe(false);
    expect(hasRole(author, 'ADMIN')).toBe(false);
  });

  it('EDITOR satisfies AUTHOR and EDITOR but not ADMIN', () => {
    expect(hasRole(editor, 'AUTHOR')).toBe(true);
    expect(hasRole(editor, 'EDITOR')).toBe(true);
    expect(hasRole(editor, 'ADMIN')).toBe(false);
  });

  it('ADMIN satisfies all minimums', () => {
    expect(hasRole(admin, 'AUTHOR')).toBe(true);
    expect(hasRole(admin, 'EDITOR')).toBe(true);
    expect(hasRole(admin, 'ADMIN')).toBe(true);
  });
});

describe('isEditorPlus / isAdmin', () => {
  it('isEditorPlus is true for EDITOR and ADMIN only', () => {
    expect(isEditorPlus(author)).toBe(false);
    expect(isEditorPlus(editor)).toBe(true);
    expect(isEditorPlus(admin)).toBe(true);
    expect(isEditorPlus(null)).toBe(false);
  });

  it('isAdmin is true only for ADMIN', () => {
    expect(isAdmin(author)).toBe(false);
    expect(isAdmin(editor)).toBe(false);
    expect(isAdmin(admin)).toBe(true);
  });
});

describe('ROLE_LABEL', () => {
  it('has a human-readable label per role', () => {
    expect(ROLE_LABEL.ADMIN).toBe('Admin');
    expect(ROLE_LABEL.EDITOR).toBe('Editor');
    expect(ROLE_LABEL.AUTHOR).toBe('Author');
  });
});
