import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import PurchaseBillRenderer from './PurchaseBillRenderer';
import {
  fmt,
  emptyItem,
  INDIAN_STATES,
  ProductSearch,
  DateInput,
  filterInvoiceItemsForSave,
  itemRowHasDraftSignal,
} from '../finance/invoiceFormPrimitives';
import { splitGstTotal } from '../../shared-core';

const purchaseEmptyItem = { ...emptyItem, update_stock: true };

function padPurchaseItems(items) {
  const list =
    Array.isArray(items) && items.length
      ? items.map((x) => ({ ...purchaseEmptyItem, ...x }))
      : [{ ...purchaseEmptyItem }];
  const last = list[list.length - 1];
  if (String(last.description || '').trim()) {
    list.push({ ...purchaseEmptyItem });
  }
  return list;
}

function hasPurchaseFormAnyData(f) {
  if (!f) return false;
  if ((f.vendor_name || '').trim()) return true;
  if ((f.vendor_phone || '').trim()) return true;
  if ((f.vendor_gstin || '').trim()) return true;
  if ((f.vendor_state || '').trim()) return true;
  if ((f.notes || '').trim()) return true;
  if (Number(f.discount_amount || 0) > 0) return true;
  return (f.items || []).some((i) => itemRowHasDraftSignal(i));
}

export default function CreatePurchaseBillPage() {
  const { api, business, user } = useAuth();
  const navigate = useNavigate();

  const getSavedPref = (key, fallback) => {
    try {
      const v = localStorage.getItem(`pur_pref_${key}`);
      return v !== null ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  };
  const savePref = (key, val) => {
    try {
      localStorage.setItem(`pur_pref_${key}`, JSON.stringify(val));
    } catch {
      /* ignore */
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    vendor_name: '',
    vendor_phone: '',
    vendor_email: '',
    vendor_gstin: '',
    vendor_state: '',
    bill_date: today,
    due_date: '',
    discount_amount: 0,
    notes: '',
    items: padPurchaseItems([{ ...purchaseEmptyItem }]),
  });

  const [showHSN, setShowHSN] = useState(() => getSavedPref('hsn', true));
  const [creating, setCreating] = useState(false);
  const [closePrompt, setClosePrompt] = useState(false);
  const [invoiceBiz, setInvoiceBiz] = useState(null);
  const [showPreview, setShowPreview] = useState(() => getSavedPref('purPreview', true));
  const [offlineNow, setOfflineNow] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const on = () => setOfflineNow(!navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);

  useEffect(() => {
    api
      .get('/dashboard/settings')
      .then((r) => setInvoiceBiz(r.data?.business || null))
      .catch(() => {});
  }, [api]);

  const resetForm = useCallback(() => {
    setForm({
      vendor_name: '',
      vendor_phone: '',
      vendor_email: '',
      vendor_gstin: '',
      vendor_state: '',
      bill_date: today,
      due_date: '',
      discount_amount: 0,
      notes: '',
      items: padPurchaseItems([{ ...purchaseEmptyItem }]),
    });
  }, [today]);

  const updateItem = (idx, field, value) => {
    let items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    const qty = Number(items[idx].quantity) || 0;
    const price = Number(items[idx].unit_price) || 0;
    items[idx].amount = qty * price;
    items = padPurchaseItems(items);
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: padPurchaseItems([...form.items, { ...purchaseEmptyItem }]) });

  const removeItem = (idx) => {
    let next = form.items.filter((_, i) => i !== idx);
    if (next.length === 0) next = [{ ...purchaseEmptyItem }];
    setForm({ ...form, items: padPurchaseItems(next) });
  };

  const countedItems = useMemo(() => filterInvoiceItemsForSave(form.items), [form.items]);

  const subtotal = useMemo(
    () => countedItems.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [countedItems]
  );

  const taxAmount = useMemo(
    () =>
      Math.round(
        countedItems.reduce(
          (s, i) => s + (Number(i.amount) || 0) * ((Number(i.line_tax_rate) || 0) / 100),
          0
        ) * 100
      ) / 100,
    [countedItems]
  );

  const recipientState = invoiceBiz?.state || business?.state || '';
  const gstSplit = useMemo(
    () => splitGstTotal(taxAmount, form.vendor_state || '', recipientState),
    [taxAmount, form.vendor_state, recipientState]
  );

  const totalAmount = subtotal + taxAmount - (Number(form.discount_amount) || 0);

  const previewBill = useMemo(
    () => ({
      bill_number: 'PREVIEW',
      vendor_name: form.vendor_name || 'Vendor name',
      vendor_phone: form.vendor_phone,
      vendor_email: form.vendor_email,
      vendor_gstin: form.vendor_gstin,
      vendor_state: form.vendor_state || null,
      bill_date: form.bill_date,
      due_date: form.due_date || form.bill_date,
      status: 'unpaid',
      subtotal,
      tax_rate: 0,
      tax_amount: taxAmount,
      cgst_amount: gstSplit.cgst_amount,
      sgst_amount: gstSplit.sgst_amount,
      igst_amount: gstSplit.igst_amount,
      supply_type: gstSplit.supply_type,
      discount_amount: Number(form.discount_amount) || 0,
      total_amount: totalAmount,
      amount_paid: 0,
      balance_due: totalAmount,
      notes: form.notes,
    }),
    [form, subtotal, taxAmount, totalAmount, gstSplit]
  );

  const previewItems = useMemo(
    () =>
      countedItems.map((i) => {
        const taxable = Number(i.amount) || 0;
        const tr = Number(i.line_tax_rate) || 0;
        const lta = Math.round(taxable * (tr / 100) * 100) / 100;
        return {
          description: i.description || '—',
          quantity: Number(i.quantity) || 0,
          unit_price: Number(i.unit_price) || 0,
          hsn_code: i.hsn_code || '',
          total: taxable,
          line_tax_rate: tr,
          line_tax_amount: lta,
        };
      }),
    [countedItems]
  );

  const previewBusiness = useMemo(() => {
    const b = business || {};
    const ib = invoiceBiz || {};
    return {
      name: ib.name || b.name || 'Your Business',
      address: ib.address || b.address || '',
      phone: ib.phone || b.phone || '',
      invoice_gst: ib.invoice_gst || '',
      invoice_pan: ib.invoice_pan || '',
      invoice_footer_note: ib.invoice_footer_note || '',
      invoice_logo_url: ib.invoice_logo_url || ib.logo_url || b.logo_url || '',
      city: ib.city || b.city || '',
      country: ib.country || b.country || '',
      state: ib.state || b.state || '',
    };
  }, [business, invoiceBiz]);

  const lineGridStyle = useMemo(() => {
    const p = ['2rem', 'minmax(0,2fr)'];
    if (showHSN) p.push('0.55fr');
    p.push('0.45fr', '0.5fr', '0.58fr', '0.45fr', '0.55fr', '0.55fr', '0.65fr', '1.75rem');
    return { gridTemplateColumns: p.join(' ') };
  }, [showHSN]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.vendor_name.trim()) {
      toast.error('Vendor name is required');
      return;
    }
    if (!form.due_date) {
      toast.error('Due date is required');
      return;
    }
    const linesForSave = filterInvoiceItemsForSave(form.items);
    if (!linesForSave.length) {
      toast.error('Add at least one line item with a description');
      return;
    }
    if (linesForSave.some((i) => !String(i.description || '').trim())) {
      toast.error('All items need a description');
      return;
    }
    setCreating(true);
    try {
      await api.post('/purchases', {
        vendor_name: form.vendor_name.trim(),
        vendor_phone: form.vendor_phone || null,
        vendor_email: form.vendor_email || null,
        vendor_gstin: form.vendor_gstin || null,
        vendor_state: form.vendor_state || null,
        bill_date: form.bill_date,
        due_date: form.due_date || null,
        tax_rate: 0,
        discount_amount: Number(form.discount_amount) || 0,
        notes: form.notes || null,
        items: linesForSave.map((i) => ({
          description: i.description,
          hsn_code: i.hsn_code || null,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          product_id: i.product_id || null,
          update_stock: Boolean(i.update_stock),
          line_tax_rate: Number(i.line_tax_rate) || 0,
        })),
      });
      toast.success('Purchase bill created');
      resetForm();
      navigate('/purchases');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create purchase bill');
    } finally {
      setCreating(false);
    }
  };

  const requestGoBack = () => {
    if (creating) return;
    if (!hasPurchaseFormAnyData(form)) {
      navigate('/purchases');
      return;
    }
    setClosePrompt(true);
  };

  const confirmDiscardAndBack = () => {
    setClosePrompt(false);
    navigate('/purchases');
  };

  if (user?.role === 'ca_admin') {
    navigate('/purchases', { replace: true });
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={requestGoBack}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm w-fit"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-white/20 bg-white/5 text-gold-500 focus:ring-gold-500/40"
              checked={showPreview}
              onChange={(e) => {
                const v = e.target.checked;
                setShowPreview(v);
                savePref('purPreview', v);
              }}
            />
            Show preview
          </label>
        </div>
        <div>
          <h1 className="font-display text-2xl text-white">Create Purchase Bill</h1>
          {showPreview ? (
            <p className="text-sm text-gray-500 font-sans mt-1">Live preview updates as you type</p>
          ) : null}
        </div>

        <div className="flex flex-col xl:flex-row gap-6 xl:items-start">
          <div
            className={`w-full min-w-0 glass-card rounded-2xl p-5 border border-white/10 ${showPreview ? 'xl:w-[60%]' : ''}`}
          >
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-xs">Vendor Name *</Label>
                  <Input
                    className="input-premium mt-1"
                    value={form.vendor_name}
                    onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Vendor Phone</Label>
                  <Input
                    className="input-premium mt-1"
                    value={form.vendor_phone}
                    onChange={(e) => setForm({ ...form, vendor_phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-xs">Vendor Email</Label>
                  <Input
                    type="email"
                    className="input-premium mt-1"
                    value={form.vendor_email}
                    onChange={(e) => setForm({ ...form, vendor_email: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Vendor GSTIN</Label>
                  <Input
                    className="input-premium mt-1 font-mono uppercase"
                    maxLength={15}
                    value={form.vendor_gstin}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        vendor_gstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">
                  Vendor State <span className="text-gold-400">(for GST: CGST/SGST vs IGST)</span>
                </Label>
                <select
                  className="input-premium mt-1 w-full max-w-md"
                  value={form.vendor_state}
                  onChange={(e) => setForm({ ...form, vendor_state: e.target.value })}
                >
                  <option value="">Select vendor state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-gray-400 text-xs">Bill Date *</Label>
                  <DateInput
                    className="input-premium mt-1"
                    value={form.bill_date}
                    onChange={(e) => setForm({ ...form, bill_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Due Date *</Label>
                  <DateInput
                    className="input-premium mt-1"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Discount (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="input-premium mt-1"
                    value={form.discount_amount}
                    onChange={(e) => setForm({ ...form, discount_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowHSN(!showHSN);
                  savePref('hsn', !showHSN);
                }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${showHSN ? 'border-gold-500/40 text-gold-400 bg-gold-500/10' : 'border-white/10 text-gray-500 hover:text-gray-300'}`}
              >
                {showHSN ? '✓' : '+'} HSN/SAC Code
              </button>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-400 text-xs">Line Items *</Label>
                  <button type="button" onClick={addItem} className="text-xs text-gold-400 hover:text-gold-300">
                    + Add Item
                  </button>
                </div>
                <div
                  className="grid gap-x-1 gap-y-2 text-[10px] text-gray-600 uppercase tracking-wider px-1"
                  style={lineGridStyle}
                >
                  <span>Sr</span>
                  <span>Description</span>
                  {showHSN && <span>HSN</span>}
                  <span>Qty</span>
                  <span>Rate</span>
                  <span>Taxable</span>
                  <span>Tax%</span>
                  <span>Tax Amt</span>
                  <span>Amt</span>
                  <span>Stock+</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {form.items.map((item, idx) => {
                    const taxable = Number(item.amount) || 0;
                    const tr = Number(item.line_tax_rate) || 0;
                    const lta = Math.round(taxable * (tr / 100) * 100) / 100;
                    const gross = taxable + lta;
                    return (
                      <div key={idx} className="grid gap-x-1 gap-y-2 items-center" style={lineGridStyle}>
                        <span className="text-xs text-gray-500 text-center pt-2">{idx + 1}</span>
                        <ProductSearch
                          value={item.description}
                          onChange={(val) => updateItem(idx, 'description', val)}
                          onSelect={(product) => {
                            const items = [...form.items];
                            const cost = Number(product.cost_price ?? product.unit_price) || 0;
                            const q = Number(items[idx].quantity) || 1;
                            items[idx] = {
                              ...items[idx],
                              product_id: product.id,
                              description: product.name,
                              unit_price: cost,
                              hsn_code: product.hsn_code || items[idx].hsn_code || '',
                              update_stock: true,
                              amount: q * cost,
                            };
                            setForm({ ...form, items: padPurchaseItems(items) });
                            if (!showHSN && product.hsn_code) {
                              setShowHSN(true);
                              savePref('hsn', true);
                            }
                          }}
                          api={api}
                          businessId={business?.id}
                          offline={offlineNow}
                        />
                        {showHSN && (
                          <Input
                            placeholder="HSN"
                            className="input-premium text-sm"
                            value={item.hsn_code}
                            onChange={(e) => updateItem(idx, 'hsn_code', e.target.value)}
                          />
                        )}
                        <Input
                          type="number"
                          min="0"
                          placeholder="Qty"
                          className="input-premium text-sm"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        />
                        <Input
                          type="number"
                          min="0"
                          placeholder="Rate"
                          className="input-premium text-sm"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                        />
                        <div className="text-sm text-gray-400 text-right pt-2">{fmt(taxable)}</div>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="%"
                          className="input-premium text-sm"
                          value={item.line_tax_rate}
                          onChange={(e) => updateItem(idx, 'line_tax_rate', parseFloat(e.target.value) || 0)}
                        />
                        <div className="text-sm text-gray-400 text-right pt-2">{lta > 0 ? fmt(lta) : '—'}</div>
                        <div className="text-sm text-gold-400 font-semibold text-right pt-2">{fmt(gross)}</div>
                        <label className="flex items-center gap-1 justify-center pt-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded border-white/20"
                            checked={Boolean(item.update_stock)}
                            onChange={(e) => updateItem(idx, 'update_stock', e.target.checked)}
                          />
                          <span className="text-[9px] text-gray-500 leading-tight">In</span>
                        </label>
                        <div className="text-center pt-1">
                          {form.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-rose-400/50 hover:text-rose-400 p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {taxAmount > 0 && (
                  <>
                    {gstSplit.cgst_amount > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>CGST</span>
                        <span>{fmt(gstSplit.cgst_amount)}</span>
                      </div>
                    )}
                    {gstSplit.sgst_amount > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>SGST</span>
                        <span>{fmt(gstSplit.sgst_amount)}</span>
                      </div>
                    )}
                    {gstSplit.igst_amount > 0 && !(gstSplit.cgst_amount > 0) && (
                      <div className="flex justify-between text-gray-400">
                        <span>IGST</span>
                        <span>{fmt(gstSplit.igst_amount)}</span>
                      </div>
                    )}
                  </>
                )}
                {form.discount_amount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Discount</span>
                    <span>-{fmt(form.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-semibold text-base pt-2 border-t border-white/5">
                  <span>Total</span>
                  <span className="text-gold-400">{fmt(totalAmount)}</span>
                </div>
              </div>

              <div>
                <Label className="text-gray-400 text-xs">Notes</Label>
                <textarea
                  className="input-premium mt-1 h-16 resize-none w-full"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button type="submit" disabled={creating} className="btn-premium btn-primary">
                  {creating ? 'Creating...' : 'Create Purchase Bill'}
                </button>
              </div>
            </form>
          </div>

          {showPreview ? (
            <div className="w-full xl:w-[40%] min-w-0 xl:sticky xl:top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d0d12] p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Preview</p>
              <div className="origin-top scale-[0.92] sm:scale-100">
                <PurchaseBillRenderer bill={previewBill} items={previewItems} business={previewBusiness} />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={closePrompt} onOpenChange={(o) => !o && setClosePrompt(false)}>
        <DialogContent className="bg-void border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg">Discard purchase bill?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">You have unsaved changes. Leave without saving?</p>
          <DialogFooter className="gap-2 sm:gap-2">
            <button type="button" onClick={() => setClosePrompt(false)} className="btn-premium btn-secondary">
              Keep editing
            </button>
            <button
              type="button"
              onClick={confirmDiscardAndBack}
              className="btn-premium border border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
            >
              Discard
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
