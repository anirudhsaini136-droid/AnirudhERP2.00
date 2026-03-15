import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, FileText, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const PRODUCT_EMOJIS = {
  Electronics: '⚡', Clothing: '👗', Food: '🍎', Auto: '🚗', Tools: '🔧',
  Medicine: '💊', Books: '📚', Furniture: '🪑', Jewelry: '💎', Sports: '⚽',
  default: '📦'
};

function Toggle({ value, onChange, label, sublabel, color = 'gold' }) {
  const bg = value
    ? color === 'emerald' ? 'bg-emerald-500' : 'bg-gold-500'
    : 'bg-white/10';
  return (
    <div className="flex items-center gap-3 cursor-pointer" onClick={onChange}>
      <div className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${bg}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        {sublabel && <p className="text-[10px] text-gray-600 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [createInvoice, setCreateInvoice] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [notes, setNotes] = useState('');
  const [billing, setBilling] = useState(false);
  const [success, setSuccess] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const searchRef = useRef(null);

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (search) params.set('search', search);
      const res = await api.get(`/inventory/products?${params}`);
      setProducts(res.data.products || []);
    } catch (e) {}
  }, [api, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    api.get('/dashboard/settings')
      .then(r => setBusinessName(r.data?.business?.name || ''))
      .catch(() => {});
  }, [api]);

  const addToCart = (product) => {
    if (product.current_stock === 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) {
          toast.error(`Only ${product.current_stock} units available`);
          return prev;
        }
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        image_url: product.image_url,
        category: product.category,
        unit_price: product.unit_price,
        quantity: 1,
        max_stock: product.current_stock
      }];
    });
    toast.success(`${product.name} added`, { duration: 800 });
  };

  const updateQty = (product_id, delta) => {
    setCart(prev => prev.map(i => {
      if (i.product_id !== product_id) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > i.max_stock) { toast.error(`Only ${i.max_stock} available`); return i; }
      return { ...i, quantity: newQty };
    }).filter(Boolean));
  };

  const removeFromCart = (product_id) => {
    setCart(prev => prev.filter(i => i.product_id !== product_id));
  };

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discount;

  const openWhatsApp = (invoiceId, invoiceNumber, totalAmount, phone, custName, bizName) => {
    const invoiceUrl = `${window.location.origin}/finance/invoices/${invoiceId}`;
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const storeName = bizName || businessName || 'Our Store';

    const message = [
      `Hello ${custName || 'there'}!`,
      '',
      `Thank you for your recent purchase from *${storeName}*.`,
      '',
      `Here are your invoice details:`,
      '',
      `Invoice No: ${invoiceNumber || ''}`,
      `Amount: Rs. ${totalAmount}`,
      `Store: ${storeName}`,
      '',
      `View your invoice here:`,
      invoiceUrl,
      '',
      `For any queries, feel free to reach out.`,
      `We appreciate your business!`
    ].join('\n');

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
  };

  const handleBill = async () => {
    if (!clientName.trim()) { toast.error('Customer name is required'); return; }
    if (cart.length === 0) { toast.error('Add at least one product'); return; }
    if (sendWhatsApp && !clientPhone.trim()) { toast.error('Phone number is required to send on WhatsApp'); return; }

    setBilling(true);
    const savedName = clientName;
    const savedPhone = clientPhone;

    try {
      const res = await api.post('/inventory/bill', {
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })),
        create_invoice: createInvoice || sendWhatsApp,
        notes,
        discount_amount: discount,
        tax_rate: taxRate
      });

      setSuccess({ ...res.data, savedPhone, savedName });
      setCart([]);
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setDiscount(0);
      setNotes('');
      fetchProducts();

      if (sendWhatsApp && res.data.invoice_id) {
        setTimeout(() => {
          openWhatsApp(
            res.data.invoice_id,
            res.data.invoice_number,
            res.data.total_amount,
            savedPhone,
            savedName,
            businessName
          );
        }, 600);
      } else {
        toast.success('Bill created successfully!');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Billing failed');
    }
    setBilling(false);
  };

  if (success) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6 max-w-sm w-full px-4">
            <div
              className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/40"
              style={{ animation: 'scale-in 0.5s ease-out' }}
            >
              <CheckCircle size={48} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="font-display text-3xl text-white">Bill Created!</h2>
              <p className="text-gray-500 mt-2">Stock updated successfully</p>
            </div>
            <div className="glass-card rounded-2xl p-5 space-y-3 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Customer</span>
                <span className="text-white font-medium">{success.savedName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Billed</span>
                <span className="text-gold-400 font-bold text-lg">{fmt(success.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Items</span>
                <span className="text-white">{success.items_billed} products</span>
              </div>
              {success.invoice_number && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Invoice</span>
                  <span className="text-blue-400 font-mono">{success.invoice_number}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSuccess(null)} className="flex-1 btn-premium btn-primary">
                New Bill
              </button>
              {success.invoice_id && (
                <button
                  onClick={() => navigate(`/finance/invoices/${success.invoice_id}`)}
                  className="flex-1 btn-premium btn-secondary flex items-center justify-center gap-2"
                >
                  <FileText size={15} /> View Invoice
                </button>
              )}
            </div>

            {success.invoice_id && (
              <button
                onClick={() => openWhatsApp(
                  success.invoice_id,
                  success.invoice_number,
                  success.total_amount,
                  success.savedPhone,
                  success.savedName,
                  businessName
                )}
                className="w-full py-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2"
                style={{ background: 'rgba(37,211,102,0.1)', borderColor: 'rgba(37,211,102,0.3)', color: '#25d366' }}
              >
                <MessageCircle size={16} />
                Send Invoice on WhatsApp
              </button>
            )}

            <button onClick={() => navigate('/inventory')} className="text-sm text-gray-500 hover:text-gray-400">
              Back to Inventory
            </button>
          </div>
        </div>
        <style>{`@keyframes scale-in { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-full">

        {/* Left — Product picker */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/inventory')} className="text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-2xl text-white">Quick Billing</h1>
              <p className="text-sm text-gray-500">Select products to add to bill</p>
            </div>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-premium pl-9 text-sm h-10 w-full"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {products.map(product => {
              const inCart = cart.find(i => i.product_id === product.id);
              const isOut = product.current_stock === 0;
            
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={isOut}
                  className={`glass-card rounded-2xl p-3 text-left transition-all duration-200 relative group ${
                    isOut ? 'opacity-40 cursor-not-allowed' : 'hover:border-gold-500/30 hover:bg-white/[0.03] active:scale-95'
                  } ${inCart ? 'border-gold-500/30 bg-gold-500/5' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
                        {PRODUCT_EMOJIS[product.category] || PRODUCT_EMOJIS.default}
                      </div>
                    )}
                    {inCart && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-gold-500 rounded-full flex items-center justify-center text-[10px] font-bold text-black">
                        {inCart.quantity}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-white truncate">{product.name}</p>
                  <p className="text-xs text-gold-400 font-bold mt-0.5">{fmt(product.unit_price)}</p>
                  <p className={`text-[10px] mt-1 ${isOut ? 'text-rose-400' : product.current_stock <= product.minimum_stock ? 'text-amber-400' : 'text-gray-500'}`}>
                    {isOut ? 'Out of stock' : `${product.current_stock} left`}
                  </p>
                </button>
              );
            })}
            {products.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-500 text-sm">
                {search ? 'No products found' : 'No products in inventory'}
              </div>
            )}
          </div>
        </div>

        {/* Right — Bill panel */}
        <div className="w-full lg:w-96 space-y-4">
          <div className="glass-card rounded-2xl p-5 space-y-4 sticky top-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <ShoppingCart size={18} className="text-gold-400" />
              <h2 className="font-display text-lg text-white">Bill</h2>
              {cart.length > 0 && (
                <span className="ml-auto text-xs text-gray-500">{cart.length} item{cart.length > 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Customer info */}
            <div className="space-y-2">
              <Input
                className="input-premium text-sm"
                placeholder="Customer Name *"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
              />
              <Input
                className="input-premium text-sm"
                placeholder="Phone (for WhatsApp)"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
              />
              <Input
                className="input-premium text-sm"
                placeholder="Email (optional)"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
              />
            </div>

            {/* Cart items */}
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                Click products to add
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.product_id} className="flex items-center gap-2 py-2 border-b border-white/[0.03]">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{fmt(item.unit_price)} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.product_id, -1)} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white">
                        <Minus size={10} />
                      </button>
                      <span className="w-6 text-center text-sm text-white font-bold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product_id, 1)} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white">
                        <Plus size={10} />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gold-400 font-bold">{fmt(item.quantity * item.unit_price)}</p>
                      <button onClick={() => removeFromCart(item.product_id)} className="text-rose-400/50 hover:text-rose-400 mt-0.5">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Discount & Tax */}
            {cart.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-gray-500 text-[10px]">Discount (Rs.)</Label>
                  <Input type="number" min="0" className="input-premium mt-0.5 text-sm h-8" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label className="text-gray-500 text-[10px]">Tax (%)</Label>
                  <Input type="number" min="0" className="input-premium mt-0.5 text-sm h-8" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            )}

            {/* Totals */}
            {cart.length > 0 && (
              <div className="space-y-1.5 border-t border-white/5 pt-3">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Tax ({taxRate}%)</span><span>{fmt(taxAmount)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-xs text-rose-400">
                    <span>Discount</span><span>-{fmt(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-1 border-t border-white/5">
                  <span className="text-white">Total</span>
                  <span className="text-gold-400 text-xl">{fmt(total)}</span>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-3 border-t border-white/5 pt-3">
              <Toggle
                value={createInvoice}
                onChange={() => setCreateInvoice(!createInvoice)}
                label="Create invoice record"
                sublabel="Save a formal invoice in Finance"
              />
              <Toggle
                value={sendWhatsApp}
                onChange={() => setSendWhatsApp(!sendWhatsApp)}
                label="Send on WhatsApp after billing"
                sublabel="Opens WhatsApp with invoice link (free)"
                color="emerald"
              />
              {sendWhatsApp && (
                <div
                  className="p-3 rounded-xl border flex items-start gap-2"
                  style={{ background: 'rgba(37,211,102,0.05)', borderColor: 'rgba(37,211,102,0.2)' }}
                >
                  <MessageCircle size={13} className="mt-0.5 shrink-0" style={{ color: '#25d366' }} />
                  <p className="text-[11px] leading-relaxed" style={{ color: '#86efac' }}>
                    WhatsApp will open with invoice link for{' '}
                    <span className="font-bold">{clientPhone || 'customer'}</span>.
                    Message sent from your phone — completely free.
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <Input
              className="input-premium text-sm"
              placeholder="Notes (optional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />

            {/* Bill button */}
            <button
              onClick={handleBill}
              disabled={billing || cart.length === 0 || !clientName.trim()}
              className="w-full btn-premium btn-primary py-3 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {billing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {sendWhatsApp ? 'Creating Bill...' : 'Processing...'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {sendWhatsApp ? <MessageCircle size={16} /> : <CheckCircle size={16} />}
                  {sendWhatsApp ? `Bill + WhatsApp · ${fmt(total)}` : `Create Bill · ${fmt(total)}`}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
