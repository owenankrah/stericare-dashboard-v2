import React, { useState } from 'react';
import { FileText, PlusCircle, List } from 'lucide-react';
import SalesEntry from './SalesEntry';
import InvoiceList from './InvoiceList';
import InvoiceViewer from './InvoiceViewer';

/**
 * SALES & INVOICING MODULE
 * Main component for Pharma-C sales & invoicing system
 * 
 * Features:
 * - Sales entry with auto-invoice generation
 * - Invoice list with search/filter
 * - PDF generation
 * - Inventory hooks (dormant)
 */

const SalesInvoicingModule = ({ darkMode, setDarkMode, onBack }) => {
  const [currentView, setCurrentView] = useState('list'); // 'list', 'new', 'view'
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  const handleInvoiceCreated = (invoice) => {
    // Switch to list view after creating invoice
    setCurrentView('list');
    setSelectedInvoice(invoice);
  };
  
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setCurrentView('view');
  };
  
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <header className={`border-b ${darkMode ? 'border-gray-800 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  ← Back to Apps
                </button>
                <div>
                  <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Sales & Invoicing
                  </h1>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Pharma-C Medical Supplies (SteriCare)
                  </p>
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'list'
                    ? 'bg-blue-600 text-white'
                    : darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                <List size={18} />
                <span className="hidden sm:inline">Invoices</span>
              </button>
              
              <button
                onClick={() => setCurrentView('new')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'new'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <PlusCircle size={18} />
                <span className="hidden sm:inline">New Sale</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main>
        {currentView === 'list' && (
          <InvoiceList
            darkMode={darkMode}
            onViewInvoice={handleViewInvoice}
          />
        )}
        
        {currentView === 'new' && (
          <SalesEntry
            darkMode={darkMode}
            onInvoiceCreated={handleInvoiceCreated}
          />
        )}
        
        {currentView === 'view' && selectedInvoice && (
          <InvoiceViewer
            darkMode={darkMode}
            invoice={selectedInvoice}
            onBack={() => setCurrentView('list')}
          />
        )}
      </main>
    </div>
  );
};

export default SalesInvoicingModule;
