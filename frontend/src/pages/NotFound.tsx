import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Compass } from 'lucide-react';
import { Cross } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="card p-12 text-center max-w-lg">
        <div className="w-16 h-16 bg-ink rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Cross className="w-7 h-7 text-lime" strokeWidth={2.75} />
        </div>
        <h1 className="text-6xl font-extrabold tracking-tight text-ink">
          4<span className="bg-lime px-2 rounded-xl">0</span>4
        </h1>
        <p className="text-lg font-bold text-ink mt-3">Page not found</p>
        <p className="text-sm text-stone-400 mt-1 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/dashboard" className="btn btn-dark"><LayoutDashboard className="w-4 h-4" />Dashboard</Link>
          <Link to="/pos" className="btn btn-lime"><ShoppingCart className="w-4 h-4" />POS</Link>
          <Link to="/inventory" className="btn btn-ghost"><Package className="w-4 h-4" />Inventory</Link>
        </div>
        <p className="text-xs text-stone-400 mt-8 flex items-center justify-center gap-1.5">
          <Compass className="w-3.5 h-3.5" />
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
