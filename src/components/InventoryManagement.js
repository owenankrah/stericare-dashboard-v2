import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, AlertTriangle, TrendingUp, TrendingDown, Search, 
  Edit2, History, Download, BarChart3, RefreshCw, X, Bell, 
  Activity, DollarSign, Boxes, CheckCircle, XCircle, Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  getInventoryReport, 
  getInventoryAnalytics, 
  exportInventoryCSV, 
  getLowStockAlerts,
  downloadBlob 
} from '../lib/api';

/**
 * INVENTORY MANAGEMENT MODULE - ENHANCED
 * Full-featured inventory with backend analytics integration
 */

const InventoryManagement = ({ darkMode, onBack }) => {
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
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Adjustment form
  const [adjustmentType, setAdjustmentType] = useState('Purchase');
  const [adjustmentBoxes, setAdjustmentBoxes] = useState(0);
  const [adjustmentUnits, setAdjustmentUnits] = useState(0);
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Analytics data
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    recentMovements: 0
  });

  useEffect(() => {
    getCurrentUser();
    loadData();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [inventory]);

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

      // Load inventory with product details
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

  const calculateStats = () => {
    const totalValue = inventory.reduce((sum, item) => {
      const unitPrice = item.products?.unit_price || 0;
      const totalUnits = (item.boxes_in_stock * item.units_per_box) + item.loose_units_in_stock;
      return sum + (unitPrice * totalUnits);
    }, 0);

    const lowStock = inventory.filter(item => {
      const totalUnits = (item.boxes_in_stock * item.units_per_box) + item.loose_units_in_stock;
      const reorderLevel = item.products?.reorder_level || 0;
      return totalUnits > 0 && totalUnits <= reorderLevel;
    }).length;

    const outOfStock = inventory.filter(item => 
      item.boxes_in_stock === 0 && item.loose_units_in_stock === 0
    ).length;

    // Recent movements (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentMovements = movements.filter(m => 
      new Date(m.movement_date) >= yesterday
    ).length;

    setStats({
      totalItems: inventory.length,
      totalValue,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      recentMovements
    });
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const result = await getInventoryAnalytics();
      if (result.success) {
        setAnalytics(result.data.analytics);
        setShowAnalyticsModal(true);
      } else {
        alert('❌ Failed to load analytics: ' + result.message);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      alert('❌ Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadAlerts = async () => {
    setAlertsLoading(true);
    try {
      const result = await getLowStockAlerts();
      if (result.success) {
        setAlerts(result.data.alerts);
        setShowAlertsModal(true);
      } else {
        alert('❌ Failed to load alerts: ' + result.message);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      alert('❌ Failed to load alerts');
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const result = await exportInventoryCSV();
      if (result.success) {
        downloadBlob(result.blob, `inventory-${new Date().toISOString().split('T')[0]}.csv`);
        alert('✅ Inventory exported successfully!');
      } else {
        alert('❌ Failed to export: ' + result.message);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Export failed');
    }
  };

  const openAdjustmentModal = (item) => {
    setSelectedProduct(item);
    setAdjustmentType('Purchase');
    setAdjustmentBoxes(0);
    setAdjustmentUnits(0);
    setAdjustmentNotes('');
    setShowAdjustmentModal(true);
  };

  const handleStockAdjustment = async (e) => {
    e.preventDefault();

    if (adjustmentBoxes === 0 && adjustmentUnits === 0) {
      alert('Please enter boxes or units to adjust');
      return;
    }

    setSaving(true);
    try {
      const totalUnitsAdjustment = (adjustmentBoxes * selectedProduct.units_per_box) + adjustmentUnits;
      
      // Determine movement direction
      const isIncrease = adjustmentType === 'Purchase' || adjustmentType === 'Adjustment In';
      const finalBoxes = isIncrease ? adjustmentBoxes : -adjustmentBoxes;
      const finalUnits = isIncrease ? adjustmentUnits : -adjustmentUnits;

      // Calculate new stock levels
      let newBoxes = selectedProduct.boxes_in_stock + finalBoxes;
      let newLooseUnits = selectedProduct.loose_units_in_stock + finalUnits;

      // Handle unit overflow/underflow
      if (newLooseUnits >= selectedProduct.units_per_box) {
        newBoxes += Math.floor(newLooseUnits / selectedProduct.units_per_box);
        newLooseUnits = newLooseUnits % selectedProduct.units_per_box;
      } else if (newLooseUnits < 0 && newBoxes > 0) {
        newBoxes -= 1;
        newLooseUnits += selectedProduct.units_per_box;
      }

      // Prevent negative stock
      if (newBoxes < 0 || (newBoxes === 0 && newLooseUnits < 0)) {
        alert('❌ Insufficient stock for this adjustment');
        setSaving(false);
        return;
      }

      // Update inventory
      const { error: updateError } = await supabase
        .from('inventory')
        .update({
          boxes_in_stock: newBoxes,
          loose_units_in_stock: newLooseUnits,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProduct.id);

      if (updateError) throw updateError;

      // Record movement
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert([{
          product_id: selectedProduct.product_id,
          movement_type: adjustmentType,
          boxes_moved: Math.abs(adjustmentBoxes),
          units_per_box: selectedProduct.units_per_box,
          loose_units_moved: Math.abs(adjustmentUnits),
          movement_date: new Date().toISOString(),
          notes: adjustmentNotes,
          user_id: currentUser?.id
        }]);

      if (movementError) throw movementError;

      // Reload data
      await loadData();
      setShowAdjustmentModal(false);
      alert('✅ Stock adjusted successfully!');

    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('❌ Failed to adjust stock: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Get unique categories
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  // Apply filters
  const filteredInventory = inventory.filter(item => {
    const product = item.products;
    if (!product) return false;

    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'All' || product.category === filterCategory;
    
    const totalUnits = (item.boxes_in_stock * item.units_per_box) + item.loose_units_in_stock;
    const isLowStock = totalUnits <= (product.reorder_level || 0);
    const matchesLowStock = !showLowStockOnly || isLowStock;

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className={`px-4 py-2 rounded-lg transition-colors ${
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
                  Track stock levels and movements
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={loadAlerts}
                disabled={alertsLoading}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100'
                } border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}
              >
                {alertsLoading ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <Bell size={20} />
                )}
                <span className="hidden sm:inline">Alerts</span>
                {(stats.lowStockCount + stats.outOfStockCount) > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                    {stats.lowStockCount + stats.outOfStockCount}
                  </span>
                )}
              </button>

              <button
                onClick={loadAnalytics}
                disabled={analyticsLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100'
                } border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}
              >
                {analyticsLoading ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <BarChart3 size={20} />
                )}
                <span className="hidden sm:inline">Analytics</span>
              </button>

              <button
                onClick={handleExportCSV}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100'
                } border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}
              >
                <Download size={20} />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="Total Items"
            value={stats.totalItems}
            icon={Package}
            color="blue"
            darkMode={darkMode}
          />
          <StatCard
            title="Total Value"
            value={`₵${stats.totalValue.toLocaleString()}`}
            icon={DollarSign}
            color="green"
            darkMode={darkMode}
          />
          <StatCard
            title="Low Stock"
            value={stats.lowStockCount}
            icon={AlertTriangle}
            color="orange"
            darkMode={darkMode}
            alert={stats.lowStockCount > 0}
          />
          <StatCard
            title="Out of Stock"
            value={stats.outOfStockCount}
            icon={XCircle}
            color="red"
            darkMode={darkMode}
            alert={stats.outOfStockCount > 0}
          />
          <StatCard
            title="Recent Activity"
            value={`${stats.recentMovements} moves`}
            icon={Activity}
            color="purple"
            darkMode={darkMode}
          />
        </div>

        {/* View Tabs */}
        <div className={`flex gap-2 mb-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveView('stock')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeView === 'stock'
                ? `border-b-2 border-blue-600 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`
                : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Stock Levels
          </button>
          <button
            onClick={() => setActiveView('movements')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeView === 'movements'
                ? `border-b-2 border-blue-600 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`
                : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Movement History
          </button>
        </div>

        {activeView === 'stock' ? (
          <>
            {/* Search and Filters */}
            <div className={`p-4 rounded-lg mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search size={20} className={`absolute left-3 top-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500`}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Low Stock Filter */}
                <div>
                  <button
                    onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      showLowStockOnly
                        ? 'bg-orange-600 text-white border-orange-600'
                        : darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' 
                          : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {showLowStockOnly ? '✓ Low Stock Only' : 'Show Low Stock'}
                  </button>
                </div>
              </div>
            </div>

            {/* Inventory Grid */}
            {filteredInventory.length === 0 ? (
              <div className={`text-center py-12 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <Package size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {searchTerm || filterCategory !== 'All' || showLowStockOnly
                    ? 'No items match your filters'
                    : 'No inventory items yet'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInventory.map(item => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    darkMode={darkMode}
                    onAdjust={() => openAdjustmentModal(item)}
                  />
                ))}
              </div>
            )}

            {/* Results Count */}
            {filteredInventory.length > 0 && (
              <div className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} text-center`}>
                Showing {filteredInventory.length} of {inventory.length} items
              </div>
            )}
          </>
        ) : (
          <MovementHistory movements={movements} darkMode={darkMode} />
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && selectedProduct && (
        <StockAdjustmentModal
          darkMode={darkMode}
          product={selectedProduct}
          adjustmentType={adjustmentType}
          setAdjustmentType={setAdjustmentType}
          adjustmentBoxes={adjustmentBoxes}
          setAdjustmentBoxes={setAdjustmentBoxes}
          adjustmentUnits={adjustmentUnits}
          setAdjustmentUnits={setAdjustmentUnits}
          adjustmentNotes={adjustmentNotes}
          setAdjustmentNotes={setAdjustmentNotes}
          onSubmit={handleStockAdjustment}
          onClose={() => setShowAdjustmentModal(false)}
          saving={saving}
        />
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && analytics && (
        <AnalyticsModal
          darkMode={darkMode}
          analytics={analytics}
          onClose={() => setShowAnalyticsModal(false)}
        />
      )}

      {/* Alerts Modal */}
      {showAlertsModal && alerts && (
        <AlertsModal
          darkMode={darkMode}
          alerts={alerts}
          onClose={() => setShowAlertsModal(false)}
          onReorder={(product) => {
            setShowAlertsModal(false);
            const invItem = inventory.find(i => i.product_id === product.productId);
            if (invItem) openAdjustmentModal(invItem);
          }}
        />
      )}
    </div>
  );
};

// Statistics Card Component
const StatCard = ({ title, value, icon: Icon, color, darkMode, alert = false }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
  };

  return (
    <div className={`p-4 rounded-lg border ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } ${alert ? 'ring-2 ring-red-500' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
          <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

// Inventory Card Component
const InventoryCard = ({ item, darkMode, onAdjust }) => {
  const product = item.products;
  const totalUnits = (item.boxes_in_stock * item.units_per_box) + item.loose_units_in_stock;
  const reorderLevel = product?.reorder_level || 0;
  const unitPrice = product?.unit_price || 0;
  const totalValue = totalUnits * unitPrice;
  
  const isOutOfStock = totalUnits === 0;
  const isLowStock = !isOutOfStock && totalUnits <= reorderLevel;
  
  const statusColor = isOutOfStock ? 'red' : isLowStock ? 'orange' : 'green';
  const statusText = isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock';

  return (
    <div className={`p-4 rounded-lg border ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } hover:shadow-lg transition-shadow`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {product?.name || 'Unknown Product'}
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            SKU: {product?.sku || 'N/A'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-0.5 text-xs rounded ${
              product?.category
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}>
              {product?.category || 'Uncategorized'}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded ${
              statusColor === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
              statusColor === 'orange' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {statusText}
            </span>
          </div>
        </div>
      </div>

      {/* Stock Levels */}
      <div className={`py-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Boxes</p>
            <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {item.boxes_in_stock}
            </p>
          </div>
          <div>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loose Units</p>
            <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {item.loose_units_in_stock}
            </p>
          </div>
        </div>
        
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Total Units:</span>
            <span className={`font-semibold ${
              isOutOfStock || isLowStock ? 'text-red-600' : darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {totalUnits.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Reorder Level:</span>
            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
              {reorderLevel.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Total Value:</span>
            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              ₵{totalValue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Stock Level Bar */}
        {reorderLevel > 0 && (
          <div className="mt-3">
            <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div
                className={`h-full transition-all ${
                  isOutOfStock ? 'bg-red-600' :
                  isLowStock ? 'bg-orange-600' :
                  'bg-green-600'
                }`}
                style={{ width: `${Math.min((totalUnits / reorderLevel) * 100, 100)}%` }}
              />
            </div>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {totalUnits > 0 ? ((totalUnits / reorderLevel) * 100).toFixed(0) : 0}% of reorder level
            </p>
          </div>
        )}
      </div>

      <button
        onClick={onAdjust}
        className="w-full mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
      >
        <Edit2 size={16} />
        Adjust Stock
      </button>
    </div>
  );
};

// Stock Adjustment Modal Component
const StockAdjustmentModal = ({
  darkMode,
  product,
  adjustmentType,
  setAdjustmentType,
  adjustmentBoxes,
  setAdjustmentBoxes,
  adjustmentUnits,
  setAdjustmentUnits,
  adjustmentNotes,
  setAdjustmentNotes,
  onSubmit,
  onClose,
  saving
}) => {
  const productInfo = product.products;
  const totalUnitsChange = (adjustmentBoxes * product.units_per_box) + adjustmentUnits;
  const isIncrease = adjustmentType === 'Purchase' || adjustmentType === 'Adjustment In';
  const finalChange = isIncrease ? totalUnitsChange : -totalUnitsChange;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-2xl w-full rounded-xl shadow-2xl ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div>
            <h2 className="text-2xl font-bold">Stock Adjustment</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {productInfo?.name} ({productInfo?.sku})
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Current Stock Info */}
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
          <h3 className={`font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Current Stock
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Boxes</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {product.boxes_in_stock}
              </p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loose Units</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {product.loose_units_in_stock}
              </p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Units</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {(product.boxes_in_stock * product.units_per_box) + product.loose_units_in_stock}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-6">
          <div className="space-y-4">
            {/* Movement Type */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Movement Type *
              </label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500`}
              >
                <option value="Purchase">Purchase (Add Stock)</option>
                <option value="Sale">Sale (Remove Stock)</option>
                <option value="Adjustment In">Adjustment In (Add)</option>
                <option value="Adjustment Out">Adjustment Out (Remove)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Boxes */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Boxes
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustmentBoxes}
                  onChange={(e) => setAdjustmentBoxes(parseInt(e.target.value) || 0)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500`}
                  placeholder="0"
                />
              </div>

              {/* Loose Units */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Loose Units
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustmentUnits}
                  onChange={(e) => setAdjustmentUnits(parseInt(e.target.value) || 0)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500`}
                  placeholder="0"
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Units per box: {product.units_per_box}
                </p>
              </div>
            </div>

            {/* Summary */}
            {totalUnitsChange > 0 && (
              <div className={`p-4 rounded-lg ${
                isIncrease 
                  ? 'bg-green-100 border border-green-300 dark:bg-green-900 dark:border-green-700' 
                  : 'bg-red-100 border border-red-300 dark:bg-red-900 dark:border-red-700'
              }`}>
                <p className={`font-semibold ${
                  isIncrease ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                }`}>
                  {isIncrease ? '↑' : '↓'} {Math.abs(finalChange)} units ({adjustmentBoxes} boxes, {adjustmentUnits} loose)
                </p>
                <p className={`text-sm mt-1 ${
                  isIncrease ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                }`}>
                  New total: {(product.boxes_in_stock * product.units_per_box) + product.loose_units_in_stock + finalChange} units
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Notes
              </label>
              <textarea
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                rows="3"
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500`}
                placeholder="Optional notes about this adjustment..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || totalUnitsChange === 0}
              className={`px-6 py-2 rounded-lg font-medium text-white transition-colors ${
                saving || totalUnitsChange === 0
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? 'Saving...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Analytics Modal Component  
const AnalyticsModal = ({ darkMode, analytics, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-4xl w-full rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div>
            <h2 className="text-2xl font-bold">Inventory Analytics</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Real-time inventory insights
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Inventory Metrics */}
          <div className="mb-6">
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Inventory Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Total Items"
                value={analytics.inventoryMetrics.totalItems}
                darkMode={darkMode}
              />
              <MetricCard
                label="Total Value"
                value={`₵${parseFloat(analytics.inventoryMetrics.totalValue).toLocaleString()}`}
                darkMode={darkMode}
              />
              <MetricCard
                label="Low Stock"
                value={analytics.inventoryMetrics.lowStockCount}
                alert
                darkMode={darkMode}
              />
              <MetricCard
                label="Out of Stock"
                value={analytics.inventoryMetrics.outOfStockCount}
                alert
                darkMode={darkMode}
              />
            </div>
          </div>

          {/* Stock Health */}
          <div className="mb-6">
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Stock Health Distribution
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-green-900' : 'bg-green-100'}`}>
                <p className={`text-sm ${darkMode ? 'text-green-200' : 'text-green-700'}`}>Healthy</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-green-100' : 'text-green-900'}`}>
                  {analytics.stockHealth.healthy}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-orange-900' : 'bg-orange-100'}`}>
                <p className={`text-sm ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>Low Stock</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-orange-100' : 'text-orange-900'}`}>
                  {analytics.stockHealth.lowStock}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-red-900' : 'bg-red-100'}`}>
                <p className={`text-sm ${darkMode ? 'text-red-200' : 'text-red-700'}`}>Out of Stock</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-red-100' : 'text-red-900'}`}>
                  {analytics.stockHealth.outOfStock}
                </p>
              </div>
            </div>
          </div>

          {/* Daily Movements (Last 7 Days) */}
          <div className="mb-6">
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Daily Movements (Last 7 Days)
            </h3>
            <div className={`overflow-x-auto rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <table className="w-full">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-4 py-2 text-left text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Date
                    </th>
                    <th className={`px-4 py-2 text-right text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Stock In
                    </th>
                    <th className={`px-4 py-2 text-right text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Stock Out
                    </th>
                    <th className={`px-4 py-2 text-right text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Net Change
                    </th>
                  </tr>
                </thead>
                <tbody className={darkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}>
                  {analytics.dailyMovements.map((day, idx) => (
                    <tr key={idx}>
                      <td className={`px-4 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {new Date(day.date).toLocaleDateString()}
                      </td>
                      <td className={`px-4 py-2 text-sm text-right ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                        +{day.stockIn}
                      </td>
                      <td className={`px-4 py-2 text-sm text-right ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        -{day.stockOut}
                      </td>
                      <td className={`px-4 py-2 text-sm text-right font-medium ${
                        day.netChange >= 0 
                          ? darkMode ? 'text-green-400' : 'text-green-600'
                          : darkMode ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {day.netChange >= 0 ? '+' : ''}{day.netChange}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Recent Activity
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Last 24 Hours</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {analytics.recentActivity.last24Hours} movements
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Last 7 Days</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {analytics.recentActivity.last7Days} movements
                </p>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Alerts Modal Component
const AlertsModal = ({ darkMode, alerts, onClose, onReorder }) => {
  const totalAlerts = alerts.outOfStock.length + alerts.lowStock.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-4xl w-full rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div>
            <h2 className="text-2xl font-bold">Stock Alerts</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {totalAlerts} alert{totalAlerts !== 1 ? 's' : ''} require attention
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Critical - Out of Stock */}
          {alerts.outOfStock.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <XCircle size={20} className="text-red-600" />
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Critical - Out of Stock ({alerts.outOfStock.length})
                </h3>
              </div>
              <div className="space-y-2">
                {alerts.outOfStock.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-l-4 border-red-600 ${
                      darkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {item.productName}
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          SKU: {item.sku} | Category: {item.category}
                        </p>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                          Reorder level: {item.reorderLevel} units
                        </p>
                      </div>
                      <button
                        onClick={() => onReorder(item)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                      >
                        Reorder Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning - Low Stock */}
          {alerts.lowStock.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-orange-600" />
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Warning - Low Stock ({alerts.lowStock.length})
                </h3>
              </div>
              <div className="space-y-2">
                {alerts.lowStock.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-l-4 ${
                      item.urgency === 'high' ? 'border-orange-600' : 'border-yellow-600'
                    } ${darkMode ? 'bg-orange-900 bg-opacity-20' : 'bg-orange-50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {item.productName}
                          </p>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            item.urgency === 'high'
                              ? 'bg-orange-600 text-white'
                              : 'bg-yellow-600 text-white'
                          }`}>
                            {item.urgency.toUpperCase()}
                          </span>
                        </div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          SKU: {item.sku} | Category: {item.category}
                        </p>
                        <div className={`text-sm mt-1 ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                          <p>Current: {item.currentStock} units ({item.boxes} boxes, {item.looseUnits} loose)</p>
                          <p>Reorder level: {item.reorderLevel} units</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onReorder(item)}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
                      >
                        Reorder
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Alerts */}
          {totalAlerts === 0 && (
            <div className="text-center py-12">
              <CheckCircle size={48} className={`mx-auto mb-4 ${darkMode ? 'text-green-600' : 'text-green-500'}`} />
              <p className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No stock alerts! All items are properly stocked.
              </p>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Movement History Component
const MovementHistory = ({ movements, darkMode }) => {
  if (movements.length === 0) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <History size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
        <p className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          No movement history yet
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
            <tr>
              <th className={`px-4 py-3 text-left text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Date
              </th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Product
              </th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Type
              </th>
              <th className={`px-4 py-3 text-right text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Quantity
              </th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Notes
              </th>
            </tr>
          </thead>
          <tbody className={darkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}>
            {movements.map((movement) => {
              const totalUnits = (movement.boxes_moved * movement.units_per_box) + movement.loose_units_moved;
              const isIncrease = movement.movement_type === 'Purchase' || movement.movement_type === 'Adjustment In';
              
              return (
                <tr key={movement.id}>
                  <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                    {new Date(movement.movement_date).toLocaleDateString()}
                  </td>
                  <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                    <div>
                      <p className="font-medium">{movement.products?.name || 'Unknown'}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {movement.products?.sku || 'N/A'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      movement.movement_type === 'Purchase'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : movement.movement_type === 'Sale'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : movement.movement_type === 'Adjustment In'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                    }`}>
                      {movement.movement_type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${
                    isIncrease 
                      ? darkMode ? 'text-green-400' : 'text-green-600'
                      : darkMode ? 'text-red-400' : 'text-red-600'
                  }`}>
                    {isIncrease ? '+' : '-'}{totalUnits}
                    <span className={`text-xs ml-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      ({movement.boxes_moved}b, {movement.loose_units_moved}u)
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {movement.notes || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Metric Card for Analytics
const MetricCard = ({ label, value, alert = false, darkMode }) => (
  <div className={`p-4 rounded-lg border ${
    alert
      ? 'border-red-500 bg-red-50 dark:bg-red-900 dark:bg-opacity-20'
      : darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'
  }`}>
    <p className={`text-sm ${
      alert 
        ? 'text-red-700 dark:text-red-400' 
        : darkMode ? 'text-gray-400' : 'text-gray-600'
    }`}>
      {label}
    </p>
    <p className={`text-2xl font-bold ${
      alert
        ? 'text-red-800 dark:text-red-300'
        : darkMode ? 'text-white' : 'text-gray-900'
    }`}>
      {value}
    </p>
  </div>
);

export default InventoryManagement;
