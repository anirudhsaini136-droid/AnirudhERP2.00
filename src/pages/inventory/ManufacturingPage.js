import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

export default function ManufacturingPage() {
  const { api } = useAuth();
  const [products, setProducts] = React.useState([]);
  const [boms, setBoms] = React.useState([]);
  const [bomForm, setBomForm] = React.useState({ product_id: '', name: '', raw_product_id: '', qty_required: 1 });
  const [prodForm, setProdForm] = React.useState({ bom_id: '', finished_product_id: '', quantity: 1 });
  const load = React.useCallback(async () => {
    try {
      const [p, b] = await Promise.all([api.get('/inventory/products', { params: { limit: 200 } }), api.get('/advanced/manufacturing/bom')]);
      setProducts(p.data?.products || []);
      setBoms(b.data?.items || []);
    } catch { toast.error('Failed to load manufacturing data'); }
  }, [api]);
  React.useEffect(() => { load(); }, [load]);

  const createBom = async (e) => {
    e.preventDefault();
    try {
      await api.post('/advanced/manufacturing/bom', {
        product_id: bomForm.product_id,
        name: bomForm.name,
        items: [{ raw_product_id: bomForm.raw_product_id, quantity_required: Number(bomForm.qty_required) }],
      });
      toast.success('BOM created');
      load();
    } catch { toast.error('Failed to create BOM'); }
  };

  const produce = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post('/advanced/manufacturing/production', { ...prodForm, quantity: Number(prodForm.quantity) });
      toast.success(`Production completed (cost: ${r.data?.production_cost || 0})`);
      load();
    } catch (e2) { toast.error(e2?.response?.data?.detail || 'Failed production'); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-white">Manufacturing</h1>
        <form onSubmit={createBom} className="glass-card rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-2">
          <select className="input-premium" value={bomForm.product_id} onChange={(e) => setBomForm({ ...bomForm, product_id: e.target.value })}><option value="">Finished product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <Input className="input-premium" placeholder="BOM name" value={bomForm.name} onChange={(e) => setBomForm({ ...bomForm, name: e.target.value })} />
          <select className="input-premium" value={bomForm.raw_product_id} onChange={(e) => setBomForm({ ...bomForm, raw_product_id: e.target.value })}><option value="">Raw material</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <Input className="input-premium" type="number" value={bomForm.qty_required} onChange={(e) => setBomForm({ ...bomForm, qty_required: e.target.value })} />
          <button className="btn-premium btn-primary">Create BOM</button>
        </form>
        <form onSubmit={produce} className="glass-card rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-2">
          <select className="input-premium" value={prodForm.bom_id} onChange={(e) => setProdForm({ ...prodForm, bom_id: e.target.value })}><option value="">Select BOM</option>{boms.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <select className="input-premium" value={prodForm.finished_product_id} onChange={(e) => setProdForm({ ...prodForm, finished_product_id: e.target.value })}><option value="">Finished product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <Input className="input-premium" type="number" value={prodForm.quantity} onChange={(e) => setProdForm({ ...prodForm, quantity: e.target.value })} />
          <button className="btn-premium btn-primary">Run Production</button>
        </form>
      </div>
    </DashboardLayout>
  );
}
