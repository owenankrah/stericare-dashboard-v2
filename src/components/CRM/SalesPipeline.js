import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, X, Edit, Save, Trash2, MessageSquare, Clock, User, Calendar, DollarSign, Percent, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Mail } from "lucide-react";


/**
 * PHARMA-C SALES PIPELINE - ADVANCED
 * Phase 3.1: Drag & Drop
 * Phase 3.2: Deal Details Modal
 * Phase 3.3: Filters & Advanced Features
 */

const SalesPipeline = ({ darkMode, currentUser }) => {
  const navigate = useNavigate();
  
  // State
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedDeal, setDraggedDeal] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [dealNotes, setDealNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterMinValue, setFilterMinValue] = useState('');
  const [filterMaxValue, setFilterMaxValue] = useState('');

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [stats, setStats] = useState({
    totalValue: 0,
    totalDeals: 0,
    avgDealSize: 0,
    winRate: 0,
    expectedClose: 0
  });

  // Pipeline stages
  const stages = [
    { id: 'lead', 
      name: 'Lead', 
      color: 'gray', 
      bgColor: 'bg-gray-50 dark:bg-gray-800' 
    },
    { id: 'qualified', 
      name: 'Qualified', 
      color: 'blue', 
      bgColor: 'bg-blue-50 dark:bg-blue-900/20' 
    },
    { id: 'proposal', 
      name: 'Proposal', 
      color: 'purple', 
      bgColor: 'bg-purple-50 dark:bg-purple-900/20' 
    },
    { id: 'negotiation', 
      name: 'Negotiation', 
      color: 'orange', 
      bgColor: 'bg-orange-50 dark:bg-orange-900/20' 
    },
    { id: 'won', 
      name: 'Won 🎉', 
      color: 'green', 
      bgColor: 'bg-green-50 dark:bg-green-900/20' 
    }
  ];

  // Load deals
  const loadDeals = useCallback(async () => {
    setLoading(true);
    try {
      const { data: invoicesData, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers(name, customer_type, email, phone)
        `)
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      // Transform invoices into deals
      const transformedDeals = (invoicesData || []).map((invoice, index) => {
        let stage = 'lead';
        let probability = 20;
        
        if (invoice.payment_status === 'Paid') {
          stage = 'won';
          probability = 100;
        } else {
          const stageIndex = index % 4;
          const stageMap = ['lead', 'qualified', 'proposal', 'negotiation'];
          stage = stageMap[stageIndex];
          probability = [20, 50, 75, 85][stageIndex];
        }

        return {
          id: invoice.id,
          title: `${invoice.customers?.name || 'Unknown'} Order`,
          customer: invoice.customers?.name || 'Unknown',
          customerType: invoice.customers?.customer_type || 'Unknown',
          customerEmail: invoice.customers?.email || '',
          customerPhone: invoice.customers?.phone || '',
          value: invoice.total_amount || 0,
          stage: stage,
          probability: probability,
          closeDate: invoice.invoice_date,
          invoiceNumber: invoice.invoice_number,
          status: invoice.payment_status,
          notes: `Deal for invoice ${invoice.invoice_number}`,
          salesperson: invoice.salesperson_name || currentUser?.profile?.full_name || 'Unknown',
          createdAt: invoice.created_at
        };
      });

      setDeals(transformedDeals);
      calculateStats(transformedDeals);

    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  // Calculate stats
  const calculateStats = (dealsData) => {
    const totalValue = dealsData.reduce((sum, deal) => sum + deal.value, 0);
    const wonDeals = dealsData.filter(d => d.stage === 'won');
    const winRate = dealsData.length > 0 ? (wonDeals.length / dealsData.length) * 100 : 0;
    const expectedClose = dealsData
      .filter(d => d.stage !== 'won')
      .reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0);

    setStats({
      totalValue,
      totalDeals: dealsData.length,
      avgDealSize: dealsData.length > 0 ? totalValue / dealsData.length : 0,
      winRate,
      expectedClose
    });
  };

  // PHASE 3.1: DRAG & DROP HANDLERS
  const handleDragStart = (e, deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedDeal(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    if (!draggedDeal || draggedDeal.stage === targetStage) {
      setDragOverStage(null);
      return;
    }

    // Update deal stage
    const updatedDeals = deals.map(deal => 
      deal.id === draggedDeal.id 
        ? { 
            ...deal, 
            stage: targetStage,
            probability: targetStage === 'won' ? 100 : 
                        targetStage === 'negotiation' ? 85 :
                        targetStage === 'proposal' ? 75 :
                        targetStage === 'qualified' ? 50 : 20
          }
        : deal
    );

    setDeals(updatedDeals);
    calculateStats(updatedDeals);
    setDragOverStage(null);

    // TODO: Update in database when you have a deals table
    await supabase.from('deals').update({ stage: targetStage }).eq('id', draggedDeal.id);
  };

  // PHASE 3.2: DEAL MODAL HANDLERS
  const openDealModal = (deal) => {
    setSelectedDeal(deal);
    setShowDealModal(true);
    setEditingDeal(null);
    // Load notes for this deal
    setDealNotes([
      { id: 1, text: deal.notes, author: 'System', date: deal.createdAt, type: 'note' },
      { id: 2, text: 'Initial contact made', author: deal.salesperson, date: deal.createdAt, type: 'activity' }
    ]);
  };

  const closeDealModal = () => {
    setShowDealModal(false);
    setSelectedDeal(null);
    setEditingDeal(null);
    setDealNotes([]);
    setNewNote('');
  };

  const startEditingDeal = () => {
    setEditingDeal({ ...selectedDeal });
  };

  const saveDealEdit = () => {
    const updatedDeals = deals.map(deal => 
      deal.id === editingDeal.id ? editingDeal : deal
    );
    setDeals(updatedDeals);
    setSelectedDeal(editingDeal);
    setEditingDeal(null);
    calculateStats(updatedDeals);
    // TODO: Save to database
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    
    const note = {
      id: Date.now(),
      text: newNote,
      author: currentUser?.profile?.full_name || 'You',
      date: new Date().toISOString(),
      type: 'note'
    };
    
    setDealNotes([note, ...dealNotes]);
    setNewNote('');
    // TODO: Save to database
  };

  // Calculate deal probability based on stage and value
  const calculateProbability = (stage, value) => {
    const baseProbability = {
      lead: 20,
      qualified: 50,
      proposal: 75,
      negotiation: 85,
      won: 100
    }[stage] || 20;

    // Adjust based on deal size (larger deals slightly lower probability)
    const valueAdjustment = value > 50000 ? -5 : value > 20000 ? 0 : 5;
    
    return Math.min(100, Math.max(0, baseProbability + valueAdjustment));
  };

  // PHASE 3.3: FILTER DEALS
  const filteredDeals = deals.filter(deal => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.customer.toLowerCase().includes(searchTerm.toLowerCase());

    // Stage filter
    const matchesStage = filterStage === 'all' || deal.stage === filterStage;

    // Value filter
    const matchesMinValue = filterMinValue === '' || deal.value >= parseFloat(filterMinValue);
    const matchesMaxValue = filterMaxValue === '' || deal.value <= parseFloat(filterMaxValue);

    // Date filter
    const dealDate = new Date(deal.closeDate);
    const matchesFromDate = filterDateFrom === '' || dealDate >= new Date(filterDateFrom);
    const matchesToDate = filterDateTo === '' || dealDate <= new Date(filterDateTo);

    return matchesSearch && matchesStage && matchesMinValue && matchesMaxValue && matchesFromDate && matchesToDate;
  });

  // Group by stage
  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = filteredDeals.filter(deal => deal.stage === stage.id);
    return acc;
  }, {});

  // Calculate stage totals
  const stageTotals = stages.reduce((acc, stage) => {
    const stageDeals = dealsByStage[stage.id] || [];
    acc[stage.id] = stageDeals.reduce((sum, deal) => sum + deal.value, 0);
    return acc;
  }, {});

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStage('all');
    setFilterMinValue('');
    setFilterMaxValue('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const getAvatarColor = (type) => {
    switch (type) {
      case 'Hospital': return 'from-blue-500 to-blue-600';
      case 'Pharmacy': return 'from-green-500 to-green-600';
      case 'Clinic': return 'from-purple-500 to-purple-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getProbabilityColor = (probability) => {
    if (probability >= 90) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200';
    if (probability >= 70) return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200';
    if (probability >= 50) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#5EEAD4] mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading pipeline...</p>
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
                Sales Pipeline
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Drag deals between stages to update their status
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/crm')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                ← Back to CRM
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 border ${
                  showFilters
                    ? 'bg-[#5EEAD4] border-[#5EEAD4] text-[#1E3A8A]'
                    : darkMode
                    ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                    : 'border-gray-300 hover:bg-gray-50 text-gray-900'
                }`}
              >
                <Filter size={18} />
                Filters
                {(searchTerm || filterStage !== 'all' || filterMinValue || filterMaxValue) && (
                  <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {[searchTerm, filterStage !== 'all', filterMinValue, filterMaxValue].filter(Boolean).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/sales-invoicing')}
                className="px-6 py-2 bg-[#5EEAD4] hover:bg-[#5EEAD4]/90 text-[#1E3A8A] rounded-lg font-medium flex items-center gap-2"
              >
                <Plus size={18} />
                New Deal
              </button>
            </div>
          </div>

          {/* PHASE 3.3: FILTERS PANEL */}
          {showFilters && (
            <div className={`mt-4 p-4 rounded-lg border ${darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="grid grid-cols-5 gap-4">
                {/* Search */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Search
                  </label>
                  <div className="relative">
                    <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Customer..."
                      className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Stage */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Stage
                  </label>
                  <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="all">All Stages</option>
                    {stages.map(stage => (
                      <option key={stage.id} value={stage.id}>{stage.name}</option>
                    ))}
                  </select>
                </div>

                {/* Min Value */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Min Value
                  </label>
                  <input
                    type="number"
                    value={filterMinValue}
                    onChange={(e) => setFilterMinValue(e.target.value)}
                    placeholder="₵0"
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                {/* Max Value */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Max Value
                  </label>
                  <input
                    type="number"
                    value={filterMaxValue}
                    onChange={(e) => setFilterMaxValue(e.target.value)}
                    placeholder="₵999,999"
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                {/* Clear */}
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-medium ${
                      darkMode
                        ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                        : 'border-gray-300 hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className={`mt-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Showing {filteredDeals.length} of {deals.length} deals
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="p-6">
        {/* Pipeline Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6 max-w-7xl">
          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Pipeline</div>
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              ₵{stats.totalValue.toLocaleString()}
            </div>
          </div>

          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Deals</div>
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.totalDeals}
            </div>
          </div>

          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Deal</div>
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              ₵{stats.avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Win Rate</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.winRate.toFixed(0)}%
            </div>
          </div>

          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Expected</div>
            <div className={`text-2xl font-bold text-[#3B82F6]`}>
              ₵{stats.expectedClose.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* PHASE 3.1: KANBAN BOARD WITH DRAG & DROP */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageDeals = dealsByStage[stage.id] || [];
            const stageTotal = stageTotals[stage.id] || 0;
            const isDragOver = dragOverStage === stage.id;

            return (
              <div 
                key={stage.id} 
                className="flex-shrink-0 w-80"
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className={`rounded-xl overflow-hidden transition-all ${
                  isDragOver 
                    ? 'ring-2 ring-[#5EEAD4] scale-105' 
                    : ''
                } ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                  {/* Column Header */}
                  <div className={`p-4 border-b ${stage.bgColor} ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {stage.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        stage.color === 'gray' ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                        stage.color === 'blue' ? 'bg-blue-200 text-blue-700 dark:bg-blue-900 dark:text-blue-200' :
                        stage.color === 'purple' ? 'bg-purple-200 text-purple-700 dark:bg-purple-900 dark:text-purple-200' :
                        stage.color === 'orange' ? 'bg-orange-200 text-orange-700 dark:bg-orange-900 dark:text-orange-200' :
                        'bg-green-200 text-green-700 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className={`text-sm font-medium ${
                      stage.color === 'green' ? 'text-green-700 dark:text-green-400' :
                      stage.color === 'blue' ? 'text-blue-700 dark:text-blue-400' :
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      ₵{stageTotal.toLocaleString()}
                    </div>
                  </div>

                  {/* Deal Cards */}
                  <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
                    {stageDeals.length === 0 ? (
                      <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {isDragOver ? 'Drop here' : 'No deals'}
                      </div>
                    ) : (
                      stageDeals.map((deal) => (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal)}
                          onDragEnd={handleDragEnd}
                          onClick={() => openDealModal(deal)}
                          className={`rounded-lg p-4 cursor-move transition-all ${
                            stage.color === 'won'
                              ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-2 border-green-300 dark:border-green-700'
                              : darkMode
                              ? 'bg-gray-750 border-2 border-gray-700 hover:border-[#5EEAD4] hover:shadow-lg'
                              : 'bg-white border-2 border-gray-200 hover:border-[#5EEAD4] hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {deal.title}
                            </h4>
                            {stage.id === 'won' && (
                              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                              </svg>
                            )}
                          </div>
                          
                          <div className={`text-2xl font-bold mb-3 ${
                            stage.id === 'won' ? 'text-green-600' : 'text-[#3B82F6]'
                          }`}>
                            ₵{deal.value.toLocaleString()}
                          </div>
                          
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-8 h-8 bg-gradient-to-br ${getAvatarColor(deal.customerType)} rounded-full flex items-center justify-center text-white text-xs font-semibold`}>
                              {deal.customer.substring(0, 2).toUpperCase()}
                            </div>
                            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {deal.customer}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                              {formatDate(deal.closeDate)}
                            </span>
                            {stage.id !== 'won' && (
                              <span className={`px-2 py-1 rounded ${getProbabilityColor(deal.probability)}`}>
                                {deal.probability}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PHASE 3.2: DEAL DETAIL MODAL */}
      {showDealModal && selectedDeal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeDealModal}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            {/* Modal Header */}
            <div className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Deal Details
              </h2>
              <div className="flex items-center gap-2">
                {!editingDeal && (
                  <button
                    onClick={startEditingDeal}
                    className="px-4 py-2 bg-[#5EEAD4] hover:bg-[#5EEAD4]/90 text-[#1E3A8A] rounded-lg flex items-center gap-2"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                )}
                <button
                  onClick={closeDealModal}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-3 gap-6">
                {/* Left Column - Deal Info */}
                <div className="col-span-2 space-y-6">
                  {editingDeal ? (
                    /* Edit Mode */
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Deal Title
                        </label>
                        <input
                          type="text"
                          value={editingDeal.title}
                          onChange={(e) => setEditingDeal({ ...editingDeal, title: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Deal Value (₵)
                        </label>
                        <input
                          type="number"
                          value={editingDeal.value}
                          onChange={(e) => setEditingDeal({ ...editingDeal, value: parseFloat(e.target.value) || 0 })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Stage
                        </label>
                        <select
                          value={editingDeal.stage}
                          onChange={(e) => setEditingDeal({ ...editingDeal, stage: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        >
                          {stages.map(stage => (
                            <option key={stage.id} value={stage.id}>{stage.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Probability (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editingDeal.probability}
                          onChange={(e) => setEditingDeal({ ...editingDeal, probability: parseInt(e.target.value) || 0 })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={saveDealEdit}
                          className="flex-1 px-4 py-2 bg-[#5EEAD4] hover:bg-[#5EEAD4]/90 text-[#1E3A8A] rounded-lg font-medium flex items-center justify-center gap-2"
                        >
                          <Save size={16} />
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingDeal(null)}
                          className={`flex-1 px-4 py-2 rounded-lg border ${
                            darkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-50 text-gray-900'
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      {/* Deal Header */}
                      <div>
                        <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedDeal.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedDeal.stage === 'won' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' :
                            selectedDeal.stage === 'negotiation' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200' :
                            selectedDeal.stage === 'proposal' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' :
                            selectedDeal.stage === 'qualified' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {stages.find(s => s.id === selectedDeal.stage)?.name}
                          </span>
                          <span className={`px-2 py-1 rounded ${getProbabilityColor(selectedDeal.probability)}`}>
                            {selectedDeal.probability}% probability
                          </span>
                        </div>
                      </div>

                      {/* Deal Value */}
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-blue-50'}`}>
                        <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Deal Value
                        </div>
                        <div className="text-3xl font-bold text-[#3B82F6]">
                          ₵{selectedDeal.value.toLocaleString()}
                        </div>
                        <div className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Expected: ₵{(selectedDeal.value * selectedDeal.probability / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div>
                        <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Customer Information
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarColor(selectedDeal.customerType)} rounded-full flex items-center justify-center text-white font-semibold`}>
                              {selectedDeal.customer.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {selectedDeal.customer}
                              </div>
                              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {selectedDeal.customerType}
                              </div>
                            </div>
                          </div>
                          {selectedDeal.customerEmail && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail size={16} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                                {selectedDeal.customerEmail}
                              </span>
                            </div>
                          )}
                          {selectedDeal.customerPhone && (
                            <div className="flex items-center gap-2 text-sm">
                              <svg className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                              </svg>
                              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                                {selectedDeal.customerPhone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timeline / Notes */}
                      <div>
                        <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Activity & Notes
                        </h4>
                        
                        {/* Add Note */}
                        <div className="mb-4">
                          <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Add a note or activity..."
                            rows={2}
                            className={`w-full px-3 py-2 rounded-lg border ${
                              darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                            }`}
                          />
                          <button
                            onClick={addNote}
                            disabled={!newNote.trim()}
                            className="mt-2 px-4 py-2 bg-[#5EEAD4] hover:bg-[#5EEAD4]/90 text-[#1E3A8A] rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <MessageSquare size={16} />
                            Add Note
                          </button>
                        </div>

                        {/* Notes List */}
                        <div className="space-y-3">
                          {dealNotes.map(note => (
                            <div key={note.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                  note.type === 'activity' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                                }`}>
                                  {note.type === 'activity' ? <Clock size={14} /> : <MessageSquare size={14} />}
                                </div>
                                <div className="flex-1">
                                  <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                    {note.text}
                                  </div>
                                  <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                    {note.author} • {formatDate(note.date)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Right Column - Meta Info */}
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Deal Information
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <div className={`text-xs uppercase tracking-wide mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          Expected Close
                        </div>
                        <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          <Calendar size={16} />
                          {formatDate(selectedDeal.closeDate)}
                        </div>
                      </div>
                      <div>
                        <div className={`text-xs uppercase tracking-wide mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          Salesperson
                        </div>
                        <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          <User size={16} />
                          {selectedDeal.salesperson}
                        </div>
                      </div>
                      {selectedDeal.invoiceNumber && (
                        <div>
                          <div className={`text-xs uppercase tracking-wide mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Invoice
                          </div>
                          <button
                            onClick={() => {
                              closeDealModal();
                              navigate(`/invoice/${selectedDeal.invoiceNumber}`);
                            }}
                            className="text-[#3B82F6] hover:underline text-sm"
                          >
                            {selectedDeal.invoiceNumber} →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Probability Calculator */}
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-blue-50'}`}>
                    <h4 className={`font-semibold mb-2 text-[#3B82F6]`}>
                      Probability Factors
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Stage base:</span>
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-900'}>{selectedDeal.probability}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Deal size:</span>
                        <span className={`${selectedDeal.value > 50000 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {selectedDeal.value > 50000 ? 'Large (-5%)' : 'Standard (0%)'}
                        </span>
                      </div>
                      <div className={`pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex justify-between font-semibold">
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-900'}>Final:</span>
                          <span className="text-[#3B82F6]">
                            {calculateProbability(selectedDeal.stage, selectedDeal.value)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPipelineAdvanced;
