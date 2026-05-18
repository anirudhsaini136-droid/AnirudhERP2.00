/** Round invoice/bill total to nearest rupee (.5 and above rounds up). */
export function applyRoundOff(preRoundTotal) {
  const pre = Math.round(Number(preRoundTotal) * 100) / 100;
  const rounded = Math.round(pre);
  const roundOff = Math.round((rounded - pre) * 100) / 100;
  return { preRoundTotal: pre, roundOff, total: rounded };
}

/** Pre-round total from stored invoice/bill fields. */
export function documentPreRoundTotal(doc, computedSubtotal = 0) {
  const sub = Number(doc?.subtotal ?? computedSubtotal) || 0;
  const disc = Number(doc?.discount_amount || 0);
  const cgst = Number(doc?.cgst_amount || 0);
  const sgst = Number(doc?.sgst_amount || 0);
  const igst = Number(doc?.igst_amount || 0);
  const totalTax = Number(doc?.tax_amount || 0);
  const taxSum = cgst + sgst + igst;
  const tax = taxSum > 0 ? taxSum : totalTax;
  return Math.round((sub + tax - disc) * 100) / 100;
}
