
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Party, Product, InvoiceItem, Invoice, CompanyProfile } from '../types';
import { Search, Trash2, Printer, ShoppingBag, Truck, User, TruckIcon, ClipboardList } from 'lucide-react';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const InvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  const profile = useLiveQuery(() => db.settings.get(1));
  const [invoiceType, setInvoiceType] = useState<'WHOLESALE' | 'RETAIL'>('WHOLESALE');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState(''); 
  const [grNo, setGrNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [transport, setTransport] = useState('');

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [partySearch, setPartySearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const parties = useLiveQuery(() => db.parties.filter(p => p.name.toLowerCase().includes(partySearch.toLowerCase())).limit(10).toArray(), [partySearch]);
  const products = useLiveQuery(() => db.products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).limit(20).toArray(), [productSearch]);

  useEffect(() => {
    const genId = async () => {
      const count = await db.invoices.count();
      const typeCode = invoiceType === 'RETAIL' ? 'RET' : 'TI';
      setInvoiceNo(`${typeCode} -${count + 65}`); 
    };
    genId();
  }, [invoiceType]);

  const addItem = (product: Product) => {
    if (items.find(i => i.id === product.id)) {
      toast.warning('Product already added');
      return;
    }

    const gstToUse = profile?.useDefaultGST ? (profile?.defaultGSTRate || 5) : product.gstRate;

    const newItem: InvoiceItem = {
      ...product,
      productId: product.id!,
      quantity: 1,
      freeQuantity: 0,
      oldMrp: product.oldMrp || product.mrp,
      gstRate: gstToUse,
      discountPercent: 0,
      taxableValue: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: 0,
    };
    setItems([...items, calculateRow(newItem, selectedParty, profile)]);
    setShowProductDropdown(false);
    setProductSearch('');
  };

  const calculateRow = (item: InvoiceItem, party: Party | null, prof: CompanyProfile | undefined): InvoiceItem => {
    const baseAmount = item.saleRate * item.quantity;
    const discountAmount = (baseAmount * item.discountPercent) / 100;
    const taxableValue = baseAmount - discountAmount;
    
    const sellerStateCode = prof?.gstin?.trim().substring(0, 2) || '24';
    const buyerStateCode = party?.gstin?.trim().substring(0, 2) || sellerStateCode;
    
    const isInterState = sellerStateCode !== buyerStateCode;
    const totalTaxRate = item.gstRate;
    const totalTaxAmount = (taxableValue * totalTaxRate) / 100;
    
    let sgst = 0, cgst = 0, igst = 0;
    if (isInterState) {
      igst = totalTaxAmount;
    } else {
      sgst = totalTaxAmount / 2;
      cgst = totalTaxAmount / 2;
    }

    return {
      ...item,
      taxableValue,
      sgstAmount: sgst,
      cgstAmount: cgst,
      igstAmount: igst,
      totalAmount: taxableValue + totalTaxAmount
    };
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    newItems[index] = calculateRow(item, selectedParty, profile);
    setItems(newItems);
  };

  useEffect(() => {
    if (items.length > 0) {
      setItems(items.map(it => calculateRow(it, selectedParty, profile)));
    }
  }, [selectedParty]);

  const totalTaxable = items.reduce((sum, i) => sum + i.taxableValue, 0);
  const totalCGST = items.reduce((sum, i) => sum + i.cgstAmount, 0);
  const totalSGST = items.reduce((sum, i) => sum + i.sgstAmount, 0);
  const totalIGST = items.reduce((sum, i) => sum + i.igstAmount, 0);
  const grandTotal = items.reduce((sum, i) => sum + i.totalAmount, 0);

  const handleSave = async () => {
    if (invoiceType === 'WHOLESALE' && !selectedParty) { toast.error('Select a party'); return; }
    if (items.length === 0) { toast.error('Add items'); return; }

    const invoice: Invoice = {
      invoiceNo, date: new Date(invoiceDate).toISOString(), invoiceType,
      partyId: selectedParty?.id || 0,
      partyName: selectedParty?.name || 'Cash Sale',
      partyGstin: selectedParty?.gstin || '',
      partyAddress: selectedParty?.address || '',
      partyStateCode: selectedParty?.gstin?.substring(0, 2) || '24',
      grNo, vehicleNo, transport,
      items, totalTaxable, totalCGST, totalSGST, totalIGST,
      grandTotal, roundOff: Math.round(grandTotal) - grandTotal,
      status: 'PAID',
    };

    try {
      // transaction() is an instance method inherited from the Dexie base class
      await db.transaction('rw', [db.invoices, db.products], async () => {
        await db.invoices.add(invoice);
        for (const item of items) {
          const product = await db.products.get(item.productId);
          if (product) {
            await db.products.update(item.productId, { 
              stock: product.stock - (item.quantity + item.freeQuantity),
              batch: item.batch,
              mrp: item.mrp
            });
          }
        }
      });
      toast.success('Invoice Saved Successfully');
      if (window.confirm('Do you want to print this invoice?')) {
        await generateInvoicePDF(invoice, profile?.invoiceTemplate || 'authentic');
      }
      navigate('/invoices');
    } catch (e) { 
      console.error(e);
      toast.error('Save failed');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
         <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button onClick={() => setInvoiceType('WHOLESALE')} className={`flex items-center px-6 py-3 rounded-xl font-bold transition-all ${invoiceType === 'WHOLESALE' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500'}`}><Truck className="w-5 h-5 mr-2" /> Wholesale</button>
            <button onClick={() => setInvoiceType('RETAIL')} className={`flex items-center px-6 py-3 rounded-xl font-bold transition-all ${invoiceType === 'RETAIL' ? 'bg-white shadow-md text-green-600' : 'text-slate-500'}`}><ShoppingBag className="w-5 h-5 mr-2" /> Retail</button>
         </div>
         <div className="text-right"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice No</div><div className="text-2xl font-mono font-bold text-slate-800">{invoiceNo}</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-30">
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-500">Purchaser Details</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input type="text" className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl outline-none" placeholder="Search Party..." value={selectedParty ? selectedParty.name : partySearch} onChange={(e) => {setPartySearch(e.target.value); setSelectedParty(null); setShowPartyDropdown(true);}} />
                  {showPartyDropdown && !selectedParty && partySearch && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-xl border z-50 overflow-hidden">
                      {parties?.map(p => <div key={p.id} onClick={() => {setSelectedParty(p); setShowPartyDropdown(false);}} className="p-4 hover:bg-blue-50 cursor-pointer border-b last:border-0"><div className="font-bold">{p.name}</div><div className="text-xs text-slate-500">{p.address} | GST: {p.gstin}</div></div>)}
                    </div>
                  )}
                </div>
                {selectedParty && <div className="p-3 bg-blue-50 rounded-xl text-xs space-y-1"><div><span className="font-bold">GST:</span> {selectedParty.gstin}</div><div><span className="font-bold">State Code:</span> {selectedParty.gstin?.substring(0,2) || '24'}</div></div>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="text-xs font-bold text-slate-400">Logistics Information</label></div>
                <div className="relative"><TruckIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input type="text" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} className="w-full pl-10 py-2.5 bg-slate-50 rounded-lg text-sm" placeholder="Vehicle No." /></div>
                <div className="relative"><ClipboardList className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input type="text" value={grNo} onChange={e => setGrNo(e.target.value)} className="w-full pl-10 py-2.5 bg-slate-50 rounded-lg text-sm" placeholder="GR No." /></div>
                <div className="col-span-2"><input type="text" value={transport} onChange={e => setTransport(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 rounded-lg text-sm" placeholder="Transport Name" /></div>
              </div>
           </div>

           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative z-20">
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                  <input type="text" className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl" placeholder="Search medicines by name or batch..." value={productSearch} onChange={e => {setProductSearch(e.target.value); setShowProductDropdown(true);}} />
                  {showProductDropdown && productSearch && <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-2xl border z-50 max-h-60 overflow-y-auto">{products?.map(p => <div key={p.id} onClick={() => addItem(p)} className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 flex justify-between"><div><div className="font-bold">{p.name}</div><div className="text-xs text-slate-500">Batch: {p.batch} | Exp: {p.expiry} | Stock: {p.stock}</div></div><div className="text-right font-bold">₹{p.saleRate}</div></div>)}</div>}
                </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-50 font-bold uppercase text-slate-500 whitespace-nowrap">
                    <tr><th className="p-3">Item Name</th><th className="p-2">Batch</th><th className="p-2">MRP</th><th className="p-2">Qty</th><th className="p-2">Free</th><th className="p-2">Rate</th><th className="p-2">Disc%</th><th className="p-2">GST%</th><th className="p-3 text-right">Total</th><th className="p-2"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold">{item.name}</td>
                        <td className="p-2"><input type="text" className="w-20 bg-white border border-slate-200 rounded p-1 font-mono uppercase" value={item.batch} onChange={e => updateItem(idx, 'batch', e.target.value)} /></td>
                        <td className="p-2"><input type="number" step="0.01" className="w-14 bg-white border border-slate-200 rounded p-1" value={item.mrp} onChange={e => updateItem(idx, 'mrp', parseFloat(e.target.value)||0)} /></td>
                        <td className="p-2"><input type="number" className="w-10 bg-blue-50 rounded p-1 font-bold text-center" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value)||0)} /></td>
                        <td className="p-2"><input type="number" className="w-10 bg-orange-50 rounded p-1 text-center" value={item.freeQuantity} onChange={e => updateItem(idx, 'freeQuantity', parseInt(e.target.value)||0)} /></td>
                        <td className="p-2"><input type="number" step="0.01" className="w-14 bg-white border border-slate-200 rounded p-1" value={item.saleRate} onChange={e => updateItem(idx, 'saleRate', parseFloat(e.target.value)||0)} /></td>
                        <td className="p-2"><input type="number" className="w-10 bg-white border border-slate-200 rounded p-1" value={item.discountPercent} onChange={e => updateItem(idx, 'discountPercent', parseFloat(e.target.value)||0)} /></td>
                        <td className="p-2 text-center font-medium">{item.gstRate}%</td>
                        <td className="p-3 text-right font-bold text-slate-800">₹{item.totalAmount.toFixed(2)}</td>
                        <td className="p-2"><button onClick={() => setItems(items.filter((_,i)=>i!==idx))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></td>
                      </tr>
                    ))}
                    {items.length === 0 && <tr><td colSpan={10} className="p-12 text-center text-slate-400 italic">No products added.</td></tr>}
                  </tbody>
                </table>
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex justify-between items-center opacity-70 text-sm"><span>Taxable Value</span><span>₹{totalTaxable.toFixed(2)}</span></div>
              <div className="flex justify-between items-center opacity-70 text-sm"><span>GST Amount</span><span>₹{(totalCGST + totalSGST + totalIGST).toFixed(2)}</span></div>
              <div className="h-px bg-white/10"></div>
              <div className="flex justify-between items-end"><span className="font-bold">Grand Total</span><span className="text-4xl font-bold text-green-400">₹{Math.round(grandTotal).toFixed(2)}</span></div>
              <button onClick={handleSave} className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-2 mt-4 shadow-lg"><Printer className="w-5 h-5" /> Save & Print</button>
           </div>
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <label className="text-xs font-bold text-slate-400 block mb-2">Invoice Date</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl outline-none font-medium" />
           </div>
        </div>
      </div>
    </div>
  );
};
