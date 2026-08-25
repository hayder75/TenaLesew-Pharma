import React, { useState } from 'react';
import Layout from '../components/Layout';
import { mockProducts, mockCategories, getCategoryIcon, type Product } from '../lib/mockData';
import { Modal, PageHeader, StatCard, Chip, EmptyState, Th, Td } from '../components/ui';
import { Package, Search, Plus, Edit, Trash2, AlertTriangle, Barcode, TrendingDown, Calendar, Filter } from 'lucide-react';

const EXPIRY_CUTOFF = Date.now() + 90 * 24 * 60 * 60 * 1000;

const Inventory: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.barcode?.includes(search) ||
      product.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = mockProducts.filter((p) => (p.minStock || 10) >= p.stock);
  const expiringSoon = mockProducts.filter((p) => p.expiryDate && new Date(p.expiryDate) < new Date(EXPIRY_CUTOFF));
  const outOfStock = mockProducts.filter((p) => p.stock === 0);

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Inventory"
          subtitle="Manage products, stock levels and categories"
          actions={
            <button onClick={() => setShowAddProduct(true)} className="btn btn-dark">
              <Plus className="w-5 h-5" />Add Product
            </button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Total Products" value={mockProducts.length} icon={Package} tone="sky" />
          <StatCard label="Low Stock" value={lowStockProducts.length} icon={AlertTriangle} tone="blush" />
          <StatCard label="Out of Stock" value={outOfStock.length} icon={TrendingDown} tone="sun" />
          <StatCard label="Expiring Soon" value={expiringSoon.length} icon={Calendar} tone="lav" />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'All' ? 'bg-ink text-white shadow-card' : 'bg-white border border-line text-stone-500 hover:border-lime'
            }`}
          >
            All Products ({mockProducts.length})
          </button>
          {mockCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                selectedCategory === cat.name ? 'bg-ink text-white shadow-card' : 'bg-white border border-line text-stone-500 hover:border-lime'
              }`}
            >
              <span>{getCategoryIcon(cat.name)}</span>
              {cat.name} ({cat.productCount})
            </button>
          ))}
        </div>

        {/* Search & filter */}
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input type="text" placeholder="Search by name, barcode or category..." value={search} onChange={(e) => setSearch(e.target.value)} className="input !pl-10" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-stone-400 shrink-0" />
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="input">
                <option value="All">All Categories</option>
                {mockCategories.map((cat) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Products table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cream-soft border-b border-line">
                <tr>
                  <Th>Product</Th>
                  <Th>Barcode</Th>
                  <Th>Category</Th>
                  <Th>Stock</Th>
                  <Th>Min Stock</Th>
                  <Th>Price</Th>
                  <Th>Expiry</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-deep/70">
                {filteredProducts.map((product) => {
                  const isLowStock = (product.minStock || 10) >= product.stock;
                  const isOutOfStock = product.stock === 0;
                  const isExpiringSoon = product.expiryDate && new Date(product.expiryDate) < new Date(EXPIRY_CUTOFF);

                  return (
                    <tr key={product.id} className="hover:bg-cream-soft">
                      <Td>
                        <div className="font-bold text-ink">{product.name}</div>
                        <div className="text-xs text-stone-400">{product.supplier}</div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1 text-xs font-mono text-stone-400"><Barcode className="w-3 h-3" />{product.barcode}</div>
                      </Td>
                      <Td><Chip tone="neutral">{getCategoryIcon(product.category)}{product.category}</Chip></Td>
                      <Td>
                        <Chip tone={isOutOfStock ? 'blush' : isLowStock ? 'sun' : 'mint'}>{product.stock}</Chip>
                      </Td>
                      <Td className="text-stone-400">{product.minStock || 10}</Td>
                      <Td className="font-bold text-ink">${product.price.toFixed(2)}</Td>
                      <Td>
                        {product.expiryDate ? (
                          <span className={`text-xs font-semibold ${isExpiringSoon ? 'text-[#a34141]' : 'text-stone-400'}`}>{product.expiryDate}</span>
                        ) : '—'}
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSelectedProduct(product)} className="p-2 text-stone-400 hover:text-ink hover:bg-lime-soft rounded-full"><Edit className="w-4 h-4" /></button>
                          <button className="p-2 text-stone-400 hover:text-[#a34141] hover:bg-blush-soft rounded-full"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredProducts.length === 0 && <EmptyState icon={Package} title="No products found" />}
          </div>
        </div>

        {/* Add product modal */}
        <Modal
          open={showAddProduct}
          onClose={() => setShowAddProduct(false)}
          title="Add New Product"
          maxWidth="max-w-lg"
          footer={
            <>
              <button onClick={() => setShowAddProduct(false)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => setShowAddProduct(false)} className="btn btn-dark flex-1">Save Product</button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-xs font-bold uppercase tracking-wider text-stone-400">Product Name</label><input type="text" className="input mt-1" /></div>
            <div><label className="text-xs font-bold uppercase tracking-wider text-stone-400">Barcode</label><input type="text" className="input mt-1" /></div>
            <div><label className="text-xs font-bold uppercase tracking-wider text-stone-400">Category</label><select className="input mt-1"><option>Select Category</option>{mockCategories.map((c) => <option key={c.id}>{c.name}</option>)}</select></div>
            <div><label className="text-xs font-bold uppercase tracking-wider text-stone-400">Price</label><input type="number" className="input mt-1" /></div>
            <div><label className="text-xs font-bold uppercase tracking-wider text-stone-400">Stock Quantity</label><input type="number" className="input mt-1" /></div>
            <div><label className="text-xs font-bold uppercase tracking-wider text-stone-400">Min Stock Level</label><input type="number" className="input mt-1" /></div>
            <div><label className="text-xs font-bold uppercase tracking-wider text-stone-400">Expiry Date</label><input type="date" className="input mt-1" /></div>
            <div className="col-span-2"><label className="text-xs font-bold uppercase tracking-wider text-stone-400">Supplier</label><input type="text" className="input mt-1" /></div>
          </div>
        </Modal>

        {/* Edit product modal */}
        <Modal
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          title="Edit Product"
          maxWidth="max-w-lg"
          footer={
            <>
              <button onClick={() => setSelectedProduct(null)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => setSelectedProduct(null)} className="btn btn-dark flex-1">Save Changes</button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-xs font-bold uppercase tracking-wider text-stone-400">Product Name</label><input type="text" defaultValue={selectedProduct?.name} className="input mt-1" /></div>
            <div><label className="text-xs font-bold uppercase tracking-wider text-stone-400">Barcode</label><input type="text" defaultValue={selectedProduct?.barcode} className="input mt-1" /></div>
            <div><label className="text-xs font-bold uppercase tracking-wider text-stone-400">Price</label><input type="number" defaultValue={selectedProduct?.price} className="input mt-1" /></div>
            <div><label className="text-xs font-bold uppercase tracking-wider text-stone-400">Stock</label><input type="number" defaultValue={selectedProduct?.stock} className="input mt-1" /></div>
            <div><label className="text-xs font-bold uppercase tracking-wider text-stone-400">Min Stock</label><input type="number" defaultValue={selectedProduct?.minStock} className="input mt-1" /></div>
            <div><label className="text-xs font-bold uppercase tracking-wider text-stone-400">Expiry Date</label><input type="date" defaultValue={selectedProduct?.expiryDate} className="input mt-1" /></div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default Inventory;
