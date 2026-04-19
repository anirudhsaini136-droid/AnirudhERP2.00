import { safeJsonParse } from "./json";

const PREFIX = "nexa_offline_v2";

function businessPrefix(businessId) {
  return `${PREFIX}:biz:${businessId}`;
}

export function queueKey(businessId) {
  return `${businessPrefix(businessId)}:queue`;
}

export function invoicesKey(businessId) {
  return `${businessPrefix(businessId)}:invoices`;
}

export function paymentsKey(businessId) {
  return `${businessPrefix(businessId)}:payments`;
}

export function loadQueue(storage, businessId) {
  const raw = storage.getItem(queueKey(businessId));
  const queue = safeJsonParse(raw, []);
  return Array.isArray(queue) ? queue : [];
}

export function saveQueue(storage, businessId, queue) {
  storage.setItem(queueKey(businessId), JSON.stringify(queue || []));
}

export function enqueue(storage, businessId, job) {
  const queue = loadQueue(storage, businessId);
  queue.push(job);
  saveQueue(storage, businessId, queue);
  return queue;
}

export function popQueue(storage, businessId, predicate) {
  const queue = loadQueue(storage, businessId);
  const next = [];
  const removed = [];
  for (const item of queue) {
    if (predicate(item)) removed.push(item);
    else next.push(item);
  }
  saveQueue(storage, businessId, next);
  return { next, removed };
}
