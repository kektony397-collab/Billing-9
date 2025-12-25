import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';
import { db } from '../db';
import { Product, GSTRate } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, Upload, Trash2, Edit2, X, Filter, ScanLine, Bolt, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

export const Inventory: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Advanced Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'FAST' | 'ACCURATE'>('FAST');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), searchMode === 'FAST' ? 300 : 500);
    return () => clearTimeout(timer);
  }, [searchTerm, searchMode]);
  
  const products = useLiveQuery(
    async () => {
      // Return empty or all items if no search term
      if (!debouncedTerm.trim()) return db.products.limit(50).toArray();

      const term = debouncedTerm.trim();
      const lower = term.toLowerCase();

      if (searchMode === 'ACCURATE') {
        // Optimized Index Search: Uses Database Indexes directly (Much Faster)
        // Checks start of Name, OR exact matches on Batch/Barcode/HSN
        return await db.products
          .where('name').startsWithIgnoreCase(term)
          .or('batch').equals(term)
          .or('barcode').equals(term)
          .or('hsn').equals(term)
          .limit(50)
          .toArray();
      } else {
        // Fast/Fuzzy Search: Scans memory (Better for partial keywords like "para 500")
        // Uses Filter (Collection Scan)
        return await db.products
          .filter(p => 
             p.name.toLowerCase().includes(lower) || 
             p.batch.toLowerCase().includes(lower) || 
             (p.barcode || '').includes(lower) ||
             (p.category || '').toLowerCase().includes(lower)
          )
          .limit(50)
          .toArray();
      }
    },
    [debouncedTerm, searchMode]
  );

  const { register, handleSubmit, reset, setValue } = useForm<Product>();

  useEffect(() => {
    if (editingProduct) {
      Object.keys(editingProduct).forEach((key) => {
        setValue(key as keyof Product, (editingProduct as any)[key]);
      });
    } else {
      reset({ gstRate: GSTRate.GST_12 });
    }
  }, [editingProduct, setValue, reset]);

  const onSubmit = async (data: Product) => {
    try {
      const formattedData = {
        ...data,
        mrp: Number(data.mrp),
        oldMrp: Number(data.oldMrp || data.mrp),
        purchaseRate: Number(data.purchaseRate),
        saleRate: Number(data.saleRate),
        stock: Number(data.stock),
        gstRate: Number(data.gstRate),
        barcode: data.barcode?.trim() || '',
        category: data.category?.trim() || ''
      };

      if (editingProduct?.id) {
        await db.products.update(editingProduct.id, formattedData);
        toast.success('Product updated successfully');
      } else {
        await db.products.add(formattedData);
        toast.success('New product added');
      }
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (e) { toast.error('Error saving product'); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          setIsImporting(false);
          return toast.error('File appears to be empty');
        }

        const CHUNK_SIZE = 2000;
        const totalRows = data.length;
        let processed = 0;

        // Process in chunks to prevent UI freezing
        for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE).map((row: any) => ({
            name: String(row.Name || row.Item || row.Medicine || row.Description || 'Item'),
            batch: String(row.Batch || row.Lot || 'N/A'),
            expiry: String(row.Expiry || row.Exp || '2026-01-01'),
            hsn: String(row.HSN || '3004'),
            barcode: String(row.Barcode || row.EAN || row.GTIN || ''), 
            category: String(row.Category || row.Group || row.Type || ''), 
            gstRate: isNaN(parseFloat(row.GST)) ? 12 : parseFloat(row.GST),
            mrp: isNaN(parseFloat(row.MRP)) ? 0 : parseFloat(row.MRP),
            oldMrp: isNaN(parseFloat(row['Old MRP'])) ? 0 : parseFloat(row['Old MRP']),
            purchaseRate: isNaN(parseFloat(row['Purchase Rate'] || row.P_Rate)) ? 0 : parseFloat(row['Purchase Rate'] || row.P_Rate),
            saleRate: isNaN(parseFloat(row['Sale Rate'] || row.Rate || row.S_Rate)) ? 0 : parseFloat(row['Sale Rate'] || row.Rate || row.S_Rate),
            stock: isNaN(parseFloat(row.Stock || row.Qty || row.Quantity)) ? 0 : parseFloat(row.Stock || row.Qty || row.Quantity),
            manufacturer: String(row.Manufacturer || row.Mfg || ''),
          }));

          await db.products.bulkAdd(chunk);
          processed += chunk.length;
          setImportProgress(Math.round((processed / totalRows) * 100));
        }
        toast.success(`Successfully imported ${totalRows} products!`);
      } catch (err) {
        console.error(err);
        toast.error('Import failed. Please check Excel format.');
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Inventory</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Efficient storage for {products?.length || '0'} items</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer flex items-center px-4 py-2.5 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-gray-600 transition-all font-medium">
            <Upload className="w-4 h-4 mr-2" />
            Import
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
          </label>
          <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-all font-medium">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </button>
        </div>
      </div>

      {isImporting && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-blue-100 animate-pulse">
           <div className="flex justify-between mb-2">
              <span className="text-sm font-bold text-blue-600">Importing Data...</span>
              <span className="text-sm font-bold text-blue-600">{importProgress}%</span>
           </div>
           <div className="w-full bg-slate-100 dark:bg-gray-700 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
           </div>
        </div>
      )}

      {/* Advanced Search Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder={searchMode === 'FAST' ? "Search Name, Batch, Barcode..." : "Exact Search: Start of Name, Batch, HSN..."}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white shadow-sm placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm w-fit self-start md:self-auto shrink-0">
           <button 
             onClick={() => setSearchMode('FAST')} 
             className={clsx("px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all", searchMode === 'FAST' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-700")}
           >
             <Bolt className="w-4 h-4" /> Fast
           </button>
           <button 
             onClick={() => setSearchMode('ACCURATE')} 
             className={clsx("px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all", searchMode === 'ACCURATE' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-700")}
           >
             <Filter className="w-4 h-4" /> Accurate
           </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-100 dark:border-gray-700 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-5">Product Details</th>
                <th className="px-4 py-5">Batch / Exp</th>
                <th className="px-4 py-5 text-right">Stock</th>
                <th className="px-4 py-5 text-right">Pricing</th>
                <th className="px-4 py-5 text-center">Tax</th>
                <th className="px-6 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
              {products?.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors text-sm group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">{p.name}</div>
                    <div className="flex gap-2 text-xs text-slate-500 mt-1">
                      {p.barcode && <span className="flex items-center bg-slate-100 dark:bg-gray-700 px-1.5 rounded"><ScanLine className="w-3 h-3 mr-1"/>{p.barcode}</span>}
                      {p.category && <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 px-1.5 rounded">{p.category}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                     <div className="font-mono text-slate-600 dark:text-slate-300">{p.batch}</div>
                     <div className="text-xs text-slate-400">{p.expiry}</div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={clsx("px-2 py-1 rounded-lg font-bold text-xs", p.stock < 50 ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300" : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300")}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                     <div className="font-bold text-blue-600 dark:text-blue-400">₹{p.saleRate}</div>
                     <div className="text-xs text-slate-400 line-through">MRP: {p.mrp}</div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-gray-700 rounded-md font-medium text-xs dark:text-slate-300">{p.gstRate}%</span>
                  </td>
                  <td className="px-6 py-4 flex justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => db.products.delete(p.id!)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {products?.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No products found matching "{searchTerm}"</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center p-8 border-b border-slate-50 dark:border-gray-800">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="label">Medicine Name</label>
                  <input {...register('name', { required: true })} className="input-field font-bold" placeholder="Product Name" />
                </div>
                
                {/* New Fields */}
                <div>
                   <label className="label">Barcode / SKU</label>
                   <input {...register('barcode')} className="input-field font-mono" placeholder="Scan or Type" />
                </div>
                <div>
                   <label className="label">Category</label>
                   <input {...register('category')} className="input-field" placeholder="e.g. Syrup, Tablet" />
                </div>

                <div>
                  <label className="label">GST Rate (%)</label>
                  <select {...register('gstRate')} className="input-field">
                    <option value={5}>5% (Basic)</option>
                    <option value={12}>12% (Standard)</option>
                    <option value={18}>18% (Luxury)</option>
                    <option value={28}>28% (High)</option>
                    <option value={0}>0% (Exempt)</option>
                  </select>
                </div>
                <div>
                  <label className="label">HSN Code</label>
                  <input {...register('hsn')} className="input-field" placeholder="e.g. 3004" />
                </div>
                <div>
                  <label className="label">Batch No.</label>
                  <input {...register('batch', { required: true })} className="input-field font-mono" />
                </div>
                <div>
                  <label className="label">Expiry Date</label>
                  <input {...register('expiry', { required: true })} className="input-field" placeholder="MM/YYYY" />
                </div>
                <div>
                  <label className="label">MRP</label>
                  <input type="number" step="0.01" {...register('mrp', { required: true })} className="input-field font-bold" />
                </div>
                <div>
                  <label className="label">Billing Rate</label>
                  <input type="number" step="0.01" {...register('saleRate', { required: true })} className="input-field font-bold text-blue-600" />
                </div>
                <div>
                  <label className="label">Initial Stock</label>
                  <input type="number" {...register('stock')} className="input-field" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 flex items-center"><ArrowUpRight className="w-5 h-5 mr-2" />Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        .label { display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .input-field { width: 100%; background-color: #f8fafc; border: 1px solid transparent; border-radius: 1rem; padding: 1rem; font-size: 0.95rem; outline: none; transition: all 0.2s; }
        .dark .input-field { background-color: #1e293b; color: white; border-color: #374151; }
        .input-field:focus { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); border-color: #3b82f6; background-color: white; }
        .dark .input-field:focus { background-color: #1f2937; }
      `}</style>
    </div>
  );
};