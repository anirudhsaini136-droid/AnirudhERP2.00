import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Search, Package, AlertTriangle, TrendingUp, TrendingDown, Edit, Trash2, BarChart3, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const PRODUCT_TAX_OPTIONS = [0, 5, 12, 18, 28];

const CATEGORY_COLORS = [
  'from-violet-500/20 to-purple-500/20 border-violet-500/30',
  'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
  'from-amber-500/20 to-orange-500/20 border-amber-500/30',
  'from-rose-500/20 to-pink-500/20 border-rose-500/30',
  'from-indigo-500/20 to-blue-500/20 border-indigo-500/30',
];

const PRODUCT_EMOJIS = {
  Electronics: '⚡', Clothing: '👗', Food: '🍎', Auto: '🚗', Tools: '🔧',
  Medicine: '💊', Books: '📚', Furniture: '🪑', Jewelry: '💎', Sports: '⚽',
  default: '📦'
};

function AnimatedProductIcon({ category, name, size = 'lg' }) {
  const emoji = PRODUCT_EMOJIS[category] || PRODUCT_EMOJIS.default;
  const sizeClass = size === 'lg' ? 'w-16 h-16 text-3xl' : 'w-10 h-10 text-lg';
  const colors = CATEGORY_COLORS[Math.abs((category || 'default').charCodeAt(0)) % CATEGORY_COLORS.length];

  return (
    <div className={`${sizeClass} rounded-2xl bg-gradient-to-br ${colors} border flex items-center justify-center relative overflow-hidden`}
      style={{ animation: 'float 3s ease-in-out infinite' }}>
      <span className="relative z-10">{emoji}</span>
      <div className="absolute inset-0 bg-white/5 rounded-2xl" style={{ animation: 'shimmer 2s ease-in-out infinite' }} />
    </div>
  );
}

function StockBar({ current, minimum, maximum = null }) {
  const max = maximum || Math.max(minimum * 4, current * 1.5, 10);
  const pct = Math.min((current / max) * 100, 100);
  const isLow = current <= minimum;
  const isCritical = current === 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className={isCritical ? 'text-rose-400 font-bold' : isLow ? 'text-amber-400' : 'text-emerald-400'}>
          {isCritical ? '⚠ OUT OF STOCK' : isLow ? '⚡ LOW STOCK' : '✓ IN STOCK'}
        </span>
        <span className="text-gray-500">{current} units</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[10px] text-gray-600">Min: {minimum} units</div>
    </div>
  );
}

export default function InventoryPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showAdjustStock, setShowAdjustStock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  const [productForm, setProductForm] = useState({
    name: '', sku: '', category: '', description: '', unit_price: 0,
    cost_price: 0, current_stock: 0, minimum_stock: 5, unit_of_measure: 'pcs', image_url: '',
    hsn_code: '', tax_rate: 0, barcode: '',
  });

  const sellingPriceInclGst = useMemo(() => {
    const base = Number(productForm.unit_price) || 0;
    const tr = Number(productForm.tax_rate) || 0;
    return base + (base * tr) / 100;
  }, [productForm.unit_price, productForm.tax_rate]);

  const [adjustForm, setAdjustForm] = useState({
    quantity: 1, movement_type: 'stock_in', reference: '', notes: ''
  });

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/inventory');
      setData(res.data);
    } catch (e) {}
  }, [api]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search) params.set('search', search);
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (filterLowStock) params.set('low_stock', 'true');
      const res = await api.get(`/inventory/products?${params}`);
      setProducts(res.data.products || []);
      setTotal(res.data.total || 0);
      setCategories(res.data.categories || []);
    } catch (e) {
      toast.error('Failed to load products');
    }
    setLoading(false);
  }, [api, page, search, filterCategory, filterLowStock]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/inventory/products', productForm);
      toast.success('Product added successfully');
      setShowAddProduct(false);
      setProductForm({
        name: '', sku: '', category: '', description: '', unit_price: 0, cost_price: 0, current_stock: 0,
        minimum_stock: 5, unit_of_measure: 'pcs', image_url: '', hsn_code: '', tax_rate: 0, barcode: '',
      });
      fetchProducts();
      fetchDashboard();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to add product');
    }
    setSaving(false);
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/inventory/products/${selectedProduct.id}`, productForm);
      toast.success('Product updated');
      setShowEditProduct(false);
      fetchProducts();
      fetchDashboard();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update');
    }
    setSaving(false);
  };

  const openEdit = (product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name || '',
      sku: product.sku || '',
      category: product.category || '',
      description: product.description || '',
      unit_price: product.unit_price || 0,
      cost_price: product.cost_price || 0,
      current_stock: product.current_stock || 0,
      minimum_stock: product.minimum_stock || 5,
      unit_of_measure: product.unit_of_measure || 'pcs',
      image_url: product.image_url || '',
      hsn_code: product.hsn_code || '',
      tax_rate: Number(product.tax_rate ?? product.gst_rate ?? 0) || 0,
      barcode: product.barcode || '',
    });
    setShowEditProduct(true);
  };

  const openAdjust = (product) => {
    setSelectedProduct(product);
    setAdjustForm({ quantity: 1, movement_type: 'stock_in', reference: '', notes: '' });
    setShowAdjustStock(true);
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post(`/inventory/products/${selectedProduct.id}/adjust-stock`, adjustForm);
      toast.success(`Stock updated: ${res.data.previous_stock} → ${res.data.new_stock}`);
      setShowAdjustStock(false);
      fetchProducts();
      fetchDashboard();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to adjust stock');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this product?')) return;
    try {
      await api.delete(`/inventory/products/${id}`);
      toast.success('Product removed');
      fetchProducts();
      fetchDashboard();
    } catch (e) {
      toast.error('Failed to remove product');
    }
  };

  const stats = data?.stats || {};

  return (
    <DashboardLayout>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
        .low-stock-pulse { animation: pulse-glow 2s infinite; }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-white tracking-tight">Inventory</h1>
            <p className="text-sm text-gray-500 mt-1">{total} products · {fmt(stats.total_value)} total value</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/inventory/billing')}
              className="btn-premium text-sm flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 px-4 py-2 rounded-xl"
            >
              <ShoppingCart size={16} /> Quick Bill
            </button>
            <button onClick={() => setShowAddProduct(true)} className="btn-premium btn-primary text-sm flex items-center gap-2">
              <Plus size={16} /> Add Product
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Products', value: stats.total_products || 0, icon: Package, color: 'text-blue-400', bg: 'from-blue-500/10 to-blue-500/5' },
            { label: 'Low Stock Items', value: stats.low_stock_count || 0, icon: AlertTriangle, color: stats.low_stock_count > 0 ? 'text-amber-400' : 'text-gray-500', bg: stats.low_stock_count > 0 ? 'from-amber-500/10 to-amber-500/5' : 'from-white/5 to-white/0', urgent: stats.low_stock_count > 0 },
            { label: 'Inventory Value', value: fmt(stats.total_value), icon: TrendingUp, color: 'text-gold-400', bg: 'from-gold-500/10 to-gold-500/5' },
            { label: 'Potential Profit', value: fmt(stats.potential_profit), icon: BarChart3, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-500/5' },
          ].map((stat) => (
            <div key={stat.label} className={`glass-card rounded-2xl p-4 bg-gradient-to-br ${stat.bg} ${stat.urgent ? 'low-stock-pulse border border-amber-500/30' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{stat.label}</span>
                <stat.icon size={16} className={stat.color} />
              </div>
              <p className={`text-xl font-bold font-sans ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Low stock alert banner */}
        {stats.low_stock_count > 0 && (
          <div className="glass-card rounded-2xl p-4 bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/20 flex items-center gap-4">
            <AlertTriangle size={20} className="text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-amber-300 font-semibold">{stats.low_stock_count} item{stats.low_stock_count > 1 ? 's' : ''} running low on stock</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {(data?.low_stock_items || []).slice(0, 3).map(p => p.name).join(', ')}
                {stats.low_stock_count > 3 ? ` +${stats.low_stock_count - 3} more` : ''}
              </p>
            </div>
            <button onClick={() => setFilterLowStock(true)} className="text-xs text-amber-400 hover:text-amber-300 font-medium whitespace-nowrap">
              View All →
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search products, SKU, barcode..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-premium pl-9 text-sm h-10 w-full"
            />
          </div>
          <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} className="input-premium w-auto text-sm h-10">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => { setFilterLowStock(!filterLowStock); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${filterLowStock ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
          >
            {filterLowStock ? '⚡ Low Stock' : 'Low Stock'}
          </button>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-4 space-y-3 animate-pulse">
                <div className="w-16 h-16 bg-white/5 rounded-2xl" />
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="glass-card rounded-2xl p-16 text-center">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-400 text-lg font-display">No products yet</p>
            <p className="text-gray-600 text-sm mt-2">Add your first product to get started</p>
            <button onClick={() => setShowAddProduct(true)} className="btn-premium btn-primary mt-6">
              <Plus size={16} /> Add First Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => {
              const isLow = product.current_stock <= product.minimum_stock;
              const isOut = product.current_stock === 0;
              return (
                <div
                  key={product.id}
                  className={`glass-card rounded-2xl p-4 space-y-3 hover:border-white/20 transition-all duration-300 group relative overflow-hidden ${isOut ? 'border-rose-500/30' : isLow ? 'border-amber-500/20' : ''}`}
                >
                  {/* Background glow */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isOut ? 'bg-rose-500/3' : isLow ? 'bg-amber-500/3' : 'bg-gold-500/3'}`} />

                  {/* Image or animated icon */}
                  <div className="flex items-start justify-between relative z-10">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-2xl object-cover" />
                    ) : (
                      <AnimatedProductIcon category={product.category} name={product.name} />
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
                        <Edit size={12} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Product info */}
                  <div className="relative z-10">
                    <h3 className="text-sm font-semibold text-white truncate">{product.name}</h3>
                    {product.category && <p className="text-xs text-gray-500">{product.category}</p>}
                    {product.sku && <p className="text-[10px] text-gray-600 font-mono">{product.sku}</p>}
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-gold-400 font-bold text-sm">{fmt(product.unit_price)}</span>
                    {product.cost_price > 0 && (
                      <span className="text-[10px] text-emerald-500">
                        +{fmt(product.unit_price - product.cost_price)} margin
                      </span>
                    )}
                  </div>

                  {/* Stock bar */}
                  <div className="relative z-10">
                    <StockBar current={product.current_stock} minimum={product.minimum_stock} />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 relative z-10">
                    <button
                      onClick={() => openAdjust(product)}
                      className="flex-1 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-white/5 hover:border-white/10"
                    >
                      Adjust Stock
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 12 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{total} products total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-premium btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 12)} className="btn-premium btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="bg-void border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-xl">Add Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div>
              <Label className="text-gray-400 text-xs">Product Name *</Label>
              <Input className="input-premium mt-1" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required placeholder="e.g. iPhone 15 Pro" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Category</Label>
                <Input className="input-premium mt-1" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} placeholder="Electronics" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">SKU</Label>
                <Input className="input-premium mt-1" value={productForm.sku} onChange={e => setProductForm({...productForm, sku: e.target.value})} placeholder="Auto-generated" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Selling Price excl. GST (₹) *</Label>
                <Input type="number" min="0" step="0.01" className="input-premium mt-1" value={productForm.unit_price} onChange={e => setProductForm({...productForm, unit_price: parseFloat(e.target.value) || 0})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Cost Price (₹)</Label>
                <Input type="number" min="0" step="0.01" className="input-premium mt-1" value={productForm.cost_price} onChange={e => setProductForm({...productForm, cost_price: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">HSN Code</Label>
                <Input className="input-premium mt-1" value={productForm.hsn_code} onChange={(e) => setProductForm({ ...productForm, hsn_code: e.target.value })} placeholder="e.g. 8471" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Tax Rate (%)</Label>
                <select
                  className="input-premium mt-1 w-full h-10 rounded-md"
                  value={productForm.tax_rate}
                  onChange={(e) => setProductForm({ ...productForm, tax_rate: Number(e.target.value) })}
                >
                  {PRODUCT_TAX_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}%</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Barcode</Label>
              <Input className="input-premium mt-1" value={productForm.barcode} onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })} placeholder="Optional" />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Selling Price incl. GST (₹)</Label>
              <Input readOnly className="input-premium mt-1 bg-white/5 text-gray-200" value={sellingPriceInclGst.toFixed(2)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Initial Stock</Label>
                <Input type="number" min="0" className="input-premium mt-1" value={productForm.current_stock} onChange={e => setProductForm({...productForm, current_stock: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Min Stock Alert</Label>
                <Input type="number" min="0" className="input-premium mt-1" value={productForm.minimum_stock} onChange={e => setProductForm({...productForm, minimum_stock: parseInt(e.target.value) || 5})} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Unit</Label>
                <Input className="input-premium mt-1" value={productForm.unit_of_measure} onChange={e => setProductForm({...productForm, unit_of_measure: e.target.value})} placeholder="pcs" />
              </div>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Image URL (optional)</Label>
              <Input className="input-premium mt-1" value={productForm.image_url} onChange={e => setProductForm({...productForm, image_url: e.target.value})} placeholder="https://..." />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Description</Label>
              <textarea className="input-premium mt-1 h-16 resize-none w-full" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowAddProduct(false)} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-premium btn-primary">{saving ? 'Adding...' : 'Add Product'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={showEditProduct} onOpenChange={setShowEditProduct}>
        <DialogContent className="bg-void border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-xl">Edit Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditProduct} className="space-y-4">
            <div>
              <Label className="text-gray-400 text-xs">Product Name *</Label>
              <Input className="input-premium mt-1" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Category</Label>
                <Input className="input-premium mt-1" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">SKU</Label>
                <Input className="input-premium mt-1" value={productForm.sku} onChange={e => setProductForm({...productForm, sku: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Selling Price excl. GST (₹)</Label>
                <Input type="number" min="0" step="0.01" className="input-premium mt-1" value={productForm.unit_price} onChange={e => setProductForm({...productForm, unit_price: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Cost Price (₹)</Label>
                <Input type="number" min="0" step="0.01" className="input-premium mt-1" value={productForm.cost_price} onChange={e => setProductForm({...productForm, cost_price: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">HSN Code</Label>
                <Input className="input-premium mt-1" value={productForm.hsn_code} onChange={(e) => setProductForm({ ...productForm, hsn_code: e.target.value })} placeholder="e.g. 8471" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Tax Rate (%)</Label>
                <select
                  className="input-premium mt-1 w-full h-10 rounded-md"
                  value={productForm.tax_rate}
                  onChange={(e) => setProductForm({ ...productForm, tax_rate: Number(e.target.value) })}
                >
                  {PRODUCT_TAX_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}%</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Barcode</Label>
              <Input className="input-premium mt-1" value={productForm.barcode} onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })} placeholder="Optional" />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Selling Price incl. GST (₹)</Label>
              <Input readOnly className="input-premium mt-1 bg-white/5 text-gray-200" value={sellingPriceInclGst.toFixed(2)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Min Stock Alert</Label>
                <Input type="number" min="0" className="input-premium mt-1" value={productForm.minimum_stock} onChange={e => setProductForm({...productForm, minimum_stock: parseInt(e.target.value) || 5})} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Unit</Label>
                <Input className="input-premium mt-1" value={productForm.unit_of_measure} onChange={e => setProductForm({...productForm, unit_of_measure: e.target.value})} />
              </div>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Image URL</Label>
              <Input className="input-premium mt-1" value={productForm.image_url} onChange={e => setProductForm({...productForm, image_url: e.target.value})} placeholder="https://..." />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowEditProduct(false)} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-premium btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={showAdjustStock} onOpenChange={setShowAdjustStock}>
        <DialogContent className="bg-void border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-xl">Adjust Stock</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <AnimatedProductIcon category={selectedProduct.category} name={selectedProduct.name} size="sm" />
                )}
                <div>
                  <p className="text-sm text-white font-semibold">{selectedProduct.name}</p>
                  <p className="text-xs text-gray-500">Current stock: <span className="text-gold-400 font-bold">{selectedProduct.current_stock} {selectedProduct.unit_of_measure || 'units'}</span></p>
                </div>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Movement Type *</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[
                    { value: 'stock_in', label: 'Stock In', icon: '📥', color: 'emerald' },
                    { value: 'stock_out', label: 'Stock Out', icon: '📤', color: 'rose' },
                    { value: 'adjustment', label: 'Set To', icon: '⚖️', color: 'blue' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAdjustForm({...adjustForm, movement_type: opt.value})}
                      className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all text-center ${
                        adjustForm.movement_type === opt.value
                          ? opt.color === 'emerald' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : opt.color === 'rose' ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                          : 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                          : 'bg-white/5 border-white/10 text-gray-400'
                      }`}
                    >
                      <div>{opt.icon}</div>
                      <div>{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">
                  {adjustForm.movement_type === 'adjustment' ? 'Set stock to' : 'Quantity'} *
                </Label>
                <Input
                  type="number"
                  min="1"
                  className="input-premium mt-1 text-center text-lg font-bold"
                  value={adjustForm.quantity}
                  onChange={e => setAdjustForm({...adjustForm, quantity: parseInt(e.target.value) || 0})}
                  required
                />
                {adjustForm.movement_type !== 'adjustment' && (
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    New stock will be: <span className="text-gold-400 font-bold">
                      {adjustForm.movement_type === 'stock_in'
                        ? selectedProduct.current_stock + adjustForm.quantity
                        : Math.max(0, selectedProduct.current_stock - adjustForm.quantity)
                      }
                    </span> units
                  </p>
                )}
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Reference / Note</Label>
                <Input className="input-premium mt-1" value={adjustForm.reference} onChange={e => setAdjustForm({...adjustForm, reference: e.target.value})} placeholder="e.g. Purchase order #123" />
              </div>
              <DialogFooter>
                <button type="button" onClick={() => setShowAdjustStock(false)} className="btn-premium btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-premium btn-primary">{saving ? 'Updating...' : 'Update Stock'}</button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
