import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import InvoiceRenderer from './InvoiceRenderer';
import {
  loadLocalInvoices,
  upsertLocalInvoices,
  createLocalInvoiceAndQueue,
  syncOfflineInvoiceQueue,
} from '../../lib/offlineInvoices';
import {
  fmt,
  emptyItem,
  PARTY_GSTIN_RE,
  normalizePartyGstin,
  hasInvoiceFormAnyData,
  canSaveInvoiceDraft,
  INDIAN_STATES,
  matchIndianStateName,
  ClientSearch,
  ProductSearch,
  DateInput,
  filterInvoiceItemsForSave,
  padInvoiceItemsTrailingBlank,
} from './invoiceFormPrimitives';

function computeEffectiveTaxRate(form, lineItems) {
  const items = lineItems || form.items || [];
  const sub = items.reduce((s, i) => {
    const qty = Number(i.quantity) || 0;
    const rate = Number(i.unit_price) || 0;
    const disc = Number(i.item_discount) || 0;
    return s + (qty * rate - disc);
  }, 0);
  if (!form.per_item_tax) return Number(form.tax_rate) || 0;
  const lineTax = items.reduce((s, i) => {
    const qty = Number(i.quantity) || 0;
    const rate = Number(i.unit_price) || 0;
    const disc = Number(i.item_discount) || 0;
    const lt = qty * rate - disc;
    return s + (lt * (Number(i.line_tax_rate) || 0)) / 100;
  }, 0);
  return sub > 0 ? Math.round((lineTax / sub) * 10000) / 100 : 0;
}

export default function CreateInvoicePage() {
  const { api, business, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftIdParam = searchParams.get('draft');

  const getSavedPref = (key, fallback) => {
    try {
      const v = localStorage.getItem(`inv_pref_${key}`);
      return v !== null ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  };
  const savePref = (key, val) => {
    try {
      localStorage.setItem(`inv_pref_${key}`, JSON.stringify(val));
    } catch { /* ignore */ }
  };

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    client_name: '',
    client_email: '',
    client_address: '',
    client_phone: '',
    client_gstin: '',
    issue_date: today,
    due_date: '',
    tax_rate: 0,
    discount_amount: 0,
    notes: '',
    currency: 'INR',
    buyer_state: '',
    per_item_tax: false,
    items: [{ ...emptyItem }],
    custom_fields: [],
  });

  const [showHSN, setShowHSN] = useState(() => getSavedPref('hsn', false));
  const [showItemDiscount, setShowItemDiscount] = useState(() => getSavedPref('itemDisc', false));
  const [showCustomFields, setShowCustomFields] = useState(() => getSavedPref('customFields', false));
  const [creating, setCreating] = useState(false);
  const [offlineNow, setOfflineNow] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : true);
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [invoiceClosePrompt, setInvoiceClosePrompt] = useState(false);
  const [invoiceBiz, setInvoiceBiz] = useState(null);
  const [showPreview, setShowPreview] = useState(() => getSavedPref('invPreview', true));

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
    const savedLabels = getSavedPref('cfLabels', []);
    const restoredCF = savedLabels.map((label) => ({ label, value: '' }));
    const hsn = getSavedPref('hsn', false);
    const itemDisc = getSavedPref('itemDisc', false);
    const hasCF = restoredCF.length > 0;
    setShowHSN(hsn);
    setShowItemDiscount(itemDisc);
    setShowCustomFields(hasCF);
    setForm({
      client_name: '',
      client_email: '',
      client_address: '',
      client_phone: '',
      client_gstin: '',
      issue_date: today,
      due_date: '',
      tax_rate: 0,
      discount_amount: 0,
      notes: '',
      currency: 'INR',
      buyer_state: '',
      per_item_tax: false,
      items: [{ ...emptyItem }],
      custom_fields: restoredCF,
    });
  }, [today]);

  useEffect(() => {
    if (!draftIdParam || !business?.id) return;
    const all = loadLocalInvoices(business.id);
    const inv = all.find((x) => x.id === draftIdParam);
    if (!inv) return;
    setActiveDraftId(inv.id);
    setForm({
      client_name: inv.client_name || '',
      client_email: inv.client_email || '',
      client_address: inv.client_address || '',
      client_phone: inv.client_phone || '',
      client_gstin: inv.client_gstin || '',
      issue_date: inv.issue_date || today,
      due_date: inv.due_date || '',
      tax_rate: Number(inv.tax_rate) || 0,
      discount_amount: Number(inv.discount_amount) || 0,
      notes: inv.notes || '',
      currency: inv.currency || 'INR',
      buyer_state: inv.buyer_state || '',
      per_item_tax: Boolean(inv.per_item_tax),
      items: padInvoiceItemsTrailingBlank(
        (inv.items || []).length
          ? inv.items.map((i) => ({
              ...emptyItem,
              ...i,
              line_tax_rate: Number(i.line_tax_rate) || 0,
              amount:
                Number(i.total) ||
                (Number(i.quantity) || 0) * (Number(i.unit_price) || 0) - (Number(i.item_discount) || 0),
            }))
          : [{ ...emptyItem }]
      ),
      custom_fields: Array.isArray(inv.custom_fields) ? inv.custom_fields : [],
    });
  }, [draftIdParam, business?.id, today]);

  const removeLocalInvoiceByIdCb = useCallback((localId) => {
    if (!business?.id || !localId) return;
    const all = loadLocalInvoices(business.id);
    upsertLocalInvoices(business.id, all.filter((x) => x.id !== localId));
  }, [business?.id]);

  const saveDraftFromForm = useCallback(() => {
    if (!business?.id) return false;
    if (!canSaveInvoiceDraft(form)) return false;
    const nowIso = new Date().toISOString();
    const counted = filterInvoiceItemsForSave(form.items);
    const subtotal = counted.reduce((s, i) => {
      const qty = Number(i.quantity) || 0;
      const rate = Number(i.unit_price) || 0;
      const disc = Number(i.item_discount) || 0;
      return s + (qty * rate - disc);
    }, 0);
    let taxAmount = subtotal * ((Number(form.tax_rate) || 0) / 100);
    if (form.per_item_tax) {
      taxAmount = counted.reduce((s, i) => {
        const qty = Number(i.quantity) || 0;
        const rate = Number(i.unit_price) || 0;
        const disc = Number(i.item_discount) || 0;
        const lt = qty * rate - disc;
        return s + (lt * (Number(i.line_tax_rate) || 0)) / 100;
      }, 0);
    }
    const totalAmount = subtotal + taxAmount - (Number(form.discount_amount) || 0);
    const localId = activeDraftId || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const effRate = computeEffectiveTaxRate(form, counted);
    const draftInvoice = {
      id: localId,
      local_invoice_id: localId,
      server_invoice_id: null,
      sync_status: 'local_draft',
      status: 'draft',
      invoice_number: `DRAFT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${localId.slice(-4).toUpperCase()}`,
      client_name: form.client_name.trim(),
      client_email: form.client_email || null,
      client_address: form.client_address || null,
      client_phone: form.client_phone || null,
      client_gstin: (() => {
        const g = normalizePartyGstin(form.client_gstin);
        return g && PARTY_GSTIN_RE.test(g) ? g : null;
      })(),
      buyer_state: form.buyer_state || null,
      place_of_supply: form.buyer_state || null,
      issue_date: form.issue_date || today,
      due_date: form.due_date || null,
      subtotal,
      tax_rate: effRate,
      tax_amount: taxAmount,
      discount_amount: Number(form.discount_amount) || 0,
      total_amount: totalAmount,
      amount_paid: 0,
      balance_due: totalAmount,
      per_item_tax: form.per_item_tax,
      items: (form.items || []).map((i) => ({
        product_id: i.product_id || null,
        description: i.description,
        hsn_code: i.hsn_code || null,
        quantity: Number(i.quantity) || 0,
        unit_price: Number(i.unit_price) || 0,
        item_discount: Number(i.item_discount) || 0,
        line_tax_rate: Number(i.line_tax_rate) || 0,
        total:
          (Number(i.quantity) || 0) * (Number(i.unit_price) || 0) - (Number(i.item_discount) || 0),
      })),
      created_at: nowIso,
      updated_at: nowIso,
    };
    const all = loadLocalInvoices(business.id);
    const idx = all.findIndex((x) => x.id === localId);
    if (idx >= 0) all[idx] = { ...all[idx], ...draftInvoice };
    else all.unshift(draftInvoice);
    upsertLocalInvoices(business.id, all);
    return true;
  }, [activeDraftId, business?.id, form, today]);

  const updateItem = (idx, field, value) => {
    let items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    const qty = Number(items[idx].quantity) || 0;
    const price = Number(items[idx].unit_price) || 0;
    const disc = Number(items[idx].item_discount) || 0;
    items[idx].amount = qty * price - disc;
    if (field === 'quantity' && items[idx].available_stock !== null && qty > Number(items[idx].available_stock)) {
      toast.error(`Insufficient stock. Available: ${items[idx].available_stock}`);
    }
    items = padInvoiceItemsTrailingBlank(items);
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (idx) => {
    let next = form.items.filter((_, i) => i !== idx);
    if (next.length === 0) next = [{ ...emptyItem }];
    next = padInvoiceItemsTrailingBlank(next);
    setForm({ ...form, items: next });
  };

  const addCustomField = () => setForm({ ...form, custom_fields: [...form.custom_fields, { label: '', value: '' }] });
  const updateCustomField = (idx, key, val) => {
    const cf = [...form.custom_fields];
    cf[idx] = { ...cf[idx], [key]: val };
    setForm({ ...form, custom_fields: cf });
    if (key === 'label') {
      const labels = cf.map((f) => f.label).filter(Boolean);
      savePref('cfLabels', labels);
    }
  };
  const removeCustomField = (idx) => {
    const cf = form.custom_fields.filter((_, i) => i !== idx);
    setForm({ ...form, custom_fields: cf });
    savePref('cfLabels', cf.map((f) => f.label).filter(Boolean));
    if (cf.length === 0) {
      setShowCustomFields(false);
      savePref('customFields', false);
    }
  };

  const countedItems = useMemo(() => filterInvoiceItemsForSave(form.items), [form.items]);

  const subtotal = countedItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const taxAmount = form.per_item_tax
    ? countedItems.reduce(
        (s, i) => s + (Number(i.amount) || 0) * ((Number(i.line_tax_rate) || 0) / 100),
        0
      )
    : subtotal * ((Number(form.tax_rate) || 0) / 100);
  const totalAmount = subtotal + taxAmount - (Number(form.discount_amount) || 0);

  const previewInvoice = useMemo(() => {
    const customFieldsFiltered = (form.custom_fields || [])
      .filter((f) => f && f.label && f.value)
      .map((f) => ({ label: f.label, value: f.value }));
    const effRate = subtotal > 0 && taxAmount > 0 ? (taxAmount / subtotal) * 100 : Number(form.tax_rate) || 0;
    return {
      invoice_number: 'PREVIEW',
      client_name: form.client_name || 'Customer name',
      client_phone: form.client_phone,
      client_email: form.client_email,
      client_address: form.client_address,
      client_gstin: form.client_gstin,
      issue_date: form.issue_date,
      due_date: form.due_date || form.issue_date,
      status: 'draft',
      subtotal,
      tax_rate: effRate,
      tax_amount: taxAmount,
      discount_amount: Number(form.discount_amount) || 0,
      total_amount: totalAmount,
      amount_paid: 0,
      balance_due: totalAmount,
      custom_fields: customFieldsFiltered.length ? JSON.stringify(customFieldsFiltered) : null,
      payment_terms: null,
      supply_type: 'intrastate',
    };
  }, [form, subtotal, taxAmount, totalAmount]);

  const previewItems = useMemo(
    () =>
      countedItems.map((i) => ({
        description: i.description || '—',
        quantity: Number(i.quantity) || 0,
        unit_price: Number(i.unit_price) || 0,
        hsn_code: i.hsn_code || '',
        item_discount: Number(i.item_discount) || 0,
        total: Number(i.amount) || 0,
      })),
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
      invoice_bank_name: ib.invoice_bank_name || '',
      invoice_bank_account: ib.invoice_bank_account || '',
      invoice_bank_ifsc: ib.invoice_bank_ifsc || '',
      invoice_footer_note: ib.invoice_footer_note || '',
      invoice_logo_url: ib.invoice_logo_url || ib.logo_url || b.logo_url || '',
      terms_of_sale: ib.terms_of_sale || '',
      upi_vpa: ib.upi_vpa || '',
      upi_name: ib.upi_name || '',
      city: ib.city || b.city || '',
      country: ib.country || b.country || '',
    };
  }, [business, invoiceBiz]);

  const lineGridStyle = useMemo(() => {
    const p = ['2rem', 'minmax(0,2.4fr)'];
    if (showHSN) p.push('0.65fr');
    p.push('0.55fr', '0.55fr');
    if (showItemDiscount) p.push('0.5fr');
    if (form.per_item_tax) p.push('0.55fr');
    p.push('0.65fr', '1.75rem');
    return { gridTemplateColumns: p.join(' ') };
  }, [showHSN, showItemDiscount, form.per_item_tax]);

  const handleCreate = async (e) => {
    e.preventDefault();
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
    const partyGstin = normalizePartyGstin(form.client_gstin);
    if (partyGstin && !PARTY_GSTIN_RE.test(partyGstin)) {
      toast.error('Party GSTIN must be exactly 15 letters or digits');
      return;
    }
    setCreating(true);
    const offline = typeof navigator !== 'undefined' ? !navigator.onLine : true;
    try {
      if (offline) {
        if (!business?.id) throw new Error('Business context missing');
        if (activeDraftId) removeLocalInvoiceByIdCb(activeDraftId);
        createLocalInvoiceAndQueue({ businessId: business.id, business, form });
        toast.success('Saved offline. Will sync when online.');
        resetForm();
        setActiveDraftId(null);
        navigate('/finance/invoices');
        return;
      }

      const { client_gstin: _omitGstin, per_item_tax: _pit, items: _it, ...formWithoutGstin } = form;
      const effRate = computeEffectiveTaxRate(form, linesForSave);
      const res = await api.post('/finance/invoices', {
        ...formWithoutGstin,
        tax_rate: effRate,
        ...(partyGstin ? { client_gstin: partyGstin } : {}),
        buyer_state: form.buyer_state || null,
        place_of_supply: form.buyer_state || null,
        custom_fields: form.custom_fields.filter((f) => f.label && f.value),
        items: linesForSave.map((i) => ({
          product_id: i.product_id || null,
          description: i.description,
          hsn_code: i.hsn_code || null,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          item_discount: Number(i.item_discount) || 0,
        })),
      });
      toast.success('Invoice created');
      if (activeDraftId) removeLocalInvoiceByIdCb(activeDraftId);
      resetForm();
      setActiveDraftId(null);
      navigate('/finance/invoices');
    } catch (err) {
      try {
        if (!business?.id) throw err;
        if (activeDraftId) removeLocalInvoiceByIdCb(activeDraftId);
        createLocalInvoiceAndQueue({ businessId: business.id, business, form });
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          syncOfflineInvoiceQueue({ api, businessId: business.id }).catch(() => {});
        }
        toast.success('Saved offline. Will sync when online.');
        resetForm();
        setActiveDraftId(null);
        navigate('/finance/invoices');
      } catch {
        toast.error(err.response?.data?.detail || 'Failed to create invoice');
      }
    } finally {
      setCreating(false);
    }
  };

  const requestGoBack = () => {
    if (creating) return;
    if (!hasInvoiceFormAnyData(form)) {
      navigate('/finance/invoices');
      return;
    }
    setInvoiceClosePrompt(true);
  };

  const confirmDiscardAndBack = () => {
    if (activeDraftId && business?.id) removeLocalInvoiceByIdCb(activeDraftId);
    setInvoiceClosePrompt(false);
    setActiveDraftId(null);
    navigate('/finance/invoices');
  };

  const confirmSaveDraftAndBack = () => {
    if (!canSaveInvoiceDraft(form)) {
      toast.error('Add client name and at least one line item with description and amount greater than 0 to save a draft.');
      return;
    }
    if (saveDraftFromForm()) {
      toast.success('Draft saved');
      setInvoiceClosePrompt(false);
      setActiveDraftId(null);
      navigate('/finance/invoices');
    } else {
      toast.error('Could not save draft.');
    }
  };

  if (user?.role === 'ca_admin') {
    navigate('/finance/invoices', { replace: true });
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
                savePref('invPreview', v);
              }}
            />
            Show preview
          </label>
        </div>
        <div>
          <h1 className="font-display text-2xl text-white">Create Invoice</h1>
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
                  <Label className="text-gray-400 text-xs">Client Name *</Label>
                  <ClientSearch
                    value={form.client_name}
                    onChange={(val) => setForm({ ...form, client_name: val })}
                    onSelect={(c) =>
                      setForm({
                        ...form,
                        client_name: c.name || '',
                        client_phone: c.phone || '',
                        client_email: c.email || '',
                        client_address: (c.address != null ? String(c.address) : '') || '',
                        client_gstin: (c.gstin || '')
                          .toString()
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, '')
                          .slice(0, 15),
                        buyer_state: matchIndianStateName(c.state),
                      })
                    }
                    api={api}
                    businessId={business?.id}
                    offline={offlineNow}
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Client Phone</Label>
                  <Input
                    className="input-premium mt-1"
                    placeholder="+919876543210"
                    value={form.client_phone}
                    onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-xs">Client Email</Label>
                  <Input
                    type="email"
                    className="input-premium mt-1"
                    value={form.client_email}
                    onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Client Address</Label>
                  <Input
                    className="input-premium mt-1"
                    value={form.client_address}
                    onChange={(e) => setForm({ ...form, client_address: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Party GSTIN (Optional)</Label>
                <Input
                  className="input-premium mt-1 font-mono uppercase"
                  placeholder="e.g. 27AAPFU0939F1ZV"
                  maxLength={15}
                  value={form.client_gstin}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      client_gstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                    })
                  }
                />
              </div>

              <div className={`grid gap-3 ${!form.per_item_tax ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                <div>
                  <Label className="text-gray-400 text-xs">Issue Date *</Label>
                  <DateInput
                    className="input-premium mt-1"
                    value={form.issue_date}
                    onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
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
                {!form.per_item_tax && (
                  <div>
                    <Label className="text-gray-400 text-xs">Tax Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      className="input-premium mt-1"
                      value={form.tax_rate}
                      onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}
                <div>
                  <Label className="text-gray-400 text-xs">Overall Discount (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="input-premium mt-1"
                    value={form.discount_amount}
                    onChange={(e) => setForm({ ...form, discount_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-xs">
                    Buyer State <span className="text-gold-400">(for GST auto-calculation)</span>
                  </Label>
                  <select
                    className="input-premium mt-1 w-full"
                    value={form.buyer_state}
                    onChange={(e) => setForm({ ...form, buyer_state: e.target.value })}
                  >
                    <option value="">Select buyer state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-white/20 bg-white/5 text-gold-500 focus:ring-gold-500/40"
                  checked={form.per_item_tax}
                  onChange={(e) => setForm({ ...form, per_item_tax: e.target.checked })}
                />
                Separate tax per item
              </label>

              <div className="flex flex-wrap gap-2">
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
                <button
                  type="button"
                  onClick={() => {
                    setShowItemDiscount(!showItemDiscount);
                    savePref('itemDisc', !showItemDiscount);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${showItemDiscount ? 'border-gold-500/40 text-gold-400 bg-gold-500/10' : 'border-white/10 text-gray-500 hover:text-gray-300'}`}
                >
                  {showItemDiscount ? '✓' : '+'} Per-Item Discount
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomFields(!showCustomFields);
                    if (!showCustomFields && form.custom_fields.length === 0) addCustomField();
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${showCustomFields ? 'border-gold-500/40 text-gold-400 bg-gold-500/10' : 'border-white/10 text-gray-500 hover:text-gray-300'}`}
                >
                  {showCustomFields ? '✓' : '+'} Custom Fields (Veh No, Job No etc.)
                </button>
              </div>

              {showCustomFields && (
                <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Custom Fields</p>
                    <button type="button" onClick={addCustomField} className="text-xs text-gold-400 hover:text-gold-300">
                      + Add Field
                    </button>
                  </div>
                  {form.custom_fields.map((cf, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                      <div className="col-span-2">
                        <Input
                          placeholder="Label (e.g. Veh No)"
                          className="input-premium text-xs"
                          value={cf.label}
                          onChange={(e) => updateCustomField(idx, 'label', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          placeholder="Value (e.g. UK07AX4657)"
                          className="input-premium text-xs"
                          value={cf.value}
                          onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                        />
                      </div>
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => removeCustomField(idx)}
                          className="text-rose-400/50 hover:text-rose-400 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-400 text-xs">Line Items *</Label>
                  <button type="button" onClick={addItem} className="text-xs text-gold-400 hover:text-gold-300">
                    + Add Item
                  </button>
                </div>
                <div className="grid gap-x-1 gap-y-2 text-[10px] text-gray-600 uppercase tracking-wider px-1" style={lineGridStyle}>
                  <span>Sr</span>
                  <span>Description</span>
                  {showHSN && <span>HSN</span>}
                  <span>Qty</span>
                  <span>Rate</span>
                  {showItemDiscount && <span>Disc</span>}
                  {form.per_item_tax && <span>Tax%</span>}
                  <span>Amt</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid gap-x-1 gap-y-2 items-center" style={lineGridStyle}>
                      <span className="text-xs text-gray-500 text-center pt-2">{idx + 1}</span>
                      <ProductSearch
                        value={item.description}
                        onChange={(val) => updateItem(idx, 'description', val)}
                        onSelect={(product) => {
                          const items = [...form.items];
                          items[idx] = {
                            ...items[idx],
                            product_id: product.id,
                            available_stock:
                              typeof product.current_stock === 'number'
                                ? product.current_stock
                                : Number(product.current_stock ?? 0),
                            minimum_stock:
                              typeof product.minimum_stock === 'number'
                                ? product.minimum_stock
                                : Number(product.minimum_stock ?? 0),
                            description: product.name,
                            unit_price: product.unit_price,
                            hsn_code: product.hsn_code || items[idx].hsn_code || '',
                            amount:
                              (items[idx].quantity * product.unit_price) - (items[idx].item_discount || 0),
                          };
                          setForm({ ...form, items: padInvoiceItemsTrailingBlank(items) });
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
                      {showItemDiscount && (
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="input-premium text-sm"
                          value={item.item_discount}
                          onChange={(e) => updateItem(idx, 'item_discount', e.target.value)}
                        />
                      )}
                      {form.per_item_tax && (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="%"
                          className="input-premium text-sm"
                          value={item.line_tax_rate}
                          onChange={(e) => updateItem(idx, 'line_tax_rate', parseFloat(e.target.value) || 0)}
                        />
                      )}
                      <div className="text-sm text-gold-400 font-semibold text-right pt-2">{fmt(item.amount)}</div>
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
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {(form.per_item_tax ? taxAmount > 0 : form.tax_rate > 0) && (
                  <div className="flex justify-between text-gray-400">
                    <span>Tax {form.per_item_tax ? '(per line)' : `(${form.tax_rate}%)`}</span>
                    <span>{fmt(taxAmount)}</span>
                  </div>
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
                  {creating ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>

          {showPreview ? (
            <div className="w-full xl:w-[40%] min-w-0 xl:sticky xl:top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d0d12] p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Preview</p>
              <div className="origin-top scale-[0.92] sm:scale-100">
                <InvoiceRenderer invoice={previewInvoice} items={previewItems} business={previewBusiness} />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={invoiceClosePrompt} onOpenChange={(o) => !o && setInvoiceClosePrompt(false)}>
        <DialogContent className="bg-void border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg">Save as draft or discard?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">Your invoice isn&apos;t finished. Choose what to do with it.</p>
          <DialogFooter className="gap-2 sm:gap-2">
            <button type="button" onClick={() => setInvoiceClosePrompt(false)} className="btn-premium btn-secondary">
              Keep editing
            </button>
            <button type="button" onClick={confirmDiscardAndBack} className="btn-premium border border-rose-500/30 text-rose-400 hover:bg-rose-500/10">
              Discard
            </button>
            <button
              type="button"
              onClick={confirmSaveDraftAndBack}
              disabled={!canSaveInvoiceDraft(form)}
              className="btn-premium btn-primary disabled:opacity-40 disabled:pointer-events-none"
            >
              Save draft
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
