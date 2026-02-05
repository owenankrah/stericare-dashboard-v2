import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, AlertTriangle, TrendingUp, TrendingDown, Search, Filter, Edit2, History, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * INVENTORY MANAGEMENT MODULE
 * Pharma-C Medical Supplies (SteriCare)
 * 
 * Features:
 * - Real-time stock levels
 * - Low stock alerts
 * - Stock adjustments
 * - Purchase orders
 * - Movement history
 * - Integration with Sales module
 */

const InventoryManagement = ({ darkMode, setDarkMode, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // View state
  const [activeView, setActiveView] = useState('stock'); // stock | movements | adjustments
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Modal state
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('Purchase');
  const [adjustmentBoxes, setAdjustmentBoxes] = useState(0);
  const [adjustmentUnits, setAdjustmentUnits] = useState(0);
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCurrentUser();
    loadData();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser({ ...user, profile });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Load inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select(`
          *,
          products (*)
        `)
        .order('updated_at', { ascending: false });

      if (inventoryError) throw inventoryError;
      setInventory(inventoryData || []);

      // Load recent movements
      const { data: movementsData, error: movementsError } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          products (name, sku)
        `)
        .order('movement_date', { ascending: false })
        .limit(100);

      if (movementsError) throw movementsError;
      setMovements(movementsData || []);

    } catch (error) {
      console.error('Error loading inventory data:', error);
      alert('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stock metrics
  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const stockedProducts = inventory.length;
    const lowStockProducts = inventory.filter(item => 
      item.units_in_stock <= item.reorder_level
    ).length;
    const outOfStock = inventory.filter(item => item.units_in_stock === 0).length;
    
    const totalValue = inventory.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      return sum + (item.units_in_stock * (product?.cost_per_unit || 0));
    }, 0);

    return {
      totalProducts,
      stockedProducts,
      lowStockProducts,
      outOfStock,
      totalValue
    };
  }, [inventory, products]);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const product = item.products;
      if (!product) return false;

      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = filterCategory === 'All' || product.category === filterCategory;
      
      const matchesLowStock = !showLowStockOnly || item.units_in_stock <= item.reorder_level;

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [inventory, searchTerm, filterCategory, showLowStockOnly]);

  // Categories for filter
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [products]);

  // Handle stock adjustment
  const handleAdjustment = async () => {
    if (!selectedProduct) return;
    if (adjustmentBoxes === 0 && adjustmentUnits === 0) {
      alert('Please enter boxes or units to adjust');
      return;
    }

    setSaving(true);
    try {
      const product = products.find(p => p.id === selectedProduct.product_id);
      const totalUnits = (adjustmentBoxes * product.units_per_box) + adjustmentUnits;
      
      // Get current inventory
      const currentInventory = inventory.find(i => i.product_id === selectedProduct.product_id);
      const currentUnits = currentInventory?.units_in_stock || 0;
      const currentBoxes = currentInventory?.boxes_in_stock || 0;

      // Calculate new stock levels
      let newUnits, newBoxes;
      if (adjustmentType === 'Purchase' || adjustmentType === 'Return') {
        newUnits = currentUnits + totalUnits;
        newBoxes = currentBoxes + adjustmentBoxes;
      } else {
        newUnits = Math.max(0, currentUnits - totalUnits);
        newBoxes = Math.max(0, currentBoxes - adjustmentBoxes);
      }

      // Update inventory
      if (currentInventory) {
        const { error: updateError } = await supabase
          .from('inventory')
          .update({
            units_in_stock: newUnits,
            boxes_in_stock: newBoxes,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentInventory.id);

        if (updateError) throw updateError;
      } else {
        // Create new inventory record
        const { error: insertError } = await supabase
          .from('inventory')
          .insert({
            product_id: selectedProduct.product_id,
            units_in_stock: newUnits,
            boxes_in_stock: newBoxes,
            reorder_level: 100 // Default
          });

        if (insertError) throw insertError;
      }

      // Record movement
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: selectedProduct.product_id,
          movement_type: adjustmentType,
          units_changed: adjustmentType === 'Purchase' || adjustmentType === 'Return' ? totalUnits : -totalUnits,
          boxes_changed: adjustmentType === 'Purchase' || adjustmentType === 'Return' ? adjustmentBoxes : -adjustmentBoxes,
          units_after: newUnits,
          boxes_after: newBoxes,
          notes: adjustmentNotes
        });

      if (movementError) throw movementError;

      alert('✅ Stock adjusted successfully!');
      setShowAdjustmentModal(false);
      resetAdjustmentForm();
      loadData();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Failed to adjust stock: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetAdjustmentForm = () => {
    setSelectedProduct(null);
    setAdjustmentType('Purchase');
    setAdjustmentBoxes(0);
    setAdjustmentUnits(0);
    setAdjustmentNotes('');
  };

  const openAdjustmentModal = (item) => {
    setSelectedProduct(item);
    setShowAdjustmentModal(true);
  };

  const getStockStatus = (item) => {
    if (item.units_in_stock === 0) return { label: 'Out of Stock', color: 'red' };
    if (item.units_in_stock <= item.reorder_level) return { label: 'Low Stock', color: 'orange' };
    return { label: 'In Stock', color: 'green' };
  };

  const exportToCSV = () => {
    const headers = ['SKU', 'Product', 'Category', 'Units in Stock', 'Boxes in Stock', 'Reorder Level', 'Status', 'Warehouse Location'];
    const rows = filteredInventory.map(item => [
      item.products.sku,
      item.products.name,
      item.products.category || '',
      item.units_in_stock,
      item.boxes_in_stock,
      item.reorder_level,
      getStockStatus(item).label,
      item.warehouse_location || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className={`px-4 py-2 rounded-lg ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100'
                  } border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}
                >
                  ← Back
                </button>
              )}
              <div>
                <h1 className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Inventory Management
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {metrics.stockedProducts} products in stock
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              <Download size={20} />
              Export
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.totalProducts}</p>
                <p className="text-xs text-gray-500">Total Products</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.stockedProducts}</p>
                <p className="text-xs text-gray-500">In Stock</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <AlertTriangle size={20} className="text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.lowStockProducts}</p>
                <p className="text-xs text-gray-500">Low Stock</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <TrendingDown size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.outOfStock}</p>
                <p className="text-xs text-gray-500">Out of Stock</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div>
              <p className="text-2xl font-bold">₵{metrics.totalValue.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Value</p>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveView('stock')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeView === 'stock'
                ? 'bg-blue-600 text-white'
                : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'
            }`}
          >
            Stock Levels
          </button>
          <button
            onClick={() => setActiveView('movements')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeView === 'movements'
                ? 'bg-blue-600 text-white'
                : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'
            }`}
          >
            Movement History
          </button>
        </div>

        {/* Stock Levels View */}
        {activeView === 'stock' && (
          <>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="relative md:col-span-2">
                <Search size={20} className={`absolute left-3 top-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`px-4 py-3 rounded-lg border ${
                  darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border ${
                  showLowStockOnly
                    ? 'bg-orange-600 text-white border-orange-600'
                    : darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <Filter size={20} />
                Low Stock Only
              </button>
            </div>

            {/* Stock Table */}
            <div className={`rounded-xl overflow-hidden ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium">SKU</th>
                      <th className="px-4 py-3 text-right text-xs font-medium">Units</th>
                      <th className="px-4 py-3 text-right text-xs font-medium">Boxes</th>
                      <th className="px-4 py-3 text-right text-xs font-medium">Reorder Level</th>
                      <th className="px-4 py-3 text-center text-xs font-medium">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => {
                      const status = getStockStatus(item);
                      return (
                        <tr
                          key={item.id}
                          className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'}`}
                        >
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{item.products.name}</p>
                              <p className="text-xs text-gray-500">{item.products.category}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{item.products.sku}</td>
                          <td className="px-4 py-3 text-right font-semibold">{item.units_in_stock}</td>
                          <td className="px-4 py-3 text-right">{item.boxes_in_stock}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-500">{item.reorder_level}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              status.color === 'green' ? 'bg-green-100 text-green-800' :
                              status.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => openAdjustmentModal(item)}
                              className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                              title="Adjust Stock"
                            >
                              <Edit2 size={16} className="text-blue-600" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Movement History View */}
        {activeView === 'movements' && (
          <div className={`rounded-xl overflow-hidden ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium">Units Changed</th>
                    <th className="px-4 py-3 text-right text-xs font-medium">Units After</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr
                      key={movement.id}
                      className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                    >
                      <td className="px-4 py-3 text-sm">
                        {new Date(movement.movement_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{movement.products.name}</p>
                          <p className="text-xs text-gray-500">{movement.products.sku}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          movement.movement_type === 'Purchase' ? 'bg-green-100 text-green-800' :
                          movement.movement_type === 'Sale' ? 'bg-blue-100 text-blue-800' :
                          movement.movement_type === 'Return' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {movement.movement_type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${
                        movement.units_changed > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.units_changed > 0 ? '+' : ''}{movement.units_changed}
                      </td>
                      <td className="px-4 py-3 text-right">{movement.units_after}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{movement.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stock Adjustment Modal */}
        {showAdjustmentModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-md w-full rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
              <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Adjust Stock: {selectedProduct.products.name}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Movement Type
                  </label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="Purchase">Purchase (Add Stock)</option>
                    <option value="Adjustment">Adjustment (Add/Remove)</option>
                    <option value="Return">Return (Add Stock)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Boxes
                    </label>
                    <input
                      type="number"
                      value={adjustmentBoxes}
                      onChange={(e) => setAdjustmentBoxes(parseInt(e.target.value) || 0)}
                      min="0"
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Units
                    </label>
                    <input
                      type="number"
                      value={adjustmentUnits}
                      onChange={(e) => setAdjustmentUnits(parseInt(e.target.value) || 0)}
                      min="0"
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Notes
                  </label>
                  <textarea
                    value={adjustmentNotes}
                    onChange={(e) => setAdjustmentNotes(e.target.value)}
                    rows={3}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    placeholder="Reason for adjustment..."
                  />
                </div>

                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className="text-sm">
                    <strong>Current Stock:</strong> {selectedProduct.units_in_stock} units ({selectedProduct.boxes_in_stock} boxes)
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowAdjustmentModal(false); resetAdjustmentForm(); }}
                  className={`flex-1 px-4 py-2 rounded-lg ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustment}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save Adjustment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryManagement;
