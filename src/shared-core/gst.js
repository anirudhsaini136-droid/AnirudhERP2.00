function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

export function normalizeStateForGst(raw) {
  if (!raw) return "";
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Split total tax rupees into CGST+SGST (intra) or IGST (inter). No averaged % on invoice. */
export function splitGstTotal(taxAmount, sellerState, buyerState) {
  const ta = round2(taxAmount);
  if (!ta || ta <= 0) {
    return {
      supply_type: "intrastate",
      cgst_rate: 0,
      cgst_amount: 0,
      sgst_rate: 0,
      sgst_amount: 0,
      igst_rate: 0,
      igst_amount: 0,
      tax_amount: 0,
    };
  }
  const s1 = normalizeStateForGst(sellerState);
  const s2 = normalizeStateForGst(buyerState);
  if (s1 && s2 && s1 === s2) {
    const half = round2(ta / 2);
    const other = round2(ta - half);
    return {
      supply_type: "intrastate",
      cgst_rate: 0,
      cgst_amount: half,
      sgst_rate: 0,
      sgst_amount: other,
      igst_rate: 0,
      igst_amount: 0,
      tax_amount: ta,
    };
  }
  return {
    supply_type: "interstate",
    cgst_rate: 0,
    cgst_amount: 0,
    sgst_rate: 0,
    sgst_amount: 0,
    igst_rate: 0,
    igst_amount: ta,
    tax_amount: ta,
  };
}

/** Legacy: compute tax from single rate × subtotal, then split (used where line tax not modeled). */
export function calculateGstSplit(taxRate, subtotal, sellerState, buyerState) {
  const tr = Number(taxRate) || 0;
  if (!tr) {
    return splitGstTotal(0, sellerState, buyerState);
  }
  const taxAmount = round2((Number(subtotal) * tr) / 100);
  return splitGstTotal(taxAmount, sellerState, buyerState);
}
