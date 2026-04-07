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

  const checkout = async () => {
    if (!cart.length) return;
    try {
      await api.post('/advanced/pos/checkout', {
        client_name: 'Walk-in Customer',
        payment_method: payMode,
        paid_amount: total,
        items: cart.map((c) => ({ product_id: c.id, description: c.name, quantity: c.qty, unit_price: c.price })),
      });
      toast.success('Invoice created and paid');
      setCart([]);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Checkout failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-[calc(100vh-8rem)]">
        <div className="xl:col-span-2 glass-card rounded-2xl p-4 space-y-3 overflow-auto">
          <h1 className="font-display text-2xl text-white">POS Billing</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input className="input-premium" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Input ref={barcodeRef} className="input-premium" placeholder="Scan barcode and press Enter" value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={scanBarcode} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {products.map((p) => (
              <button key={p.id} onClick={() => addToCart(p)} className="rounded-xl border border-white/10 p-3 text-left hover:bg-white/[0.04]">
                <p className="text-sm text-white truncate">{p.name}</p>
                <p className="text-xs text-gray-500">{fmt(p.unit_price)}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 flex flex-col">
          <h2 className="text-white font-semibold mb-2">Cart</h2>
          <div className="flex-1 overflow-auto space-y-2">
            {cart.map((c) => (
              <div key={c.id} className="rounded-lg border border-white/10 p-2">
                <p className="text-sm text-white">{c.name}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{c.qty} x {fmt(c.price)}</span><span>{fmt(c.qty * c.price)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-white/10">
            <p className="text-sm text-gray-400">Total</p>
            <p className="text-xl text-gold-400 font-bold">{fmt(total)}</p>
            <div className="grid grid-cols-3 gap-1 my-2">
              {['cash', 'card', 'upi'].map((m) => (
                <button key={m} onClick={() => setPayMode(m)} className={`btn-premium text-xs ${payMode === m ? 'btn-primary' : 'btn-secondary'}`}>{m.toUpperCase()}</button>
              ))}
            </div>
            <button onClick={checkout} className="btn-premium btn-primary w-full">Print Receipt & Pay</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
