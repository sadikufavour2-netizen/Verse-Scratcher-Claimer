/**
 * Telegram & User Identity Helper
 * Auto-detects Telegram WebApp user, URL query parameters, and local storage.
 */

export function detectTelegramUsername(): string {
  // 1. Check Telegram Mini App WebApp context
  if (typeof window !== 'undefined') {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.initDataUnsafe?.user?.username) {
        let u = tg.initDataUnsafe.user.username.trim();
        if (!u.startsWith('@')) u = '@' + u;
        localStorage.setItem('verse_telegram_username', u);
        return u;
      }
    } catch (e) {
      // ignore
    }

    // 2. Check URL search parameters (e.g. ?tg=@username or ?user=username or ?telegram=username)
    try {
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get('tg') || params.get('user') || params.get('telegram') || params.get('startapp') || params.get('ref');
      if (fromParam && fromParam.trim()) {
        let clean = fromParam.trim();
        if (!clean.startsWith('@')) clean = '@' + clean;
        localStorage.setItem('verse_telegram_username', clean);
        return clean;
      }
    } catch (e) {
      // ignore
    }

    // 3. Check localStorage
    try {
      const stored = localStorage.getItem('verse_telegram_username');
      if (stored && stored.trim()) {
        let clean = stored.trim();
        if (!clean.startsWith('@')) clean = '@' + clean;
        return clean;
      }
    } catch (e) {
      // ignore
    }
  }

  return '';
}

export function saveTelegramUsername(username: string): string {
  let clean = username.trim();
  if (clean && !clean.startsWith('@')) {
    clean = '@' + clean;
  }
  if (typeof window !== 'undefined') {
    if (clean) {
      localStorage.setItem('verse_telegram_username', clean);
    } else {
      localStorage.removeItem('verse_telegram_username');
    }
  }
  return clean;
}
