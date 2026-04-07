import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

export default function POSPage() {
  const { api } = useAuth();
  const [products, setProducts] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [barcode, setBarcode] = React.useState('');
  const [cart, setCart] = React.useState([]);
  const [payMode, setPayMode] = React.useState('cash');
  const [customerName, setCustomerName] = React.useState('Walk-in Customer');
  const barcodeRef = React.useRef(null);

  const loadProducts = React.useCallback(async () => {
    const res = await api.get('/inventory/products', { params: { search, limit: 100 } });
    setProducts(res.data?.products || []);
  }, [api, search]);

  React.useEffect(() => { loadProducts().catch(() => {}); }, [loadProducts]);
  React.useEffect(() => { barcodeRef.current?.focus(); }, []);

  const addToCart = (p) => {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { id: p.id, name: p.name, price: Number(p.unit_price || 0), qty: 1 }];
    });
  };

  const scanBarcode = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const b = barcode.trim();
    if (!b) return;
    try {
      const res = await api.get(`/advanced/products/by-barcode/${encodeURIComponent(b)}`);
      addToCart(res.data.product);
      setBarcode('');
    } catch {
      toast.error('Barcode not found');
    }
  };

  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((x) => (x.id === id ? { ...x, qty: Math.max(1, x.qty + delta) } : x))
        .filter((x) => x.qty > 0),
    );
  };

  const printReceipt = () => {
    const html = `
      <html><head><title>Receipt</title></head><body style="font-family:Arial;padding:12px">
      <h3>NexaERP POS Receipt</h3>
      <p>Customer: ${customerName}</p>
      <table style="width:100%;border-collapse:collapse" border="1" cellpadding="6">
      <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
      ${cart.map((c) => `<tr><td>${c.name}</td><td>${c.qty}</td><td>${c.price.toFixed(2)}</td><td>${(c.qty * c.price).toFixed(2)}</td></tr>`).join('')}
      </table>
      <h2>Total: ${total.toFixed(2)}</h2>
      </body></html>`;
    const w = window.open('', '_blank', 'width=420,height=640');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const checkout = async () => {
    if (!cart.length) return;
    try {
      await api.post('/advanced/pos/checkout', {
        client_name: customerName || 'Walk-in Customer',
        payment_method: payMode,
        paid_amount: total,
        items: cart.map((c) => ({ product_id: c.id, description: c.name, quantity: c.qty, unit_price: c.price })),
      });
      toast.success('Invoice created and paid');
      printReceipt();
      setCart([]);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Checkout failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-[calc(100vh-8rem)] touch-manipulation">
        <div className="xl:col-span-2 glass-card rounded-2xl p-4 space-y-3 overflow-auto">
          <h1 className="font-display text-2xl text-white">POS Billing</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input className="input-premium h-12 text-base" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Input className="input-premium h-12 text-base" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <Input ref={barcodeRef} className="input-premium h-12 text-base" placeholder="Scan barcode and press Enter" value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={scanBarcode} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {products.map((p) => (
              <button key={p.id} onClick={() => addToCart(p)} className="min-h-[92px] rounded-xl border border-white/10 p-4 text-left hover:bg-white/[0.04] active:scale-[0.98]">
                <p className="text-base font-medium text-white truncate">{p.name}</p>
                <p className="text-sm text-gray-400 mt-1">{fmt(p.unit_price)}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 flex flex-col">
          <h2 className="text-white font-semibold mb-2">Cart</h2>
          <div className="flex-1 overflow-auto space-y-2">
            {cart.map((c) => (
              <div key={c.id} className="rounded-lg border border-white/10 p-3">
                <p className="text-base text-white">{c.name}</p>
                <div className="flex items-center justify-between text-sm text-gray-300 mt-1">
                  <span>{c.qty} x {fmt(c.price)}</span><span>{fmt(c.qty * c.price)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button className="btn-premium btn-secondary py-2 text-base" onClick={() => updateQty(c.id, -1)}>-</button>
                  <button className="btn-premium btn-secondary py-2 text-base">{c.qty}</button>
                  <button className="btn-premium btn-secondary py-2 text-base" onClick={() => updateQty(c.id, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-white/10">
            <p className="text-sm text-gray-400">Total</p>
            <p className="text-3xl text-gold-400 font-bold">{fmt(total)}</p>
            <div className="grid grid-cols-3 gap-2 my-3">
              {['cash', 'card', 'upi'].map((m) => (
                <button key={m} onClick={() => setPayMode(m)} className={`btn-premium py-3 text-sm ${payMode === m ? 'btn-primary' : 'btn-secondary'}`}>{m.toUpperCase()}</button>
              ))}
            </div>
            <button onClick={checkout} className="btn-premium btn-primary w-full py-3 text-base">Print Receipt & Pay</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
