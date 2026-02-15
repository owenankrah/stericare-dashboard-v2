import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Save, Search, Calendar, DollarSign, User, Tag, Briefcase, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * PHASE 4: COMPLETE DEAL MANAGEMENT
 * - Create new deals
 * - Edit existing deals
 * - Add products to deals
 * - Convert deals to invoices
 * - Full CRUD operations
 */

const DealManager = ({ darkMode, currentUser, dealId, onClose, onSave }) => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    value: '',
    stage: 'lead',
    probability: 30,
    customer_id: '',
    close_date: '',
    expected_close_date: '',
    priority: 'medium',
    source: '',
    tags: []
  });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [dealProducts, setDealProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [converting, setConverting] = useState(false);

  const isEdit = !!dealId;

  // Load data
  useEffect(() => {
    loadCustomers();
    loadProducts();
    if (dealId) {
      loadDeal();
    }
  }, [dealId]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, customer_type, email')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, selling_price')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadDeal = async () => {
    try {
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      if (dealError) throw dealError;

      setFormData({
        title: dealData.title || '',
        description: dealData.description || '',
        value: dealData.value || '',
        stage: dealData.stage || 'lead',
        probability: dealData.probability || 30,
        customer_id: dealData.customer_id || '',
        close_date: dealData.close_date || '',
        expected_close_date: dealData.expected_close_date || '',
        priority: dealData.priority || 'medium',
        source: dealData.source || '',
        tags: dealData.tags || []
      });

      // Load deal products
      const { data: productsData, error: productsError } = await supabase
        .from('deal_products')
        .select('*')
        .eq('deal_id', dealId);

      if (productsError) throw productsError;
      setDealProducts(productsData || []);

    } catch (error) {
      console.error('Error loading deal:', error);
    }
  };

  // Validation
  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Deal title is required';
    }

    if (!formData.customer_id) {
      newErrors.customer_id = 'Customer is required';
    }

    if (!formData.value || formData.value <= 0) {
      newErrors.value = 'Deal value must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save deal
  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      // Get customer details
      const customer = customers.find(c => c.id === formData.customer_id);

      const dealData = {
        ...formData,
        customer_name: customer?.name,
        customer_type: customer?.customer_type,
        salesperson_id: currentUser?.id,
        salesperson_name: currentUser?.profile?.full_name || currentUser?.email,
        value: parseFloat(formData.value),
        probability: parseInt(formData.probability)
      };

      let savedDealId;

      if (isEdit) {
        // Update existing deal
        const { error } = await supabase
          .from('deals')
          .update(dealData)
          .eq('id', dealId);

        if (error) throw error;
        savedDealId = dealId;

        // Log activity
        await supabase.from('deal_activities').insert({
          deal_id: dealId,
          type: 'edit',
          title: 'Deal Updated',
          content: 'Deal details were updated',
          author_id: currentUser?.id,
          author_name: currentUser?.profile?.full_name || currentUser?.email
        });

      } else {
        // Create new deal
        const { data: newDeal, error } = await supabase
          .from('deals')
          .insert(dealData)
          .select()
          .single();

        if (error) throw error;
        savedDealId = newDeal.id;

        // Log creation activity
        await supabase.from('deal_activities').insert({
          deal_id: savedDealId,
          type: 'note',
          title: 'Deal Created',
          content: `New deal created: ${formData.title}`,
          author_id: currentUser?.id,
          author_name: currentUser?.profile?.full_name || currentUser?.email
        });
      }

      // Save products
      if (dealProducts.length > 0) {
        // Delete existing products
        await supabase
          .from('deal_products')
          .delete()
          .eq('deal_id', savedDealId);

        // Insert new products
        const productsToInsert = dealProducts.map(p => ({
          ...p,
          deal_id: savedDealId
        }));

        await supabase.from('deal_products').insert(productsToInsert);
      }

      if (onSave) {
        onSave(savedDealId);
      } else {
        navigate('/crm/pipeline');
      }

      if (onClose) onClose();

    } catch (error) {
      console.error('Error saving deal:', error);
      alert('Failed to save deal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Convert to invoice
  const handleConvertToInvoice = async () => {
    if (!window.confirm('Convert this deal to an invoice? This will mark the deal as won.')) {
      return;
    }

    setConverting(true);
    try {
      // Call the database function
      const { data, error } = await supabase
        .rpc('convert_deal_to_invoice', {
          p_deal_id: dealId
        });

      if (error) throw error;

      alert('✅ Deal successfully converted to invoice!');
      
      if (onClose) onClose();
      if (onSave) onSave(dealId);

    } catch (error) {
      console.error('Error converting deal:', error);
      alert('Failed to convert deal: ' + error.message);
    } finally {
      setConverting(false);
    }
  };

  // Add product to deal
  const handleAddProduct = (product) => {
    const newProduct = {
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: product.selling_price || 0,
      discount_percentage: 0
    };

    setDealProducts([...dealProducts, newProduct]);
    setShowProductSelector(false);
  };

  // Remove product
  const handleRemoveProduct = (index) => {
    setDealProducts(dealProducts.filter((_, i) => i !== index));
  };

  // Update product quantity/price
  const handleUpdateProduct = (index, field, value) => {
    const updated = [...dealProducts];
    updated[index] = { ...updated[index], [field]: value };
    setDealProducts(updated);
  };

  // Calculate total from products
  const calculateTotalFromProducts = () => {
    return dealProducts.reduce((sum, product) => {
      const subtotal = product.quantity * product.unit_price;
      const discount = subtotal * (product.discount_percentage / 100);
      return sum + (subtotal - discount);
    }, 0);
  };

  // Update value when products change
  useEffect(() => {
    if (dealProducts.length > 0) {
      const total = calculateTotalFromProducts();
      setFormData(prev => ({ ...prev, value: total.toFixed(2) }));
    }
  }, [dealProducts]);

  // Probability based on stage
  const stageProbabilities = {
    lead: 30,
    qualified: 60,
    proposal: 75,
    negotiation: 90,
    won: 100,
    lost: 0
  };

  const handleStageChange = (stage) => {
    setFormData({
      ...formData,
      stage,
      probability: stageProbabilities[stage]
    });
  };

  return (
    <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#1E3A8A]'}`}>
              {isEdit ? 'Edit Deal' : 'Create New Deal'}
            </h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {isEdit ? 'Update deal information' : 'Add a new sales opportunity'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isEdit && formData.stage === 'negotiation' && !formData.invoice_id && (
              <button
                onClick={handleConvertToInvoice}
                disabled={converting}
                className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 ${
                  converting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {converting ? 'Converting...' : '🎉 Convert to Invoice'}
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Basic Information */}
          <div className={`p-6 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Deal Information
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Deal Title */}
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Deal Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Korle Bu Hospital - Medical Supplies Q1"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.title ? 'border-red-500' : darkMode ? 'border-gray-600' : 'border-gray-300'
                  } ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              {/* Customer */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Customer *
                </label>
                <div className="relative">
                  <User size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2 rounded-lg border ${
                      errors.customer_id ? 'border-red-500' : darkMode ? 'border-gray-600' : 'border-gray-300'
                    } ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                  >
                    <option value="">Select customer...</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.customer_type})
                      </option>
                    ))}
                  </select>
                </div>
                {errors.customer_id && <p className="text-red-500 text-sm mt-1">{errors.customer_id}</p>}
              </div>

              {/* Deal Value */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Deal Value (₵) *
                </label>
                <div className="relative">
                  <DollarSign size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0.00"
                    className={`w-full pl-10 pr-3 py-2 rounded-lg border ${
                      errors.value ? 'border-red-500' : darkMode ? 'border-gray-600' : 'border-gray-300'
                    } ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                    disabled={dealProducts.length > 0}
                  />
                </div>
                {errors.value && <p className="text-red-500 text-sm mt-1">{errors.value}</p>}
                {dealProducts.length > 0 && (
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Calculated from products
                  </p>
                )}
              </div>

              {/* Stage */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Stage
                </label>
                <select
                  value={formData.stage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  <option value="lead">Lead</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              {/* Probability */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Win Probability (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>

              {/* Expected Close Date */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Expected Close Date
                </label>
                <div className="relative">
                  <Calendar size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Source */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Lead Source
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  <option value="">Select source...</option>
                  <option value="Inbound">Inbound</option>
                  <option value="Referral">Referral</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="Email Campaign">Email Campaign</option>
                  <option value="Trade Show">Trade Show</option>
                  <option value="Website">Website</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about this deal..."
                  className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className={`p-6 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Products (Optional)
              </h2>
              <button
                onClick={() => setShowProductSelector(true)}
                className="px-4 py-2 bg-[#5EEAD4] hover:bg-[#5EEAD4]/90 text-[#1E3A8A] rounded-lg font-medium flex items-center gap-2"
              >
                <Plus size={16} />
                Add Product
              </button>
            </div>

            {dealProducts.length > 0 ? (
              <div className="space-y-3">
                {dealProducts.map((product, index) => {
                  const subtotal = product.quantity * product.unit_price;
                  const discount = subtotal * (product.discount_percentage / 100);
                  const total = subtotal - discount;

                  return (
                    <div key={index} className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="grid grid-cols-6 gap-3 items-center">
                        <div className="col-span-2">
                          <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {product.product_name}
                          </div>
                        </div>
                        <div>
                          <input
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) => handleUpdateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                            placeholder="Qty"
                            className={`w-full px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            value={product.unit_price}
                            onChange={(e) => handleUpdateProduct(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            placeholder="Price"
                            className={`w-full px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={product.discount_percentage}
                            onChange={(e) => handleUpdateProduct(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                            placeholder="%"
                            className={`w-full px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            ₵{total.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleRemoveProduct(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-blue-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Total from Products:
                    </span>
                    <span className="text-2xl font-bold text-[#3B82F6]">
                      ₵{calculateTotalFromProducts().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                No products added yet. Click "Add Product" to add line items.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              * Required fields
            </div>
            <div className="flex items-center gap-3">
              {onClose && (
                <button
                  onClick={onClose}
                  className={`px-6 py-2 rounded-lg border ${darkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-50 text-gray-900'}`}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={loading}
                className={`px-6 py-2 bg-[#5EEAD4] hover:bg-[#5EEAD4]/90 text-[#1E3A8A] rounded-lg font-medium flex items-center gap-2 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Save size={16} />
                {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Deal'}
              </button>
            </div>
          </div>
        </div>

        {/* Product Selector Modal */}
        {showProductSelector && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowProductSelector(false)}>
            <div 
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Select Product
                </h3>
                <button
                  onClick={() => setShowProductSelector(false)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-2">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleAddProduct(product)}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      darkMode
                        ? 'border-gray-700 hover:border-[#5EEAD4] hover:bg-gray-750'
                        : 'border-gray-200 hover:border-[#5EEAD4] hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {product.name}
                        </div>
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        ₵{product.selling_price?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealManager;
