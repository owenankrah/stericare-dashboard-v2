import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sun, Moon, TrendingUp, RefreshCw, Download } from 'lucide-react';
import { supabase } from './lib/supabase';

const AnalyticsDashboard = ({ darkMode, setDarkMode, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [filters, setFilters] = useState({
    product: 'All Products',
    region: 'All Regions',
    saleType: 'All Types',
    salesPerson: 'All Sales People'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

      let query = supabase
        .from('sales_data_view')
        .select('*')
        .order('Timestamp', { ascending: false });

      if (profile?.role !== 'admin') {
        query = query.eq('Sales Person', profile?.full_name);
      }

      const { data, error } = await query;
      if (error) throw error;

      const transformed = (data || []).map(row => ({
        date: row.Date,
        month: row.Month,
        product: row.Product,
        facility: row['Facility Name'],
        region: row.Region,
        saleType: row['Type of Sale'],
        salesPerson: row['Sales Person'],
        revenue: parseFloat(row['Revenue (GHS)']) || 0,
        profit: parseFloat(row['Profit (GHS)']) || 0,
        units: parseFloat(row.Units) || 0,
        boxes: parseFloat(row['Boxes Sold']) || 0,
        cost: parseFloat(row['Cost (GHS)']) || 0
      }));

      setSalesData(transformed);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return salesData.filter(item => {
      return (filters.product === 'All Products' || item.product === filters.product) &&
             (filters.region === 'All Regions' || item.region === filters.region) &&
             (filters.saleType === 'All Types' || item.saleType === filters.saleType) &&
             (filters.salesPerson === 'All Sales People' || item.salesPerson === filters.salesPerson);
    });
  }, [salesData, filters]);

  const metrics = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum, d) => sum + d.revenue, 0);
    const totalProfit = filteredData.reduce((sum, d) => sum + d.profit, 0);
    const totalCost = filteredData.reduce((sum, d) => sum + d.cost, 0);
    return {
      totalRevenue,
      totalProfit,
      totalCost,
      margin: totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0,
      transactions: filteredData.length
    };
  }, [filteredData]);

  const monthlyData = useMemo(() => {
    const grouped = {};
    filteredData.forEach(item => {
      if (!grouped[item.month]) grouped[item.month] = { month: item.month, revenue: 0, profit: 0 };
      grouped[item.month].revenue += item.revenue;
      grouped[item.month].profit += item.profit;
    });
    return Object.values(grouped);
  }, [filteredData]);

  const formatCurrency = (value) => {
    if (value >= 1000000) return `₵${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₵${(value / 1000).toFixed(0)}K`;
    return `₵${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            {onBack && <button onClick={onBack} className={`px-4 py-2 rounded-lg mb-2 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>← Back</button>}
            <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Analytics Dashboard</h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {salesData.length} records • Data from Supabase
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadData} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <RefreshCw size={18} />
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <select value={filters.product} onChange={(e) => setFilters({...filters, product: e.target.value})}
            className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <option>All Products</option>
            {[...new Set(salesData.map(d => d.product))].map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={filters.region} onChange={(e) => setFilters({...filters, region: e.target.value})}
            className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <option>All Regions</option>
            {[...new Set(salesData.map(d => d.region))].map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={filters.saleType} onChange={(e) => setFilters({...filters, saleType: e.target.value})}
            className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <option>All Types</option>
            {[...new Set(salesData.map(d => d.saleType))].map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={filters.salesPerson} onChange={(e) => setFilters({...filters, salesPerson: e.target.value})}
            className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <option>All Sales People</option>
            {[...new Set(salesData.map(d => d.salesPerson))].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="text-sm text-gray-500 mb-2">Revenue</div>
            <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <div className="text-sm text-gray-500">{metrics.transactions} sales</div>
          </div>
          <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="text-sm text-gray-500 mb-2">Profit</div>
            <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatCurrency(metrics.totalProfit)}
            </div>
            <div className="text-sm text-gray-500">{metrics.margin.toFixed(1)}% margin</div>
          </div>
          <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="text-sm text-gray-500 mb-2">Cost</div>
            <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatCurrency(metrics.totalCost)}
            </div>
          </div>
          <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="text-sm text-gray-500 mb-2">Transactions</div>
            <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {metrics.transactions}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Revenue & Profit by Month
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
              <Bar dataKey="profit" fill="#10B981" name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
