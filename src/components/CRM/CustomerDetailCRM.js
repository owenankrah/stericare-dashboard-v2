import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Building, Calendar, DollarSign, FileText, TrendingUp, Edit, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SalesEntry from '../SalesEntry';

const CustomerDetailCRM = ({ darkMode }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);   // ← ADD THIS
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    lastOrderDate: null
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [deals, setDeals] = useState([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({ deal_id: '', type: 'call', title: '', content: '', follow_up_at: '' });

  const loadCustomerData = useCallback(async () => {
    setLoading(true);
    try {
      // Load customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (customerError) throw customerError;
      if (!customerData) {
        setError('Customer not found');
        return;
      }

      setCustomer(customerData);

      // Load invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', id)
        .order('invoice_date', { ascending: false })
        .limit(10);

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);

      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select('id, title, stage, value, created_at, deal_activities(*)')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });
      if (dealsError) throw dealsError;
      setDeals(dealsData || []);

      // Calculate stats
      if (invoicesData && invoicesData.length > 0) {
        const totalRevenue = invoicesData.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        const lastOrder = invoicesData[0].invoice_date;
        
        setStats({
          totalRevenue,
          totalOrders: invoicesData.length,
          avgOrderValue: totalRevenue / invoicesData.length,
          lastOrderDate: lastOrder
        });
      }

      // Create activities from invoices
      const invoiceActivities = (invoicesData || []).map(inv => ({
        type: 'invoice',
        title: 'Invoice Created',
        description: `${inv.invoice_number} for ₵${inv.total_amount?.toLocaleString()}`,
        date: inv.invoice_date,
        status: inv.payment_status,
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number
      }));

      const dealActivities = (dealsData || []).flatMap(deal => (deal.deal_activities || []).map(activity => ({
        type: activity.type || 'note',
        title: activity.title || 'Deal activity',
        description: activity.content || '',
        date: activity.follow_up_at || activity.created_at,
        status: deal.stage,
        dealId: deal.id,
        dealTitle: deal.title
      })));
      setActivities([...invoiceActivities, ...dealActivities].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));

    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const openActivity = (type) => {
    setActivityForm({
      deal_id: deals[0]?.id || '',
      type,
      title: type === 'follow_up' ? 'Customer follow-up' : 'Customer activity',
      content: '',
      follow_up_at: type === 'follow_up' ? new Date().toISOString().slice(0, 16) : ''
    });
    setShowActivityModal(true);
  };

  const saveActivity = async (event) => {
    event.preventDefault();
    if (!activityForm.deal_id) {
      window.alert('Create or select a deal before logging an activity.');
      return;
    }
    setSavingActivity(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: activityError } = await supabase.from('deal_activities').insert({
        deal_id: activityForm.deal_id,
        type: activityForm.type,
        content: `${activityForm.title.trim()}\n${activityForm.content.trim()}${activityForm.follow_up_at ? `\nFollow up: ${new Date(activityForm.follow_up_at).toLocaleString()}` : ''}`,
        author_id: user?.id || null
      });
      if (activityError) throw activityError;
      setShowActivityModal(false);
      await loadCustomerData();
    } catch (activityError) {
      window.alert(activityError.message || 'Unable to save activity.');
    } finally {
      setSavingActivity(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'invoice':
        return <FileText size={20} className="text-green-600" />;
      default:
        return <FileText size={20} className="text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#5EEAD4] mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading customer...
          </p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <p className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Customer not found
          </p>
          <button
            onClick={() => navigate('/crm')}
            className="px-4 py-2 bg-[#5EEAD4] text-[#1E3A8A] rounded-lg hover:bg-[#5EEAD4]/90"
          >
            Back to CRM
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Breadcrumb & Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate('/crm')}
              className="text-[#3B82F6] hover:underline"
            >
              Customers
            </button>
            <span className="text-gray-400">›</span>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {customer.name}
            </span>
          </div>
          
          <button
            onClick={() => navigate(`/crm/customer/${id}/edit`)}
            className="px-4 py-2 bg-[#5EEAD4] hover:bg-[#5EEAD4]/90 text-[#1E3A8A] rounded-lg font-medium flex items-center gap-2"
          >
            <Edit size={18} />
            Edit Customer
          </button>
        </div>

        {/* Customer Header Card */}
        <div className={`rounded-xl p-6 mb-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-[#3B82F6] to-[#1E3A8A] rounded-2xl flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
              {customer.name?.substring(0, 2).toUpperCase()}
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {customer.name}
                  </h1>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      customer.customer_type === 'Hospital'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : customer.customer_type === 'Pharmacy'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                    }`}>
                      {customer.customer_type === 'Hospital' && '🏥 '}
                      {customer.customer_type === 'Pharmacy' && '💊 '}
                      {customer.customer_type === 'Clinic' && '🏪 '}
                      {customer.customer_type}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      customer.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      <span className={`w-2 h-2 rounded-full mr-2 ${customer.is_active ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                      {customer.is_active ? 'Active Customer' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Contact Details */}
              <div className="grid grid-cols-3 gap-6">
                {customer.email && (
                  <div>
                    <div className={`text-xs uppercase tracking-wide mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Email
                    </div>
                    <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {customer.email}
                    </div>
                  </div>
                )}
                {customer.phone && (
                  <div>
                    <div className={`text-xs uppercase tracking-wide mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Phone
                    </div>
                    <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {customer.phone}
                    </div>
                  </div>
                )}
                {customer.region && (
                  <div>
                    <div className={`text-xs uppercase tracking-wide mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Region
                    </div>
                    <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {customer.region}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Revenue</div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <DollarSign size={20} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              ₵{stats.totalRevenue.toLocaleString()}
            </div>
          </div>

          <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Orders</div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <FileText size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.totalOrders}
            </div>
          </div>

          <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Order Value</div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              ₵{stats.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Last Order</div>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <Calendar size={20} className="text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatDate(stats.lastOrderDate)}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          
          {/* Left Column - Timeline */}
          <div className="col-span-2">
            <div className={`rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              {/* Tabs */}
              <div className={`border-b px-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex gap-8">
                  <button
                    onClick={() => setActiveTab('timeline')}
                    className={`py-4 border-b-2 font-medium ${
                      activeTab === 'timeline'
                        ? 'border-[#5EEAD4] text-[#3B82F6]'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Activity Timeline
                  </button>
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className={`py-4 border-b-2 font-medium ${
                      activeTab === 'invoices'
                        ? 'border-[#5EEAD4] text-[#3B82F6]'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Invoices ({invoices.length})
                  </button>
                </div>
              </div>
              
              {/* Timeline Content */}
              {activeTab === 'timeline' && (
                <div className="p-6 space-y-6">
                  {activities.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        No activity yet
                      </p>
                    </div>
                  ) : (
                    activities.map((activity, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {activity.title}
                                </div>
                                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {activity.description}
                                </div>
                              </div>
                              <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                {formatDate(activity.date)}
                              </span>
                            </div>
                            {activity.status && (
                              <div className="flex items-center gap-2 mt-3">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  activity.status === 'Paid'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
                                }`}>
                                  {activity.status}
                                </span>
                                {activity.invoiceNumber && (
                                  <button
                                    onClick={() => navigate(`/invoice/${activity.invoiceNumber}`)}
                                    className="text-[#3B82F6] text-sm hover:underline"
                                  >
                                    View Invoice →
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Invoices Tab */}
              {activeTab === 'invoices' && (
                <div className="p-6">
                  {invoices.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        No invoices yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          onClick={() => navigate(`/invoice/${invoice.invoice_number}`)}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            darkMode
                              ? 'border-gray-700 hover:border-[#5EEAD4] hover:bg-gray-750'
                              : 'border-gray-200 hover:border-[#5EEAD4] hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {invoice.invoice_number}
                              </div>
                              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {new Date(invoice.invoice_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                ₵{invoice.total_amount.toLocaleString()}
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                invoice.payment_status === 'Paid'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                {invoice.payment_status || 'Pending'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            
            {/* Contact Information */}
            <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Contact Information
              </h3>
              <div className="space-y-4">
                {customer.contact_person && (
                  <div>
                    <div className={`text-xs uppercase tracking-wide mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Contact Person
                    </div>
                    <div className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {customer.contact_person}
                    </div>
                  </div>
                )}
                {customer.phone && (
                  <div>
                    <div className={`text-xs uppercase tracking-wide mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Phone
                    </div>
                    <div className={`text-sm text-[#3B82F6]`}>
                      {customer.phone}
                    </div>
                  </div>
                )}
                {customer.email && (
                  <div>
                    <div className={`text-xs uppercase tracking-wide mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Email
                    </div>
                    <div className={`text-sm text-[#3B82F6]`}>
                      {customer.email}
                    </div>
                  </div>
                )}
                {customer.address && (
                  <div>
                    <div className={`text-xs uppercase tracking-wide mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Address
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {customer.address}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="w-full px-4 py-2 bg-[#5EEAD4] hover:bg-[#5EEAD4]/90 text-[#1E3A8A] rounded-lg text-sm font-medium"
                >
                  Create Invoice
                </button>
                <button onClick={() => openActivity('call')} className={`w-full px-4 py-2 rounded-lg text-sm font-medium border ${
                  darkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-50 text-gray-900'
                }`}>
                  Log Activity
                </button>
                <button onClick={() => openActivity('follow_up')} className={`w-full px-4 py-2 rounded-lg text-sm font-medium border ${
                  darkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-50 text-gray-900'
                }`}>
                  Schedule Follow-up
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 overflow-y-auto">
          <div className={`max-w-6xl mx-auto rounded-xl shadow-2xl ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="sticky top-0 z-10 flex justify-between items-center px-6 py-4 border-b bg-inherit rounded-t-xl">
              <h2 className="text-xl font-semibold">Create invoice for {customer.name}</h2>
              <button onClick={() => setShowInvoiceModal(false)} aria-label="Close invoice"><X size={24} /></button>
            </div>
            <SalesEntry darkMode={darkMode} initialCustomerId={id} onInvoiceCreated={() => { setShowInvoiceModal(false); loadCustomerData(); }} />
          </div>
        </div>
      )}

      {showActivityModal && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <form onSubmit={saveActivity} className={`w-full max-w-lg rounded-xl p-6 shadow-2xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
            <div className="flex justify-between items-center mb-5"><h2 className="text-xl font-semibold">Log pipeline activity</h2><button type="button" onClick={() => setShowActivityModal(false)}><X size={22} /></button></div>
            {deals.length === 0 ? (
              <div className="mb-4 rounded-lg bg-amber-50 text-amber-800 p-3 text-sm">This customer has no deal yet. Create a deal first so the activity can appear in the pipeline.</div>
            ) : (
              <div className="space-y-4">
                <label className="block text-sm">Deal<select required value={activityForm.deal_id} onChange={(e) => setActivityForm({ ...activityForm, deal_id: e.target.value })} className={`mt-1 w-full rounded-lg border px-3 py-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>{deals.map(deal => <option key={deal.id} value={deal.id}>{deal.title}</option>)}</select></label>
                <label className="block text-sm">Title<input required value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} className={`mt-1 w-full rounded-lg border px-3 py-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`} /></label>
                <label className="block text-sm">Notes<textarea required rows="4" value={activityForm.content} onChange={(e) => setActivityForm({ ...activityForm, content: e.target.value })} className={`mt-1 w-full rounded-lg border px-3 py-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`} /></label>
                {activityForm.type === 'follow_up' && <label className="block text-sm">Follow-up date<input type="datetime-local" value={activityForm.follow_up_at} onChange={(e) => setActivityForm({ ...activityForm, follow_up_at: e.target.value })} className={`mt-1 w-full rounded-lg border px-3 py-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`} /></label>}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowActivityModal(false)} className="px-4 py-2 rounded-lg border">Cancel</button>{deals.length > 0 && <button disabled={savingActivity} className="px-4 py-2 rounded-lg bg-[#5EEAD4] text-[#1E3A8A] font-medium">{savingActivity ? 'Saving…' : 'Save activity'}</button>}</div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailCRM;
