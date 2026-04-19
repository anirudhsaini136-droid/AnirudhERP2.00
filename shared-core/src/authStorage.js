import { safeJsonParse } from "./json";

export function createAuthStorage(storage) {
  const KEY_ACCESS = "access_token";
  const KEY_REFRESH = "refresh_token";
  const KEY_USER = "offline_cached_user";
  const KEY_BIZ = "offline_cached_business";

  return {
    readTokens() {
      return {
        access: storage.getItem(KEY_ACCESS),
        refresh: storage.getItem(KEY_REFRESH),
      };
    },
    writeTokens({ access, refresh }) {
      if (access !== undefined) storage.setItem(KEY_ACCESS, access || "");
      if (refresh !== undefined) storage.setItem(KEY_REFRESH, refresh || "");
    },
    clearTokens() {
      storage.removeItem(KEY_ACCESS);
      storage.removeItem(KEY_REFRESH);
    },
    readCachedProfile() {
      return {
        user: safeJsonParse(storage.getItem(KEY_USER), null),
        business: safeJsonParse(storage.getItem(KEY_BIZ), null),
      };
    },
    writeCachedProfile({ user, business }) {
      storage.setItem(KEY_USER, JSON.stringify(user || null));
      storage.setItem(KEY_BIZ, JSON.stringify(business || null));
    },
  };
}
