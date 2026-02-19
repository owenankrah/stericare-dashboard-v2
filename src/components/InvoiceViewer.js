import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { downloadBlob } from '../lib/api';
import { generateInvoicePDFClient } from '../lib/clientPDF';

/**
 * INVOICE VIEWER COMPONENT (CORRECTED)
 * Fixes applied:
 * - useCallback for loadFullInvoice (prevents infinite loops)
 * - useCallback for getCurrentUser (correct dependencies)
 * - Safe numeric conversions (prevents toFixed crashes)
 * - Proper empty invoice handling
 */

const InvoiceViewer = ({ darkMode, invoice: initialInvoice }) => {
  const [invoice, setInvoice] = useState(initialInvoice ?? null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  // ✅ FIX 1: Wrap getCurrentUser in useCallback
  const getCurrentUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser({ ...user, profile });
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  }, []);

  // ✅ FIX 2: Wrap loadFullInvoice in useCallback
  const loadFullInvoice = useCallback(async () => {
    if (!initialInvoice?.id) return;

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
      setInvoice(data ?? {});
    } catch (err) {
      console.error('Error loading invoice:', err);
      setInvoice({});
    } finally {
      setLoading(false);
    }
  }, [initialInvoice?.id]);

  // ✅ FIX 3: Correct useEffect dependencies
  useEffect(() => {
    getCurrentUser();
    
    if (initialInvoice && !initialInvoice.invoice_line_items) {
      loadFullInvoice();
    }
  }, [initialInvoice, getCurrentUser, loadFullInvoice]);

  // ✅ FIX 4: Safe numeric converter helper
  const safeNumber = (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  const downloadPDF = async () => {
    if (!invoice) return;
    setLoading(true);
    try {
      const result = await generateInvoicePDF(invoice.id);
      if (!result?.success) {
        console.log('Backend PDF failed, using client-side generation');
        await generateInvoicePDFClient(invoice);
      } else {
        downloadBlob(result.blob, `${invoice.invoice_number ?? 'invoice'}.pdf`);
      }
      alert('✅ PDF downloaded successfully!');
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('❌ Failed to download PDF');
    } finally {
      setLoading(false);
    }
  };

  const printInvoice = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ✅ FIX 5: Better empty invoice check
  if (!invoice || !invoice.id) {
    return (
      <div className={`flex items-center justify-center h-96 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <div className="text-center">
          <p className="text-xl font-semibold mb-4">Invoice not found</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ✅ FIX 6: Use safeNumber for all numeric values
  const subtotal = safeNumber(invoice.subtotal);
  const discount = safeNumber(invoice.discount_amount);
  const total = safeNumber(invoice.total_amount);
  const totalCost = safeNumber(invoice.total_cost);
  const totalProfit = safeNumber(invoice.total_profit);
  const margin = safeNumber(invoice.margin_percentage);

  return (
    <div className={`max-w-4xl mx-auto p-4 md:p-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Actions */}
      <div className="flex justify-between items-center mb-6 no-print">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            darkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
          }`}
        >
          <ArrowLeft size={18} /> Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={printInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Printer size={18} /> Print
          </button>
          <button
            onClick={downloadPDF}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            <Download size={18} /> {loading ? 'Generating...' : 'Download PDF'}
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
            <p className="text-sm"><strong>Invoice #:</strong> {invoice.invoice_number ?? '-'}</p>
            <p className="text-sm"><strong>Date:</strong> {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '-'}</p>
            <p className="text-sm text-gray-500">{invoice.month ?? '-'} • {invoice.quarter ?? '-'}</p>
          </div>
        </div>

        {/* Customer & Sale Info */}
        <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-300">
          <div>
            <h3 className="font-bold mb-2">BILL TO:</h3>
            <p className="font-semibold">{invoice.customer_name ?? '-'}</p>
            <p className="text-sm">{invoice.region ?? '-'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm"><strong>Sale Type:</strong> {invoice.sale_type ?? '-'}</p>
            <p className="text-sm"><strong>Salesperson:</strong> {invoice.salesperson_name ?? '-'}</p>
            <p className="text-sm">
              <strong>Status:</strong> {' '}
              <span className={`px-2 py-1 rounded text-xs ${
                invoice.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {invoice.status ?? '-'}
              </span>
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        {invoice.invoice_line_items?.length > 0 ? (
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
              {invoice.invoice_line_items.map((item, index) => {
                // ✅ FIX 7: Safe numeric conversion for line items
                const qty = safeNumber(item.units_sold);
                const unitPrice = safeNumber(item.unit_price);
                const lineSubtotal = safeNumber(item.line_subtotal);
                const lineTotal = safeNumber(item.line_total);

                return (
                  <tr key={item.id ?? index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3">{item.product_name ?? '-'}</td>
                    <td className="px-4 py-3 text-right">{qty}</td>
                    <td className="px-4 py-3 text-right">₵{unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">₵{lineSubtotal.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold">₵{lineTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No line items available.</p>
        )}

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>₵{subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between mb-2 text-red-600">
                <span>Discount:</span>
                <span>-₵{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t-2 border-blue-600 text-xl font-bold">
              <span>TOTAL:</span>
              <span className="text-blue-600">₵{total.toFixed(2)}</span>
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

      {/* Analytics (Admin/Manager only) */}
      {(currentUser?.profile?.role === 'admin' || currentUser?.profile?.role === 'manager') && (
        <div className={`mt-6 p-6 rounded-xl no-print ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h3 className="font-bold mb-4">Financial Analytics (Admin Only)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Cost</p>
              <p className="text-lg font-semibold">₵{totalCost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Profit</p>
              <p className="text-lg font-semibold text-green-600">₵{totalProfit.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Margin</p>
              <p className="text-lg font-semibold">{margin.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Status</p>
              <p className="text-lg font-semibold">{invoice.payment_status ?? '-'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceViewer;
