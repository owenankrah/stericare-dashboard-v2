import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sun, Moon, X, Upload, Download, TrendingUp, Settings, Calendar, Mail, Printer, Share2, RefreshCw, Search, Filter, RotateCcw, Table, FileText, Users } from 'lucide-react';

const SteriCareDashboard = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('All Products');
  const [selectedFacility, setSelectedFacility] = useState('All Facilities');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [selectedQuarter, setSelectedQuarter] = useState('All Time');
  const [selectedSaleType, setSelectedSaleType] = useState('All Types');
  const [selectedSalesPerson, setSelectedSalesPerson] = useState('All Sales People');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [facilitySearch, setFacilitySearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showEmailSchedule, setShowEmailSchedule] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTableView, setShowTableView] = useState(false);
  const [uploadedData, setUploadedData] = useState(null);
  const [salesPeople, setSalesPeople] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const fileInputRef = useRef(null);
  const salesPeopleInputRef = useRef(null);
  const dashboardRef = useRef(null);

  // ==========================================
  // DATA PERSISTENCE & DATABASE INTEGRATION
  // ==========================================
  // Current: localStorage for client-side persistence
  // Future: Supabase database integration
  // 
  // SETUP INSTRUCTIONS:
  // 1. Install Supabase client: npm install @supabase/supabase-js
  // 2. Create Supabase project at https://supabase.com
  // 3. Create tables:
  //    - sales_data (id, user_id, date, month, quarter, product, facility, region, sale_type, sales_person, revenue, discount, boxes, units, cost, profit, margin, created_at)
  //    - sales_people (id, user_id, name, commission_rate, created_at)
  // 4. Set up Row Level Security (RLS) policies
  // 5. Replace SUPABASE_URL and SUPABASE_ANON_KEY in .env file
  // 
  // SUPABASE CLIENT SETUP (Add at top of file):
  // import { createClient } from '@supabase/supabase-js'
  // const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
  // const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY
  // const supabase = createClient(supabaseUrl, supabaseKey)
  // ==========================================

  // Load data from localStorage on mount
  useEffect(() => {
    // ==========================================
    // LOAD DATA FROM STORAGE
    // ==========================================
    // Current: Load from localStorage
    // Future: Load from Supabase
    // 
    // SUPABASE IMPLEMENTATION (when ready):
    // 
    // const loadDataFromSupabase = async () => {
    //   setIsLoading(true);
    //   const user = JSON.parse(localStorage.getItem('user'));
    //   
    //   // Fetch sales data
    //   const { data: salesData, error: salesError } = await supabase
    //     .from('sales_data')
    //     .select('*')
    //     .eq('user_id', user.id)
    //     .order('created_at', { ascending: false });
    //   
    //   if (salesError) {
    //     console.error('Error loading sales data:', salesError);
    //     return;
    //   }
    //   
    //   // Fetch sales people
    //   const { data: peopleData, error: peopleError } = await supabase
    //     .from('sales_people')
    //     .select('*')
    //     .eq('user_id', user.id);
    //   
    //   if (peopleError) {
    //     console.error('Error loading sales people:', peopleError);
    //     return;
    //   }
    //   
    //   // Transform Supabase data to match CSV format
    //   const transformedSalesData = salesData.map(row => ({
    //     Date: row.date,
    //     Month: row.month,
    //     Quarter: row.quarter,
    //     Product: row.product,
    //     'Facility Name': row.facility,
    //     Region: row.region,
    //     'Type of Sale': row.sale_type,
    //     'Sales Person': row.sales_person,
    //     'Revenue (GHS)': row.revenue,
    //     Discount: row.discount,
    //     'Boxes Sold': row.boxes,
    //     Units: row.units,
    //     'Cost (GHS)': row.cost,
    //     'Profit (GHS)': row.profit,
    //     'Margin (%)': row.margin
    //   }));
    //   
    //   setUploadedData(transformedSalesData);
    //   setSalesPeople(peopleData);
    //   setIsLoading(false);
    // };
    // 
    // loadDataFromSupabase();
    // ==========================================

    // Current implementation: Load from localStorage
    const savedData = localStorage.getItem('stericare_sales_data');
    const savedPeople = localStorage.getItem('stericare_sales_people');
    
    if (savedData) {
      try {
        setUploadedData(JSON.parse(savedData));
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
    
    if (savedPeople) {
      try {
        setSalesPeople(JSON.parse(savedPeople));
      } catch (error) {
        console.error('Error loading saved sales people:', error);
      }
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (uploadedData) {
      // ==========================================
      // SAVE DATA TO STORAGE
      // ==========================================
      // Current: Save to localStorage
      // Future: Save to Supabase
      // 
      // SUPABASE IMPLEMENTATION (when ready):
      // 
      // const saveDataToSupabase = async () => {
      //   const user = JSON.parse(localStorage.getItem('user'));
      //   
      //   // Transform CSV format to Supabase schema
      //   const dataToSave = uploadedData.map(row => ({
      //     user_id: user.id,
      //     date: row.Date,
      //     month: row.Month,
      //     quarter: row.Quarter,
      //     product: row.Product,
      //     facility: row['Facility Name'],
      //     region: row.Region,
      //     sale_type: row['Type of Sale'],
      //     sales_person: row['Sales Person'],
      //     revenue: parseFloat(row['Revenue (GHS)']),
      //     discount: parseFloat(row.Discount),
      //     boxes: parseFloat(row['Boxes Sold']),
      //     units: parseFloat(row.Units),
      //     cost: parseFloat(row['Cost (GHS)']),
      //     profit: parseFloat(row['Profit (GHS)']),
      //     margin: parseFloat(row['Margin (%)'])
      //   }));
      //   
      //   // Delete existing data for this user (or use upsert)
      //   await supabase
      //     .from('sales_data')
      //     .delete()
      //     .eq('user_id', user.id);
      //   
      //   // Insert new data
      //   const { error } = await supabase
      //     .from('sales_data')
      //     .insert(dataToSave);
      //   
      //   if (error) {
      //     console.error('Error saving to Supabase:', error);
      //   }
      // };
      // 
      // saveDataToSupabase();
      // ==========================================
      
      // Current implementation: Save to localStorage
      localStorage.setItem('stericare_sales_data', JSON.stringify(uploadedData));
    }
  }, [uploadedData]);

  // Save sales people to localStorage whenever it changes
  useEffect(() => {
    if (salesPeople.length > 0) {
      // ==========================================
      // SAVE SALES PEOPLE TO STORAGE
      // ==========================================
      // Current: Save to localStorage
      // Future: Save to Supabase
      // 
      // SUPABASE IMPLEMENTATION (when ready):
      // 
      // const savePeopleToSupabase = async () => {
      //   const user = JSON.parse(localStorage.getItem('user'));
      //   
      //   const dataToSave = salesPeople.map(person => ({
      //     user_id: user.id,
      //     name: person.name,
      //     commission_rate: person.commissionRate
      //   }));
      //   
      //   // Delete existing sales people for this user
      //   await supabase
      //     .from('sales_people')
      //     .delete()
      //     .eq('user_id', user.id);
      //   
      //   // Insert new data
      //   const { error } = await supabase
      //     .from('sales_people')
      //     .insert(dataToSave);
      //   
      //   if (error) {
      //     console.error('Error saving sales people to Supabase:', error);
      //   }
      // };
      // 
      // savePeopleToSupabase();
      // ==========================================
      
      // Current implementation: Save to localStorage
      localStorage.setItem('stericare_sales_people', JSON.stringify(salesPeople));
    }
  }, [salesPeople]);

  // Parse CSV data
  const rawData = useMemo(() => {
    if (!uploadedData) return [];

    return uploadedData.filter(row => {
      return row.Date && 
             row.Product && 
             !row.Units?.toString().includes('#N/A') &&
             row['Revenue (GHS)'] !== undefined &&
             row['Revenue (GHS)'] !== null &&
             row['Revenue (GHS)'] !== '';
    }).map(row => {
      // Parse date for filtering
      const dateParts = row.Date.split('/');
      const parsedDate = dateParts.length === 3 ? new Date(dateParts[2], dateParts[1] - 1, dateParts[0]) : null;

      return {
        date: row.Date,
        parsedDate,
        month: row.Month,
        quarter: row.Quarter,
        product: row.Product,
        facility: row['Facility Name'],
        region: row.Region,
        saleType: row['Type of Sale'],
        salesPerson: row['Sales Person'] || 'Unassigned',
        revenue: parseFloat(row['Revenue (GHS)']) || 0,
        discount: parseFloat(row.Discount) || 0,
        boxes: parseFloat(row['Boxes Sold']) || 0,
        units: parseFloat(row.Units) || 0,
        cost: parseFloat(row['Cost (GHS)']) || 0,
        profit: parseFloat(row['Profit (GHS)']) || 0,
        margin: parseFloat(row['Margin (%)']) || 0
      };
    });
  }, [uploadedData]);

  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      const productMatch = selectedProduct === 'All Products' || item.product === selectedProduct;
      const facilityMatch = selectedFacility === 'All Facilities' || item.facility === selectedFacility;
      const regionMatch = selectedRegion === 'All Regions' || item.region === selectedRegion;
      const quarterMatch = selectedQuarter === 'All Time' || item.quarter === selectedQuarter;
      const saleTypeMatch = selectedSaleType === 'All Types' || item.saleType === selectedSaleType;
      const salesPersonMatch = selectedSalesPerson === 'All Sales People' || item.salesPerson === selectedSalesPerson;
      
      // Facility search
      const facilitySearchMatch = !facilitySearch || 
        item.facility.toLowerCase().includes(facilitySearch.toLowerCase());
      
      // Date range filter
      let dateMatch = true;
      if (startDate && item.parsedDate) {
        dateMatch = dateMatch && item.parsedDate >= new Date(startDate);
      }
      if (endDate && item.parsedDate) {
        dateMatch = dateMatch && item.parsedDate <= new Date(endDate);
      }
      
      return productMatch && facilityMatch && regionMatch && quarterMatch && 
             saleTypeMatch && salesPersonMatch && facilitySearchMatch && dateMatch;
    });
  }, [rawData, selectedProduct, selectedFacility, selectedRegion, selectedQuarter, 
      selectedSaleType, selectedSalesPerson, facilitySearch, startDate, endDate]);

  const productOptions = useMemo(() => ['All Products', ...new Set(rawData.map(d => d.product))], [rawData]);
  const facilityOptions = useMemo(() => {
    const facilities = ['All Facilities', ...new Set(rawData.map(d => d.facility))];
    if (facilitySearch) {
      return facilities.filter(f => f.toLowerCase().includes(facilitySearch.toLowerCase()));
    }
    return facilities;
  }, [rawData, facilitySearch]);
  const regionOptions = useMemo(() => ['All Regions', ...new Set(rawData.map(d => d.region))], [rawData]);
  const quarterOptions = useMemo(() => ['All Time', ...new Set(rawData.map(d => d.quarter))], [rawData]);
  const saleTypeOptions = useMemo(() => ['All Types', ...new Set(rawData.map(d => d.saleType))], [rawData]);
  const salesPersonOptions = useMemo(() => ['All Sales People', ...new Set(rawData.map(d => d.salesPerson))], [rawData]);

  // Calculate commission for each salesperson
  const salesPersonCommissions = useMemo(() => {
    const grouped = {};
    
    filteredData.forEach(item => {
      const sp = item.salesPerson;
      if (!grouped[sp]) {
        grouped[sp] = {
          salesPerson: sp,
          revenue: 0,
          profit: 0,
          transactions: 0,
          units: 0
        };
      }
      grouped[sp].revenue += item.revenue;
      grouped[sp].profit += item.profit;
      grouped[sp].transactions += 1;
      grouped[sp].units += item.units;
    });

    return Object.values(grouped).map(sp => {
      // Find commission rate from salesPeople data
      const personData = salesPeople.find(p => p.name === sp.salesPerson);
      const commissionRate = personData ? parseFloat(personData.commissionRate) : 0;
      const commission = sp.revenue * (commissionRate / 100);
      
      return {
        ...sp,
        commissionRate,
        commission
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredData, salesPeople]);

  const metrics = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum, d) => sum + d.revenue, 0);
    const totalCost = filteredData.reduce((sum, d) => sum + d.cost, 0);
    const totalProfit = filteredData.reduce((sum, d) => sum + d.profit, 0);
    const totalUnits = filteredData.reduce((sum, d) => sum + d.units, 0);
    const totalBoxes = filteredData.reduce((sum, d) => sum + d.boxes, 0);
    const totalDiscount = filteredData.reduce((sum, d) => sum + d.discount, 0);
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;
    
    const cashSales = filteredData.filter(d => d.saleType === 'Cash');
    const creditSales = filteredData.filter(d => d.saleType === 'Credit');
    const cashRevenue = cashSales.reduce((sum, d) => sum + d.revenue, 0);
    const creditRevenue = creditSales.reduce((sum, d) => sum + d.revenue, 0);
    
    const totalCommission = salesPersonCommissions.reduce((sum, sp) => sum + sp.commission, 0);

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalUnits,
      totalBoxes,
      totalDiscount,
      totalCommission,
      transactions: filteredData.length,
      avgMargin,
      avgTransaction: totalRevenue / filteredData.length || 0,
      maxRevenue: filteredData.length > 0 ? Math.max(...filteredData.map(d => d.revenue)) : 0,
      minRevenue: filteredData.length > 0 ? Math.min(...filteredData.map(d => d.revenue)) : 0,
      avgPricePerUnit: totalRevenue / totalUnits || 0,
      avgCostPerUnit: totalCost / totalUnits || 0,
      cashRevenue,
      creditRevenue,
      cashCount: cashSales.length,
      creditCount: creditSales.length
    };
  }, [filteredData, salesPersonCommissions]);

  const monthlyData = useMemo(() => {
    const grouped = {};
    filteredData.forEach(item => {
      if (!grouped[item.month]) {
        grouped[item.month] = { month: item.month, revenue: 0, profit: 0, cost: 0, units: 0, boxes: 0 };
      }
      grouped[item.month].revenue += item.revenue;
      grouped[item.month].profit += item.profit;
      grouped[item.month].cost += item.cost;
      grouped[item.month].units += item.units;
      grouped[item.month].boxes += item.boxes;
    });

    return Object.values(grouped);
  }, [filteredData]);

  const productData = useMemo(() => {
    const grouped = {};
    filteredData.forEach(item => {
      if (!grouped[item.product]) {
        grouped[item.product] = { product: item.product, revenue: 0, profit: 0, cost: 0, units: 0, boxes: 0 };
      }
      grouped[item.product].revenue += item.revenue;
      grouped[item.product].profit += item.profit;
      grouped[item.product].cost += item.cost;
      grouped[item.product].units += item.units;
      grouped[item.product].boxes += item.boxes;
    });

    return Object.values(grouped).map(item => ({
      ...item,
      margin: (item.profit / item.revenue) * 100
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredData]);

  const regionData = useMemo(() => {
    const grouped = {};
    filteredData.forEach(item => {
      if (!grouped[item.region]) {
        grouped[item.region] = { region: item.region, revenue: 0, profit: 0 };
      }
      grouped[item.region].revenue += item.revenue;
      grouped[item.region].profit += item.profit;
    });

    return Object.values(grouped).map(item => ({
      name: item.region,
      value: item.revenue,
      profit: item.profit
    }));
  }, [filteredData]);

  const facilityData = useMemo(() => {
    const grouped = {};
    filteredData.forEach(item => {
      if (!grouped[item.facility]) {
        grouped[item.facility] = { facility: item.facility, revenue: 0, profit: 0, transactions: 0 };
      }
      grouped[item.facility].revenue += item.revenue;
      grouped[item.facility].profit += item.profit;
      grouped[item.facility].transactions += 1;
    });

    return Object.values(grouped)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredData]);

  const saleTypeData = useMemo(() => {
    return [
      { name: 'Cash', value: metrics.cashRevenue, count: metrics.cashCount },
      { name: 'Credit', value: metrics.creditRevenue, count: metrics.creditCount }
    ].filter(item => item.value > 0);
  }, [metrics]);

  // Reset all filters
  const resetFilters = () => {
    setSelectedProduct('All Products');
    setSelectedFacility('All Facilities');
    setSelectedRegion('All Regions');
    setSelectedQuarter('All Time');
    setSelectedSaleType('All Types');
    setSelectedSalesPerson('All Sales People');
    setStartDate('');
    setEndDate('');
    setFacilitySearch('');
  };

  // Refresh data
  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setLastRefresh(new Date());
      setIsLoading(false);
    }, 1000);
  };

  // CSV Upload Handler
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());

        const parsedData = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const row = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || '';
          });

          parsedData.push(row);
        }

        setUploadedData(parsedData);
        setShowUpload(false);
        setIsLoading(false);
        alert(`Successfully uploaded ${parsedData.filter(r => r.Date && r.Product).length} records!`);
      } catch (error) {
        setIsLoading(false);
        alert('Error parsing CSV. Please check format.');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  // Sales People CSV Upload
  const handleSalesPeopleUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const parsedSalesPeople = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const nameIdx = headers.findIndex(h => h.includes('name'));
          const rateIdx = headers.findIndex(h => h.includes('commission') || h.includes('rate'));

          if (nameIdx >= 0 && rateIdx >= 0 && values[nameIdx]) {
            parsedSalesPeople.push({
              name: values[nameIdx],
              commissionRate: parseFloat(values[rateIdx]) || 0
            });
          }
        }

        setSalesPeople(parsedSalesPeople);
        alert(`Successfully uploaded ${parsedSalesPeople.length} sales people!`);
      } catch (error) {
        alert('Error parsing sales people CSV. Please check format.');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Month', 'Quarter', 'Product', 'Facility', 'Region', 'Sale Type', 'Sales Person', 'Revenue (GHS)', 'Discount', 'Boxes', 'Units', 'Cost (GHS)', 'Profit (GHS)', 'Margin (%)'];
    const rows = filteredData.map(d => [
      d.date,
      d.month,
      d.quarter,
      d.product,
      d.facility,
      d.region,
      d.saleType,
      d.salesPerson,
      d.revenue.toFixed(2),
      d.discount.toFixed(2),
      d.boxes,
      d.units,
      d.cost.toFixed(2),
      d.profit.toFixed(2),
      d.margin.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stericare-sales-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Export to PDF
  const exportToPDF = () => {
    window.print();
  };

  // Share Dashboard
  const shareDashboard = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: 'SteriCare Sales Dashboard',
        text: 'Check out this sales dashboard',
        url: url
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      alert('Dashboard link copied to clipboard!');
    }
  };

  const formatCurrency = (value) => {
    if (value >= 1000000) return `₵${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₵${(value / 1000).toFixed(0)}K`;
    return `₵${value.toFixed(0)}`;
  };

  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444'];

  const MetricCard = ({ title, value, subtitle, icon: Icon, trend }) => {
    return (
      <div className={`p-4 md:p-6 rounded-xl transition-all duration-300 ${
        darkMode
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-white border border-gray-200'
      }`}>
        <div className="flex justify-between items-start mb-2">
          <div className={`text-xs md:text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {title}
          </div>
          {Icon && <Icon size={16} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />}
        </div>
        <div className={`text-xl md:text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {value}
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            {subtitle}
          </div>
          {trend && (
            <span className={`text-xs font-semibold ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    );
  };

  const LoadingSpinner = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-8 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Loading...</p>
      </div>
    </div>
  );

  // Modals
  const UploadModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-2xl w-full rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Upload Sales Data (CSV)
          </h2>
          <button
            onClick={() => setShowUpload(false)}
            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X size={20} className={darkMode ? 'text-white' : 'text-gray-900'} />
          </button>
        </div>

        <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
          darkMode ? 'border-gray-600' : 'border-gray-300'
        }`}>
          <Upload size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Click to upload your SteriCare sales data CSV file
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Select CSV File
          </button>
        </div>

        <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            CSV Format Expected:
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Your CSV should include: Date, Month, Quarter, Product, Facility Name, Region, Type of Sale, Sales Person, Revenue (GHS), Discount, Boxes Sold, Units, Cost (GHS), Profit (GHS), Margin (%)
          </p>
        </div>
      </div>
    </div>
  );

  const SettingsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className={`max-w-2xl w-full my-8 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Settings
          </h2>
          <button
            onClick={() => setShowSettings(false)}
            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X size={20} className={darkMode ? 'text-white' : 'text-gray-900'} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Sales People Upload */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <Users size={20} />
              Sales People & Commission Rates
            </h3>
            <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
              darkMode ? 'border-gray-600' : 'border-gray-300'
            }`}>
              <p className={`mb-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Upload CSV with sales people and commission rates
              </p>
              <input
                ref={salesPeopleInputRef}
                type="file"
                accept=".csv"
                onChange={handleSalesPeopleUpload}
                className="hidden"
              />
              <button
                onClick={() => salesPeopleInputRef.current?.click()}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Upload Sales People CSV
              </button>
              {salesPeople.length > 0 && (
                <p className={`mt-2 text-sm ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  ✓ {salesPeople.length} sales people loaded
                </p>
              )}
            </div>
            <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <strong>Format:</strong> CSV with columns "Name" and "Commission Rate"<br/>
                <strong>Example:</strong> John Doe, 5.5 (for 5.5% commission)
              </p>
            </div>

            {/* Display current sales people */}
            {salesPeople.length > 0 && (
              <div className="mt-4">
                <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Current Sales People:
                </h4>
                <div className="max-h-40 overflow-y-auto">
                  <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                    <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-right">Commission Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesPeople.map((sp, idx) => (
                        <tr key={idx} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <td className="px-3 py-2">{sp.name}</td>
                          <td className="px-3 py-2 text-right">{sp.commissionRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Display Settings */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Display Settings
            </h3>
            <div className="flex items-center justify-between">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Dark Mode</span>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const EmailScheduleModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-md w-full rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Schedule Email Reports
          </h2>
          <button
            onClick={() => setShowEmailSchedule(false)}
            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X size={20} className={darkMode ? 'text-white' : 'text-gray-900'} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              className={`w-full p-3 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Frequency
            </label>
            <select className={`w-full p-3 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}>
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Report Type
            </label>
            <select className={`w-full p-3 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}>
              <option>Summary Report</option>
              <option>Detailed Report</option>
              <option>Commission Report</option>
            </select>
          </div>

          <button
            onClick={() => {
              alert('Email schedule feature will be enabled in the next update!');
              setShowEmailSchedule(false);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
          >
            Schedule Report
          </button>
        </div>
      </div>
    </div>
  );

  const ShareModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-md w-full rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Share Dashboard
          </h2>
          <button
            onClick={() => setShowShareModal(false)}
            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X size={20} className={darkMode ? 'text-white' : 'text-gray-900'} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Dashboard URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={window.location.href}
                readOnly
                className={`flex-1 p-3 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied!');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          <button
            onClick={shareDashboard}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Share2 size={20} />
            Share via Native Share
          </button>
        </div>
      </div>
    </div>
  );

  const TableView = () => (
    <div className={`rounded-xl overflow-hidden ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
      <div className="overflow-x-auto">
        <table className={`w-full ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
          <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium">Product</th>
              <th className="px-4 py-3 text-left text-xs font-medium">Facility</th>
              <th className="px-4 py-3 text-left text-xs font-medium">Region</th>
              <th className="px-4 py-3 text-left text-xs font-medium">Sales Person</th>
              <th className="px-4 py-3 text-right text-xs font-medium">Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-medium">Profit</th>
              <th className="px-4 py-3 text-right text-xs font-medium">Margin</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.slice(0, 100).map((item, idx) => (
              <tr key={idx} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <td className="px-4 py-3 text-xs">{item.date}</td>
                <td className="px-4 py-3 text-xs">{item.product}</td>
                <td className="px-4 py-3 text-xs">{item.facility}</td>
                <td className="px-4 py-3 text-xs">{item.region}</td>
                <td className="px-4 py-3 text-xs">{item.salesPerson}</td>
                <td className="px-4 py-3 text-xs text-right">{formatCurrency(item.revenue)}</td>
                <td className="px-4 py-3 text-xs text-right">{formatCurrency(item.profit)}</td>
                <td className="px-4 py-3 text-xs text-right">{item.margin.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredData.length > 100 && (
        <div className={`p-4 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Showing first 100 of {filteredData.length} records
        </div>
      )}
    </div>
  );

  const InsightsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className={`max-w-6xl w-full my-8 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Sales Analysis & Insights
          </h2>
          <button
            onClick={() => setShowInsights(false)}
            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X size={20} className={darkMode ? 'text-white' : 'text-gray-900'} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Facilities */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Top 10 Facilities by Revenue
            </h3>
            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <tr>
                    <th className="px-3 py-2 text-left">Facility</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                    <th className="px-3 py-2 text-right">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {facilityData.map((item, idx) => (
                    <tr key={idx} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className="px-3 py-2">{item.facility}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.revenue)}</td>
                      <td className="px-3 py-2 text-right">{item.transactions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales Person Commissions */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Sales Person Commissions
            </h3>
            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <tr>
                    <th className="px-3 py-2 text-left">Sales Person</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-right">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {salesPersonCommissions.map((item, idx) => (
                    <tr key={idx} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className="px-3 py-2">{item.salesPerson}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.revenue)}</td>
                      <td className="px-3 py-2 text-right">{item.commissionRate}%</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-500">
                        {formatCurrency(item.commission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
          <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Key Insights:
          </h4>
          <ul className={`text-sm space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <li>• Total Revenue: {formatCurrency(metrics.totalRevenue)} from {metrics.transactions} transactions</li>
            <li>• Total Commission Payout: {formatCurrency(metrics.totalCommission)}</li>
            <li>• Average Margin: {metrics.avgMargin.toFixed(1)}% across all products</li>
            <li>• Cash vs Credit: {formatCurrency(metrics.cashRevenue)} ({metrics.cashCount} sales) vs {formatCurrency(metrics.creditRevenue)} ({metrics.creditCount} sales)</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={dashboardRef} className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-after: always; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto p-2 md:p-4 lg:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className={`text-2xl md:text-3xl lg:text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              SteriCare Medical Products
            </h1>
            <p className={`text-xs md:text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Sales & Profitability Analytics Dashboard
              {uploadedData && <span className="ml-2 text-green-500">• {rawData.length} records</span>}
              {!uploadedData && <span className="ml-2 text-orange-500">• Upload data to begin</span>}
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 no-print">
            <button
              onClick={refreshData}
              className={`p-2 md:p-3 rounded-lg transition-colors duration-300 ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700 text-blue-400' : 'bg-white hover:bg-gray-100 text-blue-600'
              }`}
              title="Refresh Data"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className={`p-2 md:p-3 rounded-lg transition-colors duration-300 ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700 text-green-400' : 'bg-white hover:bg-gray-100 text-green-600'
              }`}
              title="Upload CSV"
            >
              <Upload size={18} />
            </button>
            {uploadedData && (
              <>
                <button
                  onClick={exportToCSV}
                  className={`p-2 md:p-3 rounded-lg transition-colors duration-300 ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-700 text-purple-400' : 'bg-white hover:bg-gray-100 text-purple-600'
                  }`}
                  title="Export CSV"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={exportToPDF}
                  className={`p-2 md:p-3 rounded-lg transition-colors duration-300 ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-700 text-red-400' : 'bg-white hover:bg-gray-100 text-red-600'
                  }`}
                  title="Export PDF / Print"
                >
                  <FileText size={18} />
                </button>
                <button
                  onClick={() => setShowTableView(!showTableView)}
                  className={`p-2 md:p-3 rounded-lg transition-colors duration-300 ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' : 'bg-white hover:bg-gray-100 text-yellow-600'
                  }`}
                  title="Toggle Table View"
                >
                  <Table size={18} />
                </button>
                <button
                  onClick={() => setShowInsights(true)}
                  className={`p-2 md:p-3 rounded-lg transition-colors duration-300 ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-700 text-orange-400' : 'bg-white hover:bg-gray-100 text-orange-600'
                  }`}
                  title="View Insights"
                >
                  <TrendingUp size={18} />
                </button>
                <button
                  onClick={() => setShowEmailSchedule(true)}
                  className={`p-2 md:p-3 rounded-lg transition-colors duration-300 ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-700 text-pink-400' : 'bg-white hover:bg-gray-100 text-pink-600'
                  }`}
                  title="Schedule Email"
                >
                  <Mail size={18} />
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className={`p-2 md:p-3 rounded-lg transition-colors duration-300 ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-700 text-indigo-400' : 'bg-white hover:bg-gray-100 text-indigo-600'
                  }`}
                  title="Share Dashboard"
                >
                  <Share2 size={18} />
                </button>
              </>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className={`p-2 md:p-3 rounded-lg transition-colors duration-300 ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-white hover:bg-gray-100 text-gray-600'
              }`}
              title="Settings"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 md:p-3 rounded-lg transition-colors duration-300 ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' : 'bg-white hover:bg-gray-100 text-gray-700'
              }`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {uploadedData ? (
          <>
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6 no-print">
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className={`p-2 md:p-3 text-sm rounded-lg transition-colors duration-300 ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                } border`}
              >
                {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>

              <div className="relative">
                <Search size={16} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search facility..."
                  value={facilitySearch}
                  onChange={(e) => setFacilitySearch(e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 md:py-3 text-sm rounded-lg border ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>

              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                className={`p-2 md:p-3 text-sm rounded-lg transition-colors duration-300 ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                } border`}
              >
                {facilityOptions.slice(0, 50).map(f => <option key={f} value={f}>{f}</option>)}
              </select>

              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className={`p-2 md:p-3 text-sm rounded-lg transition-colors duration-300 ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                } border`}
              >
                {regionOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>

              <select
                value={selectedSaleType}
                onChange={(e) => setSelectedSaleType(e.target.value)}
                className={`p-2 md:p-3 text-sm rounded-lg transition-colors duration-300 ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                } border`}
              >
                {saleTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <select
                value={selectedSalesPerson}
                onChange={(e) => setSelectedSalesPerson(e.target.value)}
                className={`p-2 md:p-3 text-sm rounded-lg transition-colors duration-300 ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                } border`}
              >
                {salesPersonOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Date Range & Reset */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 no-print">
              <div>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full p-2 md:p-3 text-sm rounded-lg border ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full p-2 md:p-3 text-sm rounded-lg border ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 md:py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 md:gap-4 mb-6 md:mb-8">
              <MetricCard
                title="Revenue"
                value={formatCurrency(metrics.totalRevenue)}
                subtitle={`${metrics.transactions} sales`}
              />
              <MetricCard
                title="Profit"
                value={formatCurrency(metrics.totalProfit)}
                subtitle={`${metrics.avgMargin.toFixed(1)}% margin`}
              />
              <MetricCard
                title="Cost"
                value={formatCurrency(metrics.totalCost)}
                subtitle={`${metrics.totalUnits.toLocaleString()} units`}
              />
              <MetricCard
                title="Units"
                value={metrics.totalUnits.toLocaleString()}
                subtitle={`${metrics.totalBoxes.toLocaleString()} boxes`}
              />
              <MetricCard
                title="Cash"
                value={formatCurrency(metrics.cashRevenue)}
                subtitle={`${metrics.cashCount} sales`}
              />
              <MetricCard
                title="Credit"
                value={formatCurrency(metrics.creditRevenue)}
                subtitle={`${metrics.creditCount} sales`}
              />
              <MetricCard
                title="Commission"
                value={formatCurrency(metrics.totalCommission)}
                subtitle="Total payout"
              />
            </div>

            {showTableView ? (
              <TableView />
            ) : (
              <>
                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6 print-break">
                  <div className={`p-4 md:p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                    <h3 className={`text-base md:text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Revenue & Profit by Month (GHS)
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                        <XAxis dataKey="month" stroke={darkMode ? '#9CA3AF' : '#6B7280'} fontSize={12} />
                        <YAxis stroke={darkMode ? '#9CA3AF' : '#6B7280'} tickFormatter={formatCurrency} fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                            border: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value) => formatCurrency(value)}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                        <Bar dataKey="profit" fill="#10B981" name="Profit" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className={`p-4 md:p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                    <h3 className={`text-base md:text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Revenue by Product (GHS)
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={productData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                        <XAxis type="number" stroke={darkMode ? '#9CA3AF' : '#6B7280'} tickFormatter={formatCurrency} fontSize={12} />
                        <YAxis type="category" dataKey="product" stroke={darkMode ? '#9CA3AF' : '#6B7280'} width={120} fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                            border: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value) => formatCurrency(value)}
                        />
                        <Bar dataKey="revenue" fill="#8B5CF6" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
                  <div className={`p-4 md:p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                    <h3 className={`text-base md:text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Revenue by Region (GHS)
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={regionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {regionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                            border: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className={`p-4 md:p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                    <h3 className={`text-base md:text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Cash vs Credit Sales
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={saleTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {saleTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#F59E0B'} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                            border: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Profit Margin Chart */}
                <div className={`p-4 md:p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                  <h3 className={`text-base md:text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Profit Margin by Product (%)
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={productData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                      <XAxis dataKey="product" stroke={darkMode ? '#9CA3AF' : '#6B7280'} angle={-45} textAnchor="end" height={100} fontSize={10} />
                      <YAxis stroke={darkMode ? '#9CA3AF' : '#6B7280'} label={{ value: 'Margin (%)', angle: -90, position: 'insideLeft', fontSize: 12 }} fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                          border: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value) => `${value.toFixed(1)}%`}
                      />
                      <Bar dataKey="margin" fill="#F59E0B" name="Margin %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </>
        ) : (
          <div className={`text-center py-12 md:py-20 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl`}>
            <Upload size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`text-xl md:text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              No Data Loaded
            </h3>
            <p className={`text-base md:text-lg mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Upload your SteriCare Sales Record CSV to view analytics
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Upload CSV File
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {isLoading && <LoadingSpinner />}
      {showUpload && <UploadModal />}
      {showSettings && <SettingsModal />}
      {showEmailSchedule && <EmailScheduleModal />}
      {showShareModal && <ShareModal />}
      {showInsights && <InsightsModal />}
    </div>
  );
};

export default SteriCareDashboard;
