import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Save, Tag, Users, Link2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const emptyList = { name: '', code: '', list_type: 'contract', valid_from: '', valid_until: '', priority: 100, description: '' };
const emptyGroup = { name: '', code: '', description: '' };

const PricingManagement = ({ darkMode, currentUser }) => {
  const navigate = useNavigate();
  const role = currentUser?.profile?.role;
  const canManage = role === 'admin' || role === 'manager';
  const [tab, setTab] = useState('lists');
  const [loading, setLoading] = useState(true);
  const [priceLists, setPriceLists] = useState([]);
  const [groups, setGroups] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [listItems, setListItems] = useState([]);
  const [showListForm, setShowListForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [listForm, setListForm] = useState(emptyList);
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [itemForm, setItemForm] = useState({ product_id: '', unit_price: '', min_quantity: 1 });
  const [assignmentForm, setAssignmentForm] = useState({ price_list_id: '', target_type: 'group', target_id: '', priority: 100, valid_from: '', valid_until: '' });
  const [saving, setSaving] = useState(false);

  const panel = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900';
  const input = `w-full rounded-lg border px-3 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`;

  const loadData = useCallback(async () => {
    setLoading(true);
    const [listsResult, groupsResult, customersResult, productsResult, assignmentsResult] = await Promise.all([
      supabase.from('price_lists').select('*').order('priority').order('name'),
      supabase.from('customer_groups').select('*, customer_group_members(customer_id, is_active)').order('name'),
      supabase.from('customers').select('id, name, customer_type').eq('is_active', true).order('name'),
      supabase.from('products').select('id, product_name, selling_price').eq('is_active', true).order('product_name'),
      supabase.from('price_list_assignments').select('*, price_lists(name, list_type), customers(name), customer_groups(name)').order('priority')
    ]);
    const firstError = [listsResult, groupsResult, customersResult, productsResult, assignmentsResult].find(result => result.error)?.error;
    if (firstError) window.alert(firstError.message);
    setPriceLists(listsResult.data || []);
    setGroups(groupsResult.data || []);
    setCustomers(customersResult.data || []);
    setProducts(productsResult.data || []);
    setAssignments(assignmentsResult.data || []);
    if (!selectedListId && listsResult.data?.length) setSelectedListId(listsResult.data[0].id);
    setLoading(false);
  }, [selectedListId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selectedListId) { setListItems([]); return; }
    supabase.from('price_list_items').select('*, products(product_name, selling_price)').eq('price_list_id', selectedListId).order('min_quantity')
      .then(({ data, error }) => { if (error) window.alert(error.message); else setListItems(data || []); });
  }, [selectedListId]);

  const saveList = async (event) => {
    event.preventDefault(); setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { id, ...formValues } = listForm;
    const payload = { ...formValues, code: listForm.code.trim().toUpperCase(), valid_from: listForm.valid_from || null, valid_until: listForm.valid_until || null, priority: Number(listForm.priority) };
    if (!id) payload.created_by = user?.id;
    const { error } = id
      ? await supabase.from('price_lists').update(payload).eq('id', id)
      : await supabase.from('price_lists').insert(payload);
    setSaving(false); if (error) return window.alert(error.message);
    setListForm(emptyList); setShowListForm(false); loadData();
  };

  const saveGroup = async (event) => {
    event.preventDefault(); setSaving(true);
    const { id, ...formValues } = groupForm;
    const payload = { ...formValues, code: groupForm.code.trim().toUpperCase() };
    const { error } = id
      ? await supabase.from('customer_groups').update(payload).eq('id', id)
      : await supabase.from('customer_groups').insert(payload);
    setSaving(false); if (error) return window.alert(error.message);
    setGroupForm(emptyGroup); setShowGroupForm(false); loadData();
  };

  const saveItem = async (event) => {
    event.preventDefault();
    if (!selectedListId) return;
    setSaving(true);
    const { error } = await supabase.from('price_list_items').upsert({ price_list_id: selectedListId, product_id: itemForm.product_id, unit_price: Number(itemForm.unit_price), min_quantity: Number(itemForm.min_quantity) }, { onConflict: 'price_list_id,product_id,min_quantity' });
    setSaving(false); if (error) return window.alert(error.message);
    setItemForm({ product_id: '', unit_price: '', min_quantity: 1 });
    const { data } = await supabase.from('price_list_items').select('*, products(product_name, selling_price)').eq('price_list_id', selectedListId).order('min_quantity');
    setListItems(data || []);
  };

  const saveAssignment = async (event) => {
    event.preventDefault(); setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { price_list_id: assignmentForm.price_list_id, priority: Number(assignmentForm.priority), valid_from: assignmentForm.valid_from || null, valid_until: assignmentForm.valid_until || null, created_by: user?.id, customer_id: assignmentForm.target_type === 'customer' ? assignmentForm.target_id : null, customer_group_id: assignmentForm.target_type === 'group' ? assignmentForm.target_id : null };
    const { error } = await supabase.from('price_list_assignments').insert(payload);
    setSaving(false); if (error) return window.alert(error.message);
    setAssignmentForm({ price_list_id: '', target_type: 'group', target_id: '', priority: 100, valid_from: '', valid_until: '' }); loadData();
  };

  const deactivate = async (table, id, currentState = true) => {
    const { error } = await supabase.from(table).update({ is_active: !currentState }).eq('id', id);
    if (error) window.alert(error.message); else loadData();
  };

  const selectedList = useMemo(() => priceLists.find(list => list.id === selectedListId), [priceLists, selectedListId]);
  if (!canManage) return <div className={`min-h-screen p-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}><p>Pricing Management is available to administrators and managers.</p><button onClick={() => navigate('/')} className="mt-4 text-blue-600">Return home</button></div>;

  return (
    <div className={`min-h-screen p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6"><div><button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-blue-600 mb-2"><ArrowLeft size={16}/>Portal</button><h1 className="text-3xl font-bold">Pricing Management</h1><p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Manage contract prices, promotions, customer groups and assignments.</p></div><button onClick={() => tab === 'groups' ? setShowGroupForm(true) : setShowListForm(true)} className="flex items-center gap-2 bg-[#5EEAD4] text-[#1E3A8A] px-4 py-2 rounded-lg font-semibold"><Plus size={18}/>{tab === 'groups' ? 'New Group' : 'New Price List'}</button></div>
        <div className="flex gap-2 mb-6 overflow-x-auto">{[['lists','Price Lists',Tag],['groups','Customer Groups',Users],['assignments','Assignments',Link2]].map(([id,label,Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${tab === id ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white border'}`}><Icon size={17}/>{label}</button>)}</div>
        {tab === 'lists' && selectedList && <div className="flex justify-end mb-3"><button onClick={() => { setListForm({ ...selectedList, valid_from: selectedList.valid_from || '', valid_until: selectedList.valid_until || '' }); setShowListForm(true); }} className="text-sm text-blue-600 font-medium">Edit selected price list</button></div>}
        {loading ? <p>Loading pricing data…</p> : tab === 'lists' ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className={`rounded-xl border p-4 ${panel}`}><h2 className="font-semibold mb-3">Price Lists</h2><div className="space-y-2">{priceLists.map(list => <button key={list.id} onClick={() => setSelectedListId(list.id)} className={`w-full text-left rounded-lg p-3 border ${selectedListId === list.id ? 'border-blue-500 bg-blue-500/10' : darkMode ? 'border-gray-700' : 'border-gray-200'}`}><div className="flex justify-between"><span className="font-medium">{list.name}</span><span className={`text-xs ${list.is_active ? 'text-emerald-500' : 'text-gray-500'}`}>{list.is_active ? 'Active' : 'Inactive'}</span></div><div className="text-xs opacity-70">{list.code} · {list.list_type} · priority {list.priority}</div></button>)}</div></div>
            <div className={`lg:col-span-2 rounded-xl border p-5 ${panel}`}>{selectedList ? <><div className="flex justify-between gap-3 mb-4"><div><h2 className="text-xl font-semibold">{selectedList.name}</h2><p className="text-sm opacity-70">{selectedList.description || 'No description'} · {selectedList.valid_from || 'No start'} to {selectedList.valid_until || 'No expiry'}</p></div><button onClick={() => deactivate('price_lists', selectedList.id, selectedList.is_active)} className="text-sm text-amber-600">{selectedList.is_active ? 'Deactivate' : 'Reactivate'}</button></div><form onSubmit={saveItem} className="grid md:grid-cols-4 gap-3 mb-5"><select required value={itemForm.product_id} onChange={e => setItemForm({...itemForm, product_id:e.target.value})} className={input}><option value="">Product…</option>{products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}</select><input required type="number" step="0.01" min="0" placeholder="Unit price" value={itemForm.unit_price} onChange={e => setItemForm({...itemForm, unit_price:e.target.value})} className={input}/><input required type="number" min="1" placeholder="Min qty" value={itemForm.min_quantity} onChange={e => setItemForm({...itemForm, min_quantity:e.target.value})} className={input}/><button disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 flex justify-center items-center gap-2"><Save size={17}/>Save Price</button></form><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="py-2">Product</th><th>Minimum qty</th><th>List price</th><th>Standard</th></tr></thead><tbody>{listItems.map(item => <tr key={item.id} className="border-b border-gray-500/20"><td className="py-3">{item.products?.product_name}</td><td>{item.min_quantity}</td><td>GHS {Number(item.unit_price).toFixed(2)}</td><td>GHS {Number(item.products?.selling_price || 0).toFixed(2)}</td></tr>)}</tbody></table></div></> : <p>Select a price list.</p>}</div>
          </div>
        ) : tab === 'groups' ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{groups.map(group => <div key={group.id} className={`rounded-xl border p-5 ${panel}`}><div className="flex justify-between"><div><h3 className="font-semibold text-lg">{group.name}</h3><p className="text-xs opacity-70">{group.code}</p></div><button onClick={() => deactivate('customer_groups', group.id, group.is_active)} className={group.is_active ? 'text-amber-600 text-sm' : 'text-emerald-600 text-sm'}>{group.is_active ? 'Deactivate' : 'Reactivate'}</button></div><p className="my-3 text-sm opacity-80">{group.description || 'No description'}</p><div className="text-sm font-medium">{(group.customer_group_members || []).filter(m => m.is_active).length} active customers</div></div>)}</div> : (
          <div className="grid lg:grid-cols-2 gap-6"><form onSubmit={saveAssignment} className={`rounded-xl border p-5 space-y-4 ${panel}`}><h2 className="font-semibold text-lg">Assign a price list</h2><label className="block text-sm">Price list<select required value={assignmentForm.price_list_id} onChange={e=>setAssignmentForm({...assignmentForm,price_list_id:e.target.value})} className={input}><option value="">Select…</option>{priceLists.filter(p=>p.is_active).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="text-sm">Target type<select value={assignmentForm.target_type} onChange={e=>setAssignmentForm({...assignmentForm,target_type:e.target.value,target_id:''})} className={input}><option value="group">Customer group</option><option value="customer">Individual customer</option></select></label><label className="text-sm">Target<select required value={assignmentForm.target_id} onChange={e=>setAssignmentForm({...assignmentForm,target_id:e.target.value})} className={input}><option value="">Select…</option>{(assignmentForm.target_type==='group'?groups:customers).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label></div><div className="grid grid-cols-3 gap-3"><label className="text-sm">Priority<input type="number" value={assignmentForm.priority} onChange={e=>setAssignmentForm({...assignmentForm,priority:e.target.value})} className={input}/></label><label className="text-sm">From<input type="date" value={assignmentForm.valid_from} onChange={e=>setAssignmentForm({...assignmentForm,valid_from:e.target.value})} className={input}/></label><label className="text-sm">Until<input type="date" value={assignmentForm.valid_until} onChange={e=>setAssignmentForm({...assignmentForm,valid_until:e.target.value})} className={input}/></label></div><p className="text-xs opacity-70">Lower priority numbers take precedence. Use 10 for a temporary promotion, 20 for a contract and 100 for general pricing.</p><button disabled={saving} className="w-full bg-blue-600 text-white rounded-lg px-4 py-2">Create Assignment</button></form><div className={`rounded-xl border p-5 ${panel}`}><h2 className="font-semibold text-lg mb-3">Current assignments</h2><div className="space-y-3">{assignments.map(a=><div key={a.id} className="rounded-lg border border-gray-500/20 p-3 flex justify-between gap-3"><div><div className="font-medium">{a.price_lists?.name}</div><div className="text-sm opacity-70">{a.customers?.name || a.customer_groups?.name} · priority {a.priority}</div></div><button onClick={()=>deactivate('price_list_assignments',a.id,a.is_active)} className={a.is_active?'text-amber-600 text-sm':'text-emerald-600 text-sm'}>{a.is_active?'Disable':'Enable'}</button></div>)}</div></div></div>
        )}
      </div>
      {showListForm && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><form onSubmit={saveList} className={`w-full max-w-xl rounded-xl p-6 ${panel}`}><div className="flex justify-between mb-4"><h2 className="text-xl font-semibold">New Price List</h2><button type="button" onClick={()=>setShowListForm(false)}><X/></button></div><div className="grid grid-cols-2 gap-4"><label className="text-sm">Name<input required value={listForm.name} onChange={e=>setListForm({...listForm,name:e.target.value})} className={input}/></label><label className="text-sm">Code<input required value={listForm.code} onChange={e=>setListForm({...listForm,code:e.target.value})} className={input}/></label><label className="text-sm">Type<select value={listForm.list_type} onChange={e=>setListForm({...listForm,list_type:e.target.value})} className={input}><option value="contract">Contract</option><option value="promotion">Promotion</option><option value="custom">Custom</option></select></label><label className="text-sm">Priority<input type="number" value={listForm.priority} onChange={e=>setListForm({...listForm,priority:e.target.value})} className={input}/></label><label className="text-sm">Valid from<input type="date" value={listForm.valid_from} onChange={e=>setListForm({...listForm,valid_from:e.target.value})} className={input}/></label><label className="text-sm">Valid until<input type="date" value={listForm.valid_until} onChange={e=>setListForm({...listForm,valid_until:e.target.value})} className={input}/></label><label className="col-span-2 text-sm">Description<textarea value={listForm.description} onChange={e=>setListForm({...listForm,description:e.target.value})} className={input}/></label></div><button disabled={saving} className="mt-5 w-full bg-blue-600 text-white rounded-lg py-2">Create Price List</button></form></div>}
      {showGroupForm && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><form onSubmit={saveGroup} className={`w-full max-w-lg rounded-xl p-6 ${panel}`}><div className="flex justify-between mb-4"><h2 className="text-xl font-semibold">New Customer Group</h2><button type="button" onClick={()=>setShowGroupForm(false)}><X/></button></div><div className="space-y-4"><label className="text-sm">Name<input required value={groupForm.name} onChange={e=>setGroupForm({...groupForm,name:e.target.value})} className={input}/></label><label className="text-sm">Code<input required value={groupForm.code} onChange={e=>setGroupForm({...groupForm,code:e.target.value})} className={input}/></label><label className="text-sm">Description<textarea value={groupForm.description} onChange={e=>setGroupForm({...groupForm,description:e.target.value})} className={input}/></label></div><button disabled={saving} className="mt-5 w-full bg-blue-600 text-white rounded-lg py-2">Create Group</button></form></div>}
    </div>
  );
};

export default PricingManagement;
