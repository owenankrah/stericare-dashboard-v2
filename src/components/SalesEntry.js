import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Save, X, Search, Calculator } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { queryCache } from '../lib/queryCache';
import { useNavigate } from 'react-router-dom';

/**
 * SALES ENTRY COMPONENT - OPTIMIZED
 * Performance improvements:
 * ✅ Cache customer dropdown (10 min TTL)
 * ✅ Cache products dropdown (10 min TTL)
 * ✅ Memoize invoice totals
 * ✅ Memoize filtered customers
 * ✅ useCallback for handlers
 * ✅ Cache invalidation on save
 */

const SalesEntry = ({ darkMode, onInvoiceCreated }) => {
  const navigate = useNavigate();
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Master Data
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Form Data
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [saleType, setSaleType] = useState('Cash');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  
  // Line Items
  const [lineItems, setLineItems] = useState([
    {
      id: Date.now(),
      product: null,
      boxes: 0,
      units: 0,
      unitPrice: 0,
      costPerUnit: 0,
      discount: 0
    }
  ]);
  
  // Search/Filter
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // ==========================================
  // LOAD INITIAL DATA
  // ==========================================
  useEffect(() => {
    loadMasterData();
    getCurrentUser();
  }, []);
  
  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles') 
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(profile);
    }
  };
  
  // ==========================================
  // OPTIMIZATION 1: Cache Customer Dropdown
  // ==========================================
  
  const loadCustomers = async () => {
    const cacheKey = 'customers_dropdown';
    
    // Check cache (10 min TTL - stable data)
    if (queryCache.isValid(cacheKey, 600000)) {
      const cached = queryCache.get(cacheKey);
      console.log('✅ Cache hit: Customers dropdown');
      setCustomers(cached);
      return;
    }
    
    // Fetch from database
    console.log('📡 Fetching customers...');
    const { data } = await supabase
      .from('customers')
      .select('id, name, customer_type, region')
      .eq('is_active', true)
      .order('name');
    
    setCustomers(data || []);
    queryCache.set(cacheKey, data || [], 600000);
    console.log('💾 Customers cached for 10 minutes');
  };
  
  // ==========================================
  // OPTIMIZATION 2: Cache Products Dropdown
  // ==========================================
  
  const loadProducts = async () => {
    const cacheKey = 'products_dropdown';
    
    // Check cache (10 min TTL)
    if (queryCache.isValid(cacheKey, 600000)) {
      const cached = queryCache.get(cacheKey);
      console.log('✅ Cache hit: Products dropdown');
      setProducts(cached);
      return;
    }
    
    // Fetch from database
    console.log('📡 Fetching products...');
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('product_name');
    
    setProducts(data || []);
    queryCache.set(cacheKey, data || [], 600000);
    console.log('💾 Products cached for 10 minutes');
  };
  
  const loadMasterData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCustomers(), loadProducts()]);
    } catch (error) {
      console.error('Error loading master data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // ==========================================
  // OPTIMIZATION 3: Memoize Filtered Customers
  // ==========================================
  
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    
    console.log('🔄 Filtering customers...');
    return customers.filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.region.toLowerCase().includes(customerSearch.toLowerCase())
    );
  }, [customers, customerSearch]);
  
  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };
  
  // ==========================================
  // LINE ITEM MANAGEMENT
  // ==========================================
  
  const addLineItem = useCallback(() => {
    setLineItems(prev => [
      ...prev,
      {
        id: Date.now(),
        product: null,
        boxes: 0,
        units: 0,
        unitPrice: 0,
        costPerUnit: 0,
        discount: 0
      }
    ]);
  }, []);
  
  const removeLineItem = useCallback((id) => {
    setLineItems(prev => {
      if (prev.length > 1) {
        return prev.filter(item => item.id !== id);
      }
      return prev;
    });
  }, []);
  
  const updateLineItem = useCallback((id, field, value) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Auto-populate pricing when product is selected
        if (field === 'product' && value) {
          updated.unitPrice = value.selling_price || value.unit_price || 0;
          updated.costPerUnit = value.cost_per_unit || 0;
        }
        
        // Auto-calculate units from boxes
        if (field === 'boxes' && updated.product) {
          updated.units = parseInt(value || 0) * (updated.product.units_per_box || 1);
        }
        
        return updated;
      }
      return item;
    }));
  }, []);
  
  // ==========================================
  // OPTIMIZATION 4: Memoize Invoice Totals & Calculations
  // ==========================================
  
  const calculations = useMemo(() => {
    console.log('🔄 Calculating invoice totals...');
    
    let subtotal = 0;
    let totalCost = 0;
    let totalBoxes = 0;
    let totalUnits = 0;
    
    lineItems.forEach(item => {
      if (item.product && item.units > 0) {
        const lineSubtotal = item.units * item.unitPrice;
        const lineDiscount = item.discount || 0;
        const lineCost = item.units * item.costPerUnit;
        
        subtotal += (lineSubtotal - lineDiscount);
        totalCost += lineCost;
        totalBoxes += parseInt(item.boxes || 0);
        totalUnits += parseInt(item.units || 0);
      }
    });
    
    const discountAmount = parseFloat(overallDiscount || 0);
    const total = subtotal - discountAmount;
    const profit = total - totalCost;
    const margin = total > 0 ? (profit / total) * 100 : 0;
    
    return {
      subtotal,
      discountAmount,
      total,
      totalCost,
      profit,
      margin,
      totalBoxes,
      totalUnits
    };
  }, [lineItems, overallDiscount]);
  
  // ==========================================
  // OPTIMIZATION 5: useCallback for Save Handler
  // ==========================================
  
  const saveInvoice = useCallback(async () => {
    // Validation
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }
    
    if (!lineItems.some(item => item.product && item.units > 0)) {
      alert('Please add at least one product');
      return;
    }
    
    if (!currentUser) {
      alert('User not authenticated');
      return;
    }
    
    setSaving(true);
    
    try {
      // Generate invoice number
      const { data: invoiceNumberData, error: invoiceNumberError } = await supabase
        .rpc('generate_invoice_number');
      
      if (invoiceNumberError) throw invoiceNumberError;
      const invoiceNumber = invoiceNumberData;
      
      // Calculate month and quarter
      const date = new Date(saleDate);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
      const month = monthNames[date.getMonth()];
      const quarter = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
      
      // Create invoice header
      const invoiceData = {
        invoice_number: invoiceNumber,
        invoice_date: saleDate,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        sale_type: saleType,
        region: selectedCustomer.region,
        salesperson_id: currentUser.id,
        salesperson_name: currentUser.full_name,
        month,
        quarter,
        subtotal: calculations.subtotal,
        discount_amount: calculations.discountAmount,
        total_amount: calculations.total,
        total_cost: calculations.totalCost,
        total_profit: calculations.profit,
        margin_percentage: calculations.margin,
        notes,
        status: 'Active',
        payment_status: saleType === 'Cash' ? 'Paid' : 'Pending'
      };
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();
      
      if (invoiceError) throw invoiceError;
      
      // Create line items
      const lineItemsData = lineItems
        .filter(item => item.product && item.units > 0)
        .map(item => {
          const lineSubtotal = item.units * item.unitPrice;
          const lineDiscount = item.discount || 0;
          const lineTotal = lineSubtotal - lineDiscount;
          const lineCost = item.units * item.costPerUnit;
          const lineProfit = lineTotal - lineCost;
          const lineMargin = lineTotal > 0 ? (lineProfit / lineTotal) * 100 : 0;
          
          return {
            invoice_id: invoice.id,
            product_id: item.product.id,
            product_name: item.product.product_name || item.product.name,
            product_code: item.product.product_code || item.product.sku,
            boxes_sold: item.boxes,
            units_sold: item.units,
            unit_price: item.unitPrice,
            cost_per_unit: item.costPerUnit,
            line_subtotal: lineSubtotal,
            line_cost: lineCost,
            line_profit: lineProfit,
            line_margin: lineMargin,
            discount_amount: lineDiscount,
            line_total: lineTotal
          };
        });
      
      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsData);
      
      if (lineItemsError) throw lineItemsError;
      
      // ==========================================
      // INVENTORY INTEGRATION (ACTIVE)
      // ==========================================
      // Deduct inventory for each line item
      for (const item of lineItemsData) {
        const { error: invError } = await supabase.rpc('deduct_inventory_for_sale', {
          p_product_id: item.product_id,
          p_units_sold: item.units_sold,
          p_boxes_sold: item.boxes_sold,
          p_invoice_id: invoice.id
        });
        
        if (invError) {
          console.error('Inventory deduction failed:', invError);
          // Continue even if inventory fails (can be adjusted manually)
        }
      }
      
      // ==========================================
      // OPTIMIZATION 6: Invalidate Cache on Save
      // ==========================================
      queryCache.clearPattern('invoices_');
      queryCache.clearPattern('inventory_');
      queryCache.clearPattern('products_');
      console.log('🗑️ Caches cleared after invoice creation');
      
      alert(`✅ Invoice ${invoiceNumber} created successfully!`);
      
      // Reset form
      resetForm();
      
      // Callback
      if (onInvoiceCreated) {
        onInvoiceCreated(invoice);
      }
      
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('❌ Error creating invoice: ' + error.message);
    } finally {
      setSaving(false);
    }
  }, [selectedCustomer, lineItems, currentUser, saleDate, saleType, calculations, notes, overallDiscount, onInvoiceCreated]);
  
  const resetForm = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setSaleType('Cash');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setOverallDiscount(0);
    setNotes('');
    setLineItems([
      {
        id: Date.now(),
        product: null,
        boxes: 0,
        units: 0,
        unitPrice: 0,
        costPerUnit: 0,
        discount: 0
      }
    ]);
  }, []);
  
  // ==========================================
  // RENDER
  // ==========================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className={`max-w-6xl mx-auto p-4 md:p-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">New Sale / Invoice</h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Enter sale details and generate invoice automatically
        </p>
      </div>
      
      {/* Sale Header */}
      <div className={`p-6 rounded-xl mb-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Customer Selection */}
          <div className="relative">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Customer / Facility *
            </label>
            <div className="relative">
              <Search size={18} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Search customer..."
                className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            
            {/* Dropdown */}
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className={`absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-lg border shadow-lg ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
              }`}>
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    onClick={() => selectCustomer(customer)}
                    className={`p-3 cursor-pointer hover:bg-blue-600 hover:text-white ${
                      darkMode ? 'border-b border-gray-600' : 'border-b border-gray-100'
                    }`}
                  >
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-xs opacity-75">{customer.region} • {customer.customer_type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Sale Type */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Sale Type *
            </label>
            <select
              value={saleType}
              onChange={(e) => setSaleType(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="Cash">Cash</option>
              <option value="Credit">Credit</option>
            </select>
          </div>
          
          {/* Sale Date */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Sale Date *
            </label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
        </div>
      </div>
      
      {/* Line Items */}
      <div className={`p-6 rounded-xl mb-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Line Items</h3>
          <button
            onClick={addLineItem}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            Add Item
          </button>
        </div>
        
        <div className="space-y-4">
          {lineItems.map((item, index) => (
            <div key={item.id} className={`p-4 rounded-lg border ${
              darkMode ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {/* Product */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1">Product *</label>
                  <select
                    value={item.product?.id || ''}
                    onChange={(e) => {
                      const product = products.find(p => p.id === e.target.value);
                      updateLineItem(item.id, 'product', product);
                    }}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Select product...</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.product_name} (₵{product.selling_price || product.unit_price})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Boxes */}
                <div>
                  <label className="block text-xs font-medium mb-1">Boxes</label>
                  <input
                    type="number"
                    value={item.boxes}
                    onChange={(e) => updateLineItem(item.id, 'boxes', e.target.value)}
                    min="0"
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                {/* Units */}
                <div>
                  <label className="block text-xs font-medium mb-1">Units *</label>
                  <input
                    type="number"
                    value={item.units}
                    onChange={(e) => updateLineItem(item.id, 'units', e.target.value)}
                    min="0"
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                {/* Unit Price */}
                <div>
                  <label className="block text-xs font-medium mb-1">Price/Unit</label>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                    step="0.01"
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                {/* Remove Button */}
                <div className="flex items-end">
                  {lineItems.length > 1 && (
                    <button
                      onClick={() => removeLineItem(item.id)}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Line Total */}
              {item.product && item.units > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="text-sm font-medium">
                    Line Total: ₵{((item.units * item.unitPrice) - (item.discount || 0)).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Summary */}
      <div className={`p-6 rounded-xl mb-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calculator size={20} />
          Summary
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Subtotal:</span>
              <span className="font-semibold">₵{calculations.subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Discount:</span>
              <input
                type="number"
                value={overallDiscount}
                onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)}
                step="0.01"
                className={`w-32 px-3 py-1 rounded border text-right ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            
            <div className="flex justify-between pt-3 border-t border-gray-600">
              <span className="font-semibold">Total:</span>
              <span className="text-xl font-bold text-green-500">₵{calculations.total.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Right - Only visible to admin/manager */}
          {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Cost:</span>
                <span className="font-semibold">₵{calculations.totalCost.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Profit:</span>
                <span className="font-semibold text-blue-500">₵{calculations.profit.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Margin:</span>
                <span className="font-semibold">{calculations.margin.toFixed(1)}%</span>
              </div>
              
              <div className="flex justify-between text-xs opacity-75">
                <span>Total Units:</span>
                <span>{calculations.totalUnits} ({calculations.totalBoxes} boxes)</span>
              </div>
            </div>
          )}
          
          {/* Sales rep view - only show total units */}
          {currentUser?.role === 'sales_rep' && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Total Units:</span>
                <span className="font-semibold">{calculations.totalUnits}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Total Boxes:</span>
                <span className="font-semibold">{calculations.totalBoxes}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Notes */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`w-full px-4 py-3 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="Add any notes about this sale..."
          />
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={resetForm}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            darkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
          }`}
        >
          <X size={18} className="inline mr-2" />
          Cancel
        </button>
        
        <button
          onClick={saveInvoice}
          disabled={saving || !selectedCustomer || calculations.total <= 0}
          className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
            saving || !selectedCustomer || calculations.total <= 0
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {saving ? (
            <>
              <div className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Saving...
            </>
          ) : (
            <>
              <Save size={18} className="inline mr-2" />
              Create Invoice
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SalesEntry;
