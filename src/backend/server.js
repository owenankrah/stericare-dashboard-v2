/**
 * PHARMA-C BACKEND SERVER
 * Node.js/Express API Server
 * 
 * Features:
 * - PDF Invoice Generation
 * - Admin User Creation (service role key)
 * - File uploads/exports
 * - Server-side operations
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// ==========================================
// SUPABASE SETUP
// ==========================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Server-side only!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ==========================================
// MIDDLEWARE
// ==========================================
// Configure CORS for your domain
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Pharma-C Backend API',
    version: '2.0',
    endpoints: {
      health: 'GET /health',
      invoicePDF: 'POST /api/invoices/pdf',
      createUser: 'POST /api/admin/users',
      exportData: 'GET /api/export/:type'
    }
  });
});

// ==========================================
// PDF GENERATION ENDPOINT
// ==========================================
app.post('/api/invoices/pdf', async (req, res) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }

    // Fetch invoice with line items
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_line_items (*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      console.error('Invoice fetch error:', invoiceError);
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Generate PDF using PDFKit
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${invoice.invoice_number}.pdf`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // ==========================================
    // PDF CONTENT - PHARMA-C BRANDING
    // ==========================================

    // Header - Company Logo & Name
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text('PHARMA-C MEDICAL SUPPLIES LTD', 50, 50);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text('SteriCare Brand Medical Products', 50, 80)
      .text('Accra, Ghana', 50, 95)
      .text('Phone: +233 XX XXX XXXX', 50, 110)
      .text('Email: info@pharmacmedical.com', 50, 125);

    // Invoice Title
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('INVOICE', 400, 50, { align: 'right' });

    // Invoice Details Box
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Invoice #: ${invoice.invoice_number}`, 400, 80, { align: 'right' })
      .text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 400, 95, { align: 'right' })
      .text(`Status: ${invoice.payment_status}`, 400, 110, { align: 'right' });

    // Customer Information
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('BILL TO:', 50, 160);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(invoice.customer_name, 50, 180)
      .text(`Region: ${invoice.region}`, 50, 195)
      .text(`Sale Type: ${invoice.sale_type}`, 50, 210);

    // Salesperson
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Sales Person:', 400, 180, { align: 'right', width: 100 })
      .font('Helvetica')
      .text(invoice.salesperson_name, 400, 195, { align: 'right', width: 100 });

    // Line Items Table
    const tableTop = 250;
    let currentY = tableTop;

    // Table Headers
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .rect(50, currentY, 495, 25)
      .fill('#1e40af');

    doc
      .fillColor('#ffffff')
      .text('Product', 60, currentY + 7, { width: 200 })
      .text('Qty', 270, currentY + 7, { width: 50, align: 'right' })
      .text('Unit Price', 330, currentY + 7, { width: 60, align: 'right' })
      .text('Discount', 400, currentY + 7, { width: 60, align: 'right' })
      .text('Total', 470, currentY + 7, { width: 65, align: 'right' });

    currentY += 30;

    // Line Items
    doc.fillColor('#000000').font('Helvetica');

    invoice.invoice_line_items.forEach((item, index) => {
      const bgColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';

      doc
        .rect(50, currentY, 495, 20)
        .fill(bgColor);

      doc
        .fillColor('#000000')
        .fontSize(9)
        .text(item.product_name, 60, currentY + 5, { width: 200 })
        .text(item.units_sold.toString(), 270, currentY + 5, { width: 50, align: 'right' })
        .text(`₵${item.unit_price.toFixed(2)}`, 330, currentY + 5, { width: 60, align: 'right' })
        .text(`₵${item.discount_amount.toFixed(2)}`, 400, currentY + 5, { width: 60, align: 'right' })
        .text(`₵${item.line_total.toFixed(2)}`, 470, currentY + 5, { width: 65, align: 'right' });

      currentY += 20;
    });

    // Totals Section
    currentY += 20;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Subtotal:', 400, currentY, { align: 'right', width: 100 })
      .font('Helvetica')
      .text(`₵${invoice.subtotal.toFixed(2)}`, 510, currentY, { align: 'right' });

    currentY += 20;

    if (invoice.discount_amount > 0) {
      doc
        .font('Helvetica-Bold')
        .text('Discount:', 400, currentY, { align: 'right', width: 100 })
        .font('Helvetica')
        .text(`-₵${invoice.discount_amount.toFixed(2)}`, 510, currentY, { align: 'right' });

      currentY += 20;
    }

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TOTAL:', 400, currentY, { align: 'right', width: 100 })
      .fontSize(14)
      .text(`₵${invoice.total_amount.toFixed(2)}`, 510, currentY, { align: 'right' });

    // Notes section
    if (invoice.notes) {
      currentY += 40;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Notes:', 50, currentY)
        .font('Helvetica')
        .text(invoice.notes, 50, currentY + 15, { width: 495 });
    }

    // Footer
    const footerY = 750;
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Thank you for your business!', 50, footerY, { align: 'center', width: 495 })
      .text('This invoice is VAT-exempt', 50, footerY + 15, { align: 'center', width: 495 })
      .text('For inquiries: info@pharmacmedical.com', 50, footerY + 30, { align: 'center', width: 495 });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF',
      details: error.message 
    });
  }
});

// ==========================================
// ADMIN: CREATE USER ENDPOINT
// ==========================================
app.post('/api/admin/users', async (req, res) => {
  try {
    const { email, password, fullName, role, commissionRate } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        error: 'Email, password, and full name are required' 
      });
    }

    if (!['admin', 'manager', 'sales_rep'].includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role. Must be admin, manager, or sales_rep' 
      });
    }

    // Create auth user (requires service role key)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm
      user_metadata: {
        full_name: fullName,
        role: role
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return res.status(400).json({ 
        error: 'Failed to create user',
        details: authError.message 
      });
    }

    // User profile is automatically created by trigger
    // But we need to update the role and commission
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        role: role,
        commission_rate: commissionRate || 0
      })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      // Don't fail - profile was created, just role update failed
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName: fullName,
        role: role
      }
    });

  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// ==========================================
// EXPORT DATA ENDPOINTS
// ==========================================
app.get('/api/export/sales', async (req, res) => {
  try {
    const { startDate, endDate, salesperson, region } = req.query;

    let query = supabase
      .from('sales_data_view')
      .select('*')
      .order('Date', { ascending: false });

    // Apply filters
    if (startDate) query = query.gte('Date', startDate);
    if (endDate) query = query.lte('Date', endDate);
    if (salesperson) query = query.eq('Sales Person', salesperson);
    if (region) query = query.eq('Region', region);

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Convert to CSV
    if (data && data.length > 0) {
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sales-export.csv');
      res.send(csv);
    } else {
      res.status(404).json({ error: 'No data found' });
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Export failed',
      details: error.message 
    });
  }
});

app.get('/api/export/inventory', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        products (sku, name, category, unit_price, cost_per_unit)
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (data && data.length > 0) {
      // Flatten the data
      const flatData = data.map(item => ({
        SKU: item.products.sku,
        Product: item.products.name,
        Category: item.products.category,
        'Units in Stock': item.units_in_stock,
        'Boxes in Stock': item.boxes_in_stock,
        'Reorder Level': item.reorder_level,
        'Unit Price': item.products.unit_price,
        'Cost per Unit': item.products.cost_per_unit,
        'Location': item.warehouse_location || '',
        'Last Updated': item.updated_at
      }));

      const headers = Object.keys(flatData[0]);
      const csv = [
        headers.join(','),
        ...flatData.map(row => 
          headers.map(header => row[header]).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory-export.csv');
      res.send(csv);
    } else {
      res.status(404).json({ error: 'No data found' });
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Export failed',
      details: error.message 
    });
  }
});

// ==========================================
// ERROR HANDLING
// ==========================================
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: error.message 
  });
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log('==========================================');
  console.log('  PHARMA-C BACKEND SERVER');
  console.log('==========================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ API docs: http://localhost:${PORT}/`);
  console.log('==========================================');
  console.log('Available endpoints:');
  console.log('  POST /api/invoices/pdf - Generate PDF invoice');
  console.log('  POST /api/admin/users - Create user (admin)');
  console.log('  GET  /api/export/sales - Export sales data');
  console.log('  GET  /api/export/inventory - Export inventory');
  console.log('==========================================');
});

module.exports = app;
