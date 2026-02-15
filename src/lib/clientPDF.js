import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateInvoicePDFClient = (invoice) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // Blue
  doc.text('PHARMA-C', 20, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Medical Supplies Ltd', 20, 27);
  doc.text('SteriCare Brand', 20, 32);
  
  // Invoice Info
  doc.setFontSize(16);
  doc.text('INVOICE', 150, 20);
  doc.setFontSize(10);
  doc.text(`Invoice #: ${invoice.invoice_number}`, 150, 27);
  doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 150, 32);
  
  // Customer Info
  doc.setFontSize(12);
  doc.text('BILL TO:', 20, 45);
  doc.setFontSize(10);
  doc.text(invoice.customer_name, 20, 52);
  doc.text(invoice.region, 20, 57);
  
  // Line Items Table
  const tableData = invoice.invoice_line_items?.map(item => [
    item.product_name,
    item.units_sold.toString(),
    `₵${item.unit_price.toFixed(2)}`,
    `₵${item.line_total.toFixed(2)}`
  ]) || [];
  
  doc.autoTable({
    startY: 70,
    head: [['Product', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] },
  });
  
  // Totals
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text(`Subtotal: ₵${invoice.subtotal.toFixed(2)}`, 140, finalY);
  if (invoice.discount_amount > 0) {
    doc.text(`Discount: -₵${invoice.discount_amount.toFixed(2)}`, 140, finalY + 7);
  }
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(`TOTAL: ₵${invoice.total_amount.toFixed(2)}`, 140, finalY + (invoice.discount_amount > 0 ? 14 : 7));
  
  // Footer
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text('Thank you for your business!', 105, 280, { align: 'center' });
  
  // Save
  doc.save(`${invoice.invoice_number}.pdf`);
  
  return { success: true };
};