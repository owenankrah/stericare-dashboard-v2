import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, Plus, Users, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * PHARMA-C CRM DASHBOARD - CUSTOMER LIST VIEW
 * Phase 1: Zoho-inspired customer management
 * Features: Search, filter, sort, pagination, bulk actions
 */

const CRMDashboard = ({ darkMode }) => {
  const navigate = useNavigate();
  
  // State
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    thisMonth: 0,
    totalRevenue: 0
  });

  const itemsPerPage = 20;

  // Load customers
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          invoices(total_amount, invoice_date)
        `)
        .order('name');

      if (error) throw error;

      // Calculate revenue for each customer
      const customersWithRevenue = (data || []).map(customer => {
        const revenue = customer.invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
        const lastOrderDate = customer.invoices?.length > 0
          ? new Date(Math.max(...customer.invoices.map(inv => new Date(inv.invoice_date))))
          : null;
        
        return {
          ...customer,
          total_revenue: revenue,
          total_orders: customer.invoices?.length || 0,
          last_order_date: lastOrderDate
        };
      });

      setCustomers(customersWithRevenue);

      // Calculate stats
      const activeCustomers = customersWithRevenue.filter(c => c.is_active);
      const thisMonth = customersWithRevenue.filter(c => {
        const createdDate = new Date(c.created_at);
        const now = new Date();
        return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
      });
      const totalRevenue = customersWithRevenue.reduce((sum, c) => sum + c.total_revenue, 0);

      setStats({
        total: customersWithRevenue.length,
        active: activeCustomers.length,
        thisMonth: thisMonth.length,
        totalRevenue: totalRevenue
      });

    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Filter & search customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.region?.toLowerCase().includes(searchTerm.toLowerCase());

      // Type filter
      const matchesType = filterType === 'all' || customer.customer_type === filterType;

      // Status filter
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && customer.is_active) ||
        (filterStatus === 'inactive' && !customer.is_active);

      // Region filter
      const matchesRegion = filterRegion === 'all' || customer.region === filterRegion;

      return matchesSearch && matchesType && matchesStatus && matchesRegion;
    });
  }, [customers, searchTerm, filterType, filterStatus, filterRegion]);

  // Sort customers
  const sortedCustomers = useMemo(() => {
    const sorted = [...filteredCustomers];
    sorted.sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      // Handle null values
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      // String comparison
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredCustomers, sortColumn, sortDirection]);

  // Paginate
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedCustomers, currentPage]);

  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);

  // Handlers
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCustomers(paginatedCustomers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectCustomer = (customerId) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    alert('Export functionality coming soon!');
  };

  const getCustomerTypeColor = (type) => {
    switch (type) {
      case 'Hospital': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200';
      case 'Pharmacy': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200';
      case 'Clinic': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (isActive) => {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#5EEAD4] mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading customers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} sticky top-0 z-40`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#1E3A8A]'}`}>
                Customer Relationship Management
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage and track your customer relationships
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              }`}
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Customers</div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.total}
            </div>
          </div>

          <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active</div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Activity size={20} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.active}
            </div>
          </div>

          <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>This Month</div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className={`text-3xl font-bold text-[#5EEAD4]`}>
              +{stats.thisMonth}
            </div>
          </div>

          <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Revenue</div>
              <div className="w-10 h-10 bg-[#5EEAD4]/20 rounded-lg flex items-center justify-center">
                <DollarSign size={20} className="text-[#5EEAD4]" />
              </div>
            </div>
            <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              ₵{stats.totalRevenue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className={`rounded-xl p-4 mb-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={20} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-[#5EEAD4] focus:border-transparent`}
              />
            </div>

            {/* Filters */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Types</option>
              <option value="Hospital">Hospital</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Clinic">Clinic</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Actions */}
            <button
              onClick={handleExport}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              }`}
            >
              <Download size={18} />
              Export
            </button>

            <button
              onClick={() => navigate('/crm/new')}
              className="px-6 py-2 bg-[#5EEAD4] hover:bg-[#5EEAD4]/90 text-[#1E3A8A] rounded-lg font-medium flex items-center gap-2 shadow-sm"
            >
              <Plus size={18} />
              New Customer
            </button>
          </div>
        </div>

        {/* Customer Table */}
        <div className={`rounded-xl overflow-hidden ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          {/* Table Header */}
          <div className={`px-6 py-3 border-b ${darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedCustomers.length === paginatedCustomers.length && paginatedCustomers.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-[#5EEAD4] rounded border-gray-300 focus:ring-[#5EEAD4]"
                />
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {sortedCustomers.length} customers
                  {selectedCustomers.length > 0 && ` (${selectedCustomers.length} selected)`}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${darkMode ? 'bg-gray-750' : 'bg-gray-50'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input type="checkbox" className="w-4 h-4 text-[#5EEAD4] rounded border-gray-300" />
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('name')}
                      className={`flex items-center gap-1 text-xs font-semibold uppercase ${
                        darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Customer Name
                      {sortColumn === 'name' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <span className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Type
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('region')}
                      className={`flex items-center gap-1 text-xs font-semibold uppercase ${
                        darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Region
                      {sortColumn === 'region' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleSort('total_revenue')}
                      className={`flex items-center gap-1 text-xs font-semibold uppercase ml-auto ${
                        darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Revenue
                      {sortColumn === 'total_revenue' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center">
                    <span className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Status
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <span className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Last Activity
                    </span>
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => navigate(`/crm/customer/${customer.id}`)}
                    className={`cursor-pointer transition-colors ${
                      darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => handleSelectCustomer(customer.id)}
                        className="w-4 h-4 text-[#5EEAD4] rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#3B82F6] to-[#1E3A8A] rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                          {customer.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className={`font-semibold ${darkMode ? 'text-white hover:text-[#5EEAD4]' : 'text-gray-900 hover:text-[#3B82F6]'}`}>
                            {customer.name}
                          </div>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {customer.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCustomerTypeColor(customer.customer_type)}`}>
                        {customer.customer_type === 'Hospital' && '🏥 '}
                        {customer.customer_type === 'Pharmacy' && '💊 '}
                        {customer.customer_type === 'Clinic' && '🏪 '}
                        {customer.customer_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {customer.region}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ₵{customer.total_revenue.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(customer.is_active)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${customer.is_active ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatDate(customer.last_order_date)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Show context menu
                        }}
                        className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={`px-6 py-4 border-t ${darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Showing <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, sortedCustomers.length)}</span> of <span className="font-semibold">{sortedCustomers.length}</span> customers
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-lg border ${
                    currentPage === 1
                      ? 'opacity-50 cursor-not-allowed'
                      : darkMode
                      ? 'border-gray-600 hover:bg-gray-700'
                      : 'border-gray-300 hover:bg-white'
                  } ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Previous
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-[#5EEAD4] text-[#1E3A8A]'
                          : darkMode
                          ? 'border border-gray-600 hover:bg-gray-700 text-gray-300'
                          : 'border border-gray-300 hover:bg-white text-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-lg border ${
                    currentPage === totalPages
                      ? 'opacity-50 cursor-not-allowed'
                      : darkMode
                      ? 'border-gray-600 hover:bg-gray-700'
                      : 'border-gray-300 hover:bg-white'
                  } ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;
