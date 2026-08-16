import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from './supabase';
import { buildInvoicePDFBlob, generateInvoicePDFClient } from './clientPDF';

const dataOf = async (request) => { const { data, error } = await request; if (error) throw error; return data; };
export function clearCache() {}
export function prefetch() { return Promise.resolve(); }
export function prefetchCommonData() { return Promise.resolve(); }
export function startKeepAlive() {}
export function stopKeepAlive() {}
export async function checkBackendHealth() { const { error } = await supabase.from('products').select('id').limit(1); return { success: !error, provider: 'supabase', error: error?.message }; }
export function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); return { success: true }; }
export const formatCurrency = (amount, currency = 'GHS') => new Intl.NumberFormat('en-GH', { style: 'currency', currency }).format(Number(amount || 0));
export function formatDate(date, format = 'short') { const d = new Date(date); if (format === 'long') return d.toLocaleDateString('en-GH', { year: 'numeric', month: 'long', day: 'numeric' }); return format === 'short' ? d.toLocaleDateString('en-GH') : d.toISOString(); }

// Invoices
export const getInvoices = () => dataOf(supabase.from('invoices').select('*, invoice_line_items(*)').order('created_at', { ascending: false }));
export const getInvoice = (id) => dataOf(supabase.from('invoices').select('*, invoice_line_items(*)').eq('id', id).single());
export const createInvoice = (value) => dataOf(supabase.from('invoices').insert(value).select().single());
export const updateInvoice = (id, value) => dataOf(supabase.from('invoices').update(value).eq('id', id).select().single());
export async function deleteInvoice(id) { const { error } = await supabase.from('invoices').delete().eq('id', id); if (error) throw error; return { success: true }; }
export async function generateInvoicePDF(invoiceId) { try { return { success: true, blob: buildInvoicePDFBlob(await getInvoice(invoiceId)) }; } catch (error) { return { success: false, message: error.message }; } }

const crud = (table) => ({
  list: () => dataOf(supabase.from(table).select('*').order('name')),
  get: (id) => dataOf(supabase.from(table).select('*').eq('id', id).single()),
  create: (value) => dataOf(supabase.from(table).insert(value).select().single()),
  update: (id, value) => dataOf(supabase.from(table).update(value).eq('id', id).select().single()),
  remove: async (id) => { const { error } = await supabase.from(table).delete().eq('id', id); if (error) throw error; return { success: true }; }
});
const products = crud('products'); const customers = crud('customers');
export const getProducts = products.list, getProduct = products.get, createProduct = products.create, updateProduct = products.update, deleteProduct = products.remove;
export const getCustomers = customers.list, getCustomer = customers.get, createCustomer = customers.create, updateCustomer = customers.update, deleteCustomer = customers.remove;

// Inventory
const inventoryQuery = () => supabase.from('inventory').select('*, products(*)');
export const getInventory = () => dataOf(inventoryQuery());
export const getInventoryItem = (id) => dataOf(inventoryQuery().eq('id', id).single());
export const updateInventory = (id, value) => dataOf(supabase.from('inventory').update(value).eq('id', id).select('*, products(*)').single());
const totalUnits = (item) => Number(item.boxes_in_stock || 0) * Number(item.units_per_box || 0) + Number(item.loose_units_in_stock || 0);
function inventorySummary(rows) { const values = rows.map((item) => ({ units: totalUnits(item), reorder: Number(item.products?.reorder_level || 0), value: totalUnits(item) * Number(item.products?.unit_cost || item.products?.cost_price || 0) })); return { totalItems: rows.length, totalUnits: values.reduce((s, i) => s + i.units, 0), totalValue: values.reduce((s, i) => s + i.value, 0), lowStockCount: values.filter((i) => i.units > 0 && i.units <= i.reorder).length, outOfStockCount: values.filter((i) => i.units === 0).length }; }
export async function getInventoryReport() { const inventory = await getInventory(); return { success: true, data: { inventory, summary: inventorySummary(inventory) } }; }
export async function getInventoryAnalytics() { const rows = await getInventory(); return { success: true, data: { analytics: inventorySummary(rows) } }; }
export async function getLowStockAlerts() { const rows = await getInventory(); const lowStock = rows.filter((i) => totalUnits(i) <= Number(i.products?.reorder_level || 0)).map((i) => ({ ...i, productName: i.products?.name, currentStock: totalUnits(i), reorderLevel: Number(i.products?.reorder_level || 0) })); return { success: true, data: { alerts: { lowStock, totalAlerts: lowStock.length } } }; }
export async function getStockMovements(params = {}) { let query = supabase.from('inventory_movements').select('*').order('created_at', { ascending: false }); if (params.product_id) query = query.eq('product_id', params.product_id); return dataOf(query); }
export const adjustStock = (id, quantity, reason) => dataOf(supabase.rpc('adjust_inventory_stock', { inventory_id: id, quantity_delta: quantity, adjustment_reason: reason }));
const csvCell = (value) => { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; };
export async function exportInventoryCSV() { const rows = await getInventory(); const header = ['Product','SKU','Boxes','Loose Units','Units Per Box','Total Units','Reorder Level']; const body = rows.map((i) => [i.products?.name, i.products?.sku || i.products?.code, i.boxes_in_stock, i.loose_units_in_stock, i.units_per_box, totalUnits(i), i.products?.reorder_level].map(csvCell).join(',')); return { success: true, blob: new Blob([[header.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' }) }; }
export async function exportInventoryPDF() { const rows = await getInventory(); const doc = new jsPDF(); doc.text('Inventory Report', 14, 16); doc.autoTable({ startY: 22, head: [['Product','Boxes','Loose','Total','Reorder']], body: rows.map((i) => [i.products?.name || '', i.boxes_in_stock || 0, i.loose_units_in_stock || 0, totalUnits(i), i.products?.reorder_level || 0]) }); return { success: true, blob: doc.output('blob') }; }

// Database analytics; keep old function names so existing screens continue working.
export const getAnalytics = () => dataOf(supabase.rpc('dashboard_analytics'));
export const getSalesAnalytics = getAnalytics;
export const getRevenueTrends = () => dataOf(supabase.rpc('revenue_trends'));
export const getDashboardStats = getAnalytics;
export function getSales(params = {}) { let query = supabase.from('invoices').select('*').order('created_at', { ascending: false }); if (params.salesperson_id) query = query.eq('salesperson_id', params.salesperson_id); return dataOf(query); }
export const getSale = getInvoice, createSale = createInvoice, updateSale = updateInvoice, deleteSale = deleteInvoice;

// Only privileged operation: an authenticated Supabase Edge Function.
export async function createUser(value) { const { data, error } = await supabase.functions.invoke('admin-create-user', { body: value }); if (error) throw error; if (!data?.success) throw new Error(data?.message || data?.error || 'Unable to create user'); return data; }
export const batchFetch = (requests) => Promise.allSettled(requests.map(({ fn }) => typeof fn === 'function' ? fn() : Promise.resolve(null)));
export { generateInvoicePDFClient };

export default { checkBackendHealth, startKeepAlive, stopKeepAlive, generateInvoicePDFClient, generateInvoicePDF, getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice, getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, getProducts, getProduct, createProduct, updateProduct, deleteProduct, getInventory, getInventoryItem, updateInventory, getInventoryReport, getInventoryAnalytics, getLowStockAlerts, getStockMovements, adjustStock, exportInventoryCSV, exportInventoryPDF, getAnalytics, getSalesAnalytics, getRevenueTrends, getDashboardStats, getSales, getSale, createSale, updateSale, deleteSale, createUser, downloadBlob, formatCurrency, formatDate, clearCache, prefetch, batchFetch, prefetchCommonData };
