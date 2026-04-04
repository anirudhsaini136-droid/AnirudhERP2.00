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

/**
 * GSTR-3B-style component display: IGST output is set off using IGST ITC first, then CGST ITC,
 * then SGST ITC (cross-utilization). CGST/SGST output use same-head ITC first; remainder can offset IGST.
 * Net GST payable headline should remain total output tax minus total ITC; this only splits the display.
 */
export function computeGstr3bComponentRows(summary, itcBlock) {
  const oC = Number(summary?.total_cgst) || 0;
  const oS = Number(summary?.total_sgst) || 0;
  const oI = Number(summary?.total_igst) || 0;
  let iC = Number(itcBlock?.cgst) || 0;
  let iS = Number(itcBlock?.sgst) || 0;
  const iI = Number(itcBlock?.igst) || 0;

  const cgstToCgst = Math.min(iC, oC);
  iC -= cgstToCgst;
  const sgstToSgst = Math.min(iS, oS);
  iS -= sgstToSgst;

  let igstNeed = oI;
  const igstFromIgstItc = Math.min(iI, igstNeed);
  igstNeed -= igstFromIgstItc;
  const igstFromCgstItc = Math.min(iC, igstNeed);
  igstNeed -= igstFromCgstItc;
  const igstFromSgstItc = Math.min(iS, igstNeed);
  igstNeed -= igstFromSgstItc;

  const igstItcShown = round2(igstFromIgstItc + igstFromCgstItc + igstFromSgstItc);

  return {
    cgst: {
      output: oC,
      itc: round2(cgstToCgst),
      net: round2(Math.max(0, oC - cgstToCgst)),
    },
    sgst: {
      output: oS,
      itc: round2(sgstToSgst),
      net: round2(Math.max(0, oS - sgstToSgst)),
    },
    igst: {
      output: oI,
      itc: igstItcShown,
      net: round2(Math.max(0, igstNeed)),
    },
  };
}
