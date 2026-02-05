import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, Mail, MapPin, Building, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * CUSTOMER RELATIONSHIP MANAGEMENT (CRM) MODULE
 * Pharma-C Medical Supplies - SteriCare
 * 
 * Features to implement:
 * - Customer database with contact details
 * - Interaction history tracking
 * - Sales opportunities pipeline
 * - Customer notes and follow-ups
 * - Credit limit monitoring
 * - Purchase history
 */

const CRMModule = ({ darkMode, setDarkMode, onBack }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  Customer CRM
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {customers.length} total customers
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => alert('Add Customer feature coming soon')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus size={20} />
            Add Customer
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search size={20} className={`absolute left-3 top-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers..."
              className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
              }`}
            />
          </div>
        </div>

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className={`p-6 rounded-xl cursor-pointer transition-all ${
                darkMode
                  ? 'bg-gray-800 border border-gray-700 hover:border-blue-500'
                  : 'bg-white border border-gray-200 hover:border-blue-400'
              } hover:shadow-lg`}
              onClick={() => alert(`Customer details for ${customer.name} - Feature coming soon`)}
            >
              {/* Customer Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    darkMode ? 'bg-blue-900' : 'bg-blue-100'
                  }`}>
                    <Building size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {customer.name}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      customer.customer_type === 'Facility'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {customer.customer_type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={16} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    {customer.region}
                  </span>
                </div>
                
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={16} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                      {customer.phone}
                    </span>
                  </div>
                )}
                
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={16} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                      {customer.email}
                    </span>
                  </div>
                )}
              </div>

              {/* Credit Info */}
              {customer.credit_limit > 0 && (
                <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex justify-between text-sm">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Credit Limit:</span>
                    <span className="font-semibold">₵{customer.credit_limit.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No customers found
            </p>
          </div>
        )}

        {/* Feature Roadmap */}
        <div className={`mt-8 p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-blue-50 border border-blue-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            🚀 Coming Soon Features
          </h3>
          <ul className={`space-y-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <li>✓ Customer detail pages with full history</li>
            <li>✓ Add/edit customer information</li>
            <li>✓ Track customer interactions and notes</li>
            <li>✓ Sales opportunities pipeline</li>
            <li>✓ Purchase history and analytics</li>
            <li>✓ Credit limit monitoring and alerts</li>
            <li>✓ Follow-up reminders</li>
            <li>✓ Customer segmentation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CRMModule;
