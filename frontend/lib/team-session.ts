const storageKey = (code: string) => `team_token_${code}`;

export function saveTeamToken(code: string, token: string, teamId: string, teamName: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(storageKey(code), JSON.stringify({ token, teamId, teamName }));
}

export function getTeamSession(code: string): { token: string; teamId: string; teamName: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(storageKey(code));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { token: string; teamId: string; teamName: string };
  } catch {
    return null;
  }
}

export function clearTeamSession(code: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(storageKey(code));
}
