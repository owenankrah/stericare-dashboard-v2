import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * INVOICE VIEWER COMPONENT
 * Detailed view of a single invoice
 */

const InvoiceViewer = ({ darkMode, invoice: initialInvoice, onBack }) => {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  useEffect(() => {
    getCurrentUser();
    // Load full invoice details if needed
    if (initialInvoice && !initialInvoice.invoice_line_items) {
      loadFullInvoice();
    }
  }, [initialInvoice]);
  
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
  
  const loadFullInvoice = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_line_items (*)
        `)
        .eq('id', initialInvoice.id)
        .single();
      
      if (error) throw error;
      setInvoice(data);
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const downloadPDF = async () => {
    try {
      const response = await fetch('/api/invoices/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id })
      });
      
      if (!response.ok) throw new Error('PDF generation failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      a.click();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    }
  };
  
  const printInvoice = () => {
    window.print();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!invoice) {
    return <div>Invoice not found</div>;
  }
  
  return (
    <div className={`max-w-4xl mx-auto p-4 md:p-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Actions */}
      <div className="flex justify-between items-center mb-6 no-print">
        <button
          onClick={onBack}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            darkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
          }`}
        >
          <ArrowLeft size={18} />
          Back
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={printInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Printer size={18} />
            Print
          </button>
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </div>
      
      {/* Invoice Content */}
      <div id="invoice-content" className={`p-8 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-600 mb-2">PHARMA-C</h1>
            <p className="text-sm">Medical Supplies Ltd</p>
            <p className="text-sm">SteriCare Brand</p>
            <p className="text-sm">Accra, Ghana</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold mb-2">INVOICE</h2>
            <p className="text-sm"><strong>Invoice #:</strong> {invoice.invoice_number}</p>
            <p className="text-sm"><strong>Date:</strong> {new Date(invoice.invoice_date).toLocaleDateString()}</p>
            <p className="text-sm text-gray-500">{invoice.month} • {invoice.quarter}</p>
          </div>
        </div>
        
        {/* Customer & Sale Info */}
        <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-300">
          <div>
            <h3 className="font-bold mb-2">BILL TO:</h3>
            <p className="font-semibold">{invoice.customer_name}</p>
            <p className="text-sm">{invoice.region}</p>
          </div>
          <div className="text-right">
            <p className="text-sm"><strong>Sale Type:</strong> {invoice.sale_type}</p>
            <p className="text-sm"><strong>Salesperson:</strong> {invoice.salesperson_name}</p>
            <p className="text-sm">
              <strong>Status:</strong> {' '}
              <span className={`px-2 py-1 rounded text-xs ${
                invoice.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {invoice.status}
              </span>
            </p>
          </div>
        </div>
        
        {/* Line Items Table */}
        <table className="w-full mb-8">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.invoice_line_items?.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="px-4 py-3">{item.product_name}</td>
                <td className="px-4 py-3 text-right">{item.units_sold}</td>
                <td className="px-4 py-3 text-right">₵{item.unit_price.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">₵{item.line_subtotal.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-semibold">₵{item.line_total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>₵{invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between mb-2 text-red-600">
                <span>Discount:</span>
                <span>-₵{invoice.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t-2 border-blue-600 text-xl font-bold">
              <span>TOTAL:</span>
              <span className="text-blue-600">₵{invoice.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Notes */}
        {invoice.notes && (
          <div className="mb-8">
            <h3 className="font-bold mb-2">Notes:</h3>
            <p className="text-sm">{invoice.notes}</p>
          </div>
        )}
        
        {/* Footer */}
        <div className="text-center pt-8 border-t border-gray-300">
          <p className="text-xs text-gray-500">* This invoice is VAT-exempt</p>
          <p className="text-xs text-gray-500 mt-2">Thank you for your business!</p>
          <p className="text-xs text-gray-500">For inquiries: info@pharmacmedical.com</p>
        </div>
      </div>
      
      {/* Analytics (not printed) - Only visible to admin/manager */}
      {(currentUser?.profile?.role === 'admin' || currentUser?.profile?.role === 'manager') && (
        <div className={`mt-6 p-6 rounded-xl no-print ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h3 className="font-bold mb-4">Financial Analytics (Admin Only)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Cost</p>
              <p className="text-lg font-semibold">₵{invoice.total_cost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Profit</p>
              <p className="text-lg font-semibold text-green-600">₵{invoice.total_profit.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Margin</p>
              <p className="text-lg font-semibold">{invoice.margin_percentage.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Status</p>
              <p className="text-lg font-semibold">{invoice.payment_status}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceViewer;
