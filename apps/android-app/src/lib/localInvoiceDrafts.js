import AsyncStorage from "@react-native-async-storage/async-storage";

const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function storageKey(businessId) {
  return `nexa_invoice_drafts_v1:${businessId}`;
}

export async function loadDrafts(businessId) {
  if (!businessId) return [];
  try {
    const raw = await AsyncStorage.getItem(storageKey(businessId));
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function saveDraftsArray(businessId, drafts) {
  await AsyncStorage.setItem(storageKey(businessId), JSON.stringify(drafts));
}

/** Drop drafts older than 24h. Returns the kept list. */
export async function pruneExpiredDrafts(businessId) {
  if (!businessId) return [];
  const drafts = await loadDrafts(businessId);
  const cutoff = Date.now() - DRAFT_MAX_AGE_MS;
  const next = drafts.filter((d) => {
    const t = Date.parse(d.updated_at || d.created_at || "");
    if (Number.isNaN(t)) return false;
    return t >= cutoff;
  });
  if (next.length !== drafts.length) await saveDraftsArray(businessId, next);
  return next;
}

export async function upsertInvoiceDraft(businessId, draft) {
  const list = await pruneExpiredDrafts(businessId);
  const idx = list.findIndex((x) => x.id === draft.id);
  const copy = { ...draft, updated_at: new Date().toISOString() };
  if (!copy.created_at) copy.created_at = copy.updated_at;
  if (idx >= 0) list[idx] = { ...list[idx], ...copy };
  else list.unshift(copy);
  await saveDraftsArray(businessId, list);
  return copy;
}

export async function removeInvoiceDraft(businessId, draftId) {
  if (!businessId || !draftId) return;
  const list = await loadDrafts(businessId);
  await saveDraftsArray(
    businessId,
    list.filter((x) => x.id !== draftId)
  );
}

export async function getInvoiceDraftById(businessId, draftId) {
  const list = await pruneExpiredDrafts(businessId);
  return list.find((x) => x.id === draftId) || null;
}

export async function getInvoiceDraftCount(businessId) {
  const list = await pruneExpiredDrafts(businessId);
  return list.length;
}
