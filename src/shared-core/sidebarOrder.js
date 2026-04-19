/**
 * @param {{ orderKey: string }[]} items
 * @param {string[]|null|undefined} savedOrder
 */
export function applySidebarOrder(items, savedOrder) {
  if (!Array.isArray(items) || !items.length) return items || [];
  if (!Array.isArray(savedOrder) || !savedOrder.length) return [...items];
  const byKey = new Map(items.map((it) => [it.orderKey, it]));
  const used = new Set();
  const out = [];
  for (const k of savedOrder) {
    const it = byKey.get(k);
    if (it && !used.has(k)) {
      used.add(k);
      out.push(it);
    }
  }
  for (const it of items) {
    if (!used.has(it.orderKey)) out.push(it);
  }
  return out;
}
