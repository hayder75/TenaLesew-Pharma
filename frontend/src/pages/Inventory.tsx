import React, { useState } from 'react';
import Layout from '../components/Layout';
import { mockProducts, mockCategories, getCategoryIcon, type Product } from '../lib/mockData';
import { Package, Search, Plus, Edit, Trash2, AlertTriangle, Barcode, TrendingDown, Calendar, X, Filter } from 'lucide-react';

const Inventory: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || 
      product.barcode?.includes(search) ||
      product.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = mockProducts.filter(p => (p.minStock || 10) >= p.stock);
  const expiringSoon = mockProducts.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
  const outOfStock = mockProducts.filter(p => p.stock === 0);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
            <p className="text-gray-500 mt-1">Manage products, stock levels and categories</p>
          </div>
          <button onClick={() => setShowAddProduct(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2">
            <Plus className="w-5 h-5" />Add Product
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><Package className="w-6 h-6 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Products</p><p className="text-2xl font-bold">{mockProducts.length}</p></div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
            <div><p className="text-sm text-gray-500">Low Stock</p><p className="text-2xl font-bold text-red-600">{lowStockProducts.length}</p></div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center"><TrendingDown className="w-6 h-6 text-orange-600" /></div>
            <div><p className="text-sm text-gray-500">Out of Stock</p><p className="text-2xl font-bold text-orange-600">{outOfStock.length}</p></div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center"><Calendar className="w-6 h-6 text-yellow-600" /></div>
            <div><p className="text-sm text-gray-500">Expiring Soon</p><p className="text-2xl font-bold text-yellow-600">{expiringSoon.length}</p></div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setSelectedCategory('All')} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${selectedCategory === 'All' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            All Products ({mockProducts.length})
          </button>
          {mockCategories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap flex items-center gap-1 ${selectedCategory === cat.name ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <span>{getCategoryIcon(cat.name)}</span>{cat.name} ({cat.productCount})
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by name, barcode or category..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white">
                <option value="All">All Categories</option>
                {mockCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map(product => {
                  const isLowStock = (product.minStock || 10) >= product.stock;
                  const isOutOfStock = product.stock === 0;
                  const isExpiringSoon = product.expiryDate && new Date(product.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.supplier}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm font-mono text-gray-500"><Barcode className="w-3 h-3" />{product.barcode}</div>
                      </td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{getCategoryIcon(product.category)}{product.category}</span></td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${isOutOfStock ? 'bg-red-100 text-red-700' : isLowStock ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{product.minStock || 10}</td>
                      <td className="px-4 py-3 font-medium">${product.price.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {product.expiryDate ? (
                          <span className={`text-sm ${isExpiringSoon ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{product.expiryDate}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSelectedProduct(product)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                          <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Product Modal */}
        {showAddProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-lg">Add New Product</h2>
                <button onClick={() => setShowAddProduct(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="text-sm text-gray-500">Product Name</label><input type="text" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl" /></div>
                  <div><label className="text-sm text-gray-500">Barcode</label><input type="text" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl" /></div>
                  <div><label className="text-sm text-gray-500">Category</label><select className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl"><option>Select Category</option>{mockCategories.map(c => <option key={c.id}>{c.name}</option>)}</select></div>
                  <div><label className="text-sm text-gray-500">Price</label><input type="number" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl" /></div>
                  <div><label className="text-sm text-gray-500">Stock Quantity</label><input type="number" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl" /></div>
                  <div><label className="text-sm text-gray-500">Min Stock Level</label><input type="number" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl" /></div>
                  <div><label className="text-sm text-gray-500">Expiry Date</label><input type="date" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl" /></div>
                  <div className="col-span-2"><label className="text-sm text-gray-500">Supplier</label><input type="text" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl" /></div>
                </div>
              </div>
              <div className="p-4 border-t flex gap-3">
                <button onClick={() => setShowAddProduct(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={() => setShowAddProduct(false)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Save Product</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Product Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-lg">Edit Product</h2>
                <button onClick={() => setSelectedProduct(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="text-sm text-gray-500">Product Name</label><input type="text" defaultValue={selectedProduct.name} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl" /></div>
                  <div><label className="text-sm text-gray-500">Barcode</label><input type="text" defaultValue={selectedProduct.barcode} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl" /></div>
                  <div><label className="text-sm text-gray-500">Price</label><input type="number" defaultValue={selectedProduct.price} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl" /></div>
                  <div><label className="text-sm text-gray-500">Stock</label><input type="number" defaultValue={selectedProduct.stock} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl" /></div>
                  <div><label className="text-sm text-gray-500">Min Stock</label><input type="number" defaultValue={selectedProduct.minStock} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl" /></div>
                </div>
              </div>
              <div className="p-4 border-t flex gap-3">
                <button onClick={() => setSelectedProduct(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={() => setSelectedProduct(null)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Inventory;