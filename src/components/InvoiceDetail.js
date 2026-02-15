import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Calendar, User, Package, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateInvoicePDF, downloadBlob } from '../lib/api';

/**
 * INVOICE DETAIL PAGE
 * View single invoice via URL parameter
 * Example: /invoice/INV-2024-001
 */

const InvoiceDetail = ({ darkMode }) => {
  const { invoiceNumber } = useParams();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInvoice();
  }, [invoiceNumber]);

  const loadInvoice = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load invoice header
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_number', invoiceNumber)
        .single();

      if (invoiceError) throw invoiceError;
      
      if (!invoiceData) {
        setError('Invoice not found');
        setLoading(false);
        return;
      }

      setInvoice(invoiceData);

      // Load line items
      const { data: lineItemsData, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceData.id)
        .order('id');

      if (lineItemsError) throw lineItemsError;

      setLineItems(lineItemsData || []);
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const result = await generateInvoicePDF(invoice.id);
      
      if (result.success) {
        downloadBlob(result.blob, `${invoice.invoice_number}.pdf`);
        alert('✅ PDF downloaded successfully!');
      } else {
        alert('❌ Failed to download PDF: ' + result.message);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('❌ Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading invoice...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <div className={`max-w-md w-full p-8 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${darkMode ? 'bg-red-900' : 'bg-red-100'}`}>
              <Package size={32} className="text-red-600" />
            </div>
            <h2 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Invoice Not Found
            </h2>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {error}
            </p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4 md:p-6`}>
      <div className="max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-gray-900'
            } border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <ArrowLeft size={20} />
            Back
          </button>

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-gray-900'
              } border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
            >
              <Printer size={20} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                downloading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span className="hidden sm:inline">Downloading...</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span className="hidden sm:inline">Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Invoice Card */}
        <div className={`rounded-xl overflow-hidden ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          {/* Header Section */}
          <div className={`p-6 border-b ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {invoice.invoice_number}
                </h1>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Invoice Details
                </p>
              </div>

              <div className={`px-4 py-2 rounded-lg text-center ${
                invoice.payment_status === 'Paid'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : invoice.payment_status === 'Pending'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                <div className="text-xs font-medium">Payment Status</div>
                <div className="text-lg font-bold">{invoice.payment_status || 'Pending'}</div>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div>
              <h3 className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Customer Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <User size={18} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                  <div>
                    <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {invoice.customer_name}
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {invoice.region}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Info */}
            <div>
              <h3 className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Invoice Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                  <div>
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Date: </span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User size={18} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                  <div>
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sales Rep: </span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {invoice.salesperson_name || 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package size={18} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                  <div>
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Type: </span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {invoice.sale_type || 'Cash'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="p-6">
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Line Items
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Product
                    </th>
                    <th className={`px-4 py-3 text-right text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Qty
                    </th>
                    <th className={`px-4 py-3 text-right text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Unit Price
                    </th>
                    <th className={`px-4 py-3 text-right text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className={darkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}>
                  {lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        <div className="font-medium">{item.product_name}</div>
                        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {item.product_code || item.product_sku}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {item.units_sold}
                      </td>
                      <td className={`px-4 py-3 text-right ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        ₵{item.unit_price.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ₵{item.line_total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className={`p-6 border-t ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
            <div className="max-w-md ml-auto space-y-2">
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Subtotal:</span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ₵{invoice.subtotal?.toFixed(2) || invoice.total_amount.toFixed(2)}
                </span>
              </div>
              
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Discount:</span>
                  <span className={`font-medium ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                    -₵{invoice.discount_amount.toFixed(2)}
                  </span>
                </div>
              )}
              
              <div className={`flex justify-between pt-2 border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Total:
                </span>
                <span className="text-2xl font-bold text-green-600">
                  ₵{invoice.total_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {invoice.notes && (
            <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Notes:
              </h3>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-900'}>
                {invoice.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
