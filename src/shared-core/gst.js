function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

export function calculateGstSplit(taxRate, subtotal, sellerState, buyerState) {
  if (!taxRate || Number(taxRate) === 0) {
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

  const from = (sellerState || "").trim().toLowerCase();
  const to = (buyerState || "").trim().toLowerCase();
  const taxAmount = round2((Number(subtotal) * Number(taxRate)) / 100);
  if (from && to && from === to) {
    const halfRate = round2(Number(taxRate) / 2);
    const halfAmount = round2(taxAmount / 2);
    return {
      supply_type: "intrastate",
      cgst_rate: halfRate,
      cgst_amount: halfAmount,
      sgst_rate: halfRate,
      sgst_amount: halfAmount,
      igst_rate: 0,
      igst_amount: 0,
      tax_amount: taxAmount,
    };
  }
  return {
    supply_type: "interstate",
    cgst_rate: 0,
    cgst_amount: 0,
    sgst_rate: 0,
    sgst_amount: 0,
    igst_rate: Number(taxRate),
    igst_amount: taxAmount,
    tax_amount: taxAmount,
  };
}
