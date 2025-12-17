import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';
import { db } from '../db';
import { Product, GSTRate } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, Upload, Trash2, Edit2, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

export const Inventory: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  
  const products = useLiveQuery(
    () => db.products
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.batch.toLowerCase().includes(searchTerm.toLowerCase()))
      .limit(100)
      .toArray(),
    [searchTerm]
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
      };

      if (editingProduct?.id) {
        await db.products.update(editingProduct.id, formattedData);
        toast.success('Product updated');
      } else {
        await db.products.add(formattedData);
        toast.success('Product added');
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
          return toast.error('File is empty');
        }

        const CHUNK_SIZE = 5000;
        const totalRows = data.length;
        let processed = 0;

        for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE).map((row: any) => ({
            name: String(row.Name || row.Item || row.Medicine || 'Item'),
            batch: String(row.Batch || 'N/A'),
            expiry: String(row.Expiry || row.Exp || '2026-01-01'),
            hsn: String(row.HSN || '3004'),
            gstRate: isNaN(parseFloat(row.GST)) ? 12 : parseFloat(row.GST),
            mrp: isNaN(parseFloat(row.MRP)) ? 0 : parseFloat(row.MRP),
            oldMrp: isNaN(parseFloat(row['Old MRP'])) ? 0 : parseFloat(row['Old MRP']),
            purchaseRate: isNaN(parseFloat(row['Purchase Rate'])) ? 0 : parseFloat(row['Purchase Rate']),
            saleRate: isNaN(parseFloat(row['Sale Rate'] || row.Rate)) ? 0 : parseFloat(row['Sale Rate'] || row.Rate),
            stock: isNaN(parseFloat(row.Stock || row.Qty)) ? 0 : parseFloat(row.Stock || row.Qty),
            manufacturer: String(row.Manufacturer || row.Mfg || ''),
          }));

          await db.products.bulkAdd(chunk);
          processed += chunk.length;
          setImportProgress(Math.round((processed / totalRows) * 100));
        }
        toast.success(`Imported ${totalRows} products!`);
      } catch (err) {
        toast.error('Import failed');
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
          <p className="text-slate-500 text-sm">Efficient storage for 1,00,000+ medicine records</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer flex items-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-medium">
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
          </label>
          <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-all font-medium">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {isImporting && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 animate-pulse">
           <div className="flex justify-between mb-2">
              <span className="text-sm font-bold text-blue-600">Importing Data...</span>
              <span className="text-sm font-bold text-blue-600">{importProgress}%</span>
           </div>
           <div className="w-full bg-slate-100 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
           </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search items by name, batch or HSN..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-5">Name</th>
                <th className="px-4 py-5">Batch</th>
                <th className="px-4 py-5">Exp</th>
                <th className="px-4 py-5 text-right">Stock</th>
                <th className="px-4 py-5 text-right">MRP</th>
                <th className="px-4 py-5 text-right">Rate</th>
                <th className="px-4 py-5 text-center">GST %</th>
                <th className="px-6 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products?.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                  <td className="px-6 py-4 font-bold text-slate-800">{p.name}</td>
                  <td className="px-4 py-4 text-slate-500 font-mono">{p.batch}</td>
                  <td className="px-4 py-4 text-slate-500">{p.expiry}</td>
                  <td className="px-4 py-4 text-right">
                    <span className={clsx("px-2 py-1 rounded-lg font-bold text-xs", p.stock < 100 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-slate-800">₹{p.mrp}</td>
                  <td className="px-4 py-4 text-right font-bold text-blue-600">₹{p.saleRate}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="px-2 py-1 bg-slate-100 rounded-md font-medium">{p.gstRate}%</span>
                  </td>
                  <td className="px-6 py-4 flex justify-center gap-2">
                    <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => db.products.delete(p.id!)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-8 border-b border-slate-50">
              <h3 className="text-2xl font-bold text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Medicine Name</label>
                  <input {...register('name', { required: true })} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">GST Rate (%)</label>
                  <select {...register('gstRate')} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold">
                    <option value={5}>5% (Basic)</option>
                    <option value={12}>12% (Standard)</option>
                    <option value={18}>18% (Luxury)</option>
                    <option value={0}>0% (Exempt)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">HSN Code</label>
                  <input {...register('hsn')} className="w-full bg-slate-50 border-none rounded-2xl p-4" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Batch No.</label>
                  <input {...register('batch', { required: true })} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-mono" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Expiry Date</label>
                  <input {...register('expiry', { required: true })} className="w-full bg-slate-50 border-none rounded-2xl p-4" placeholder="MM/YY or YYYY-MM-DD" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">MRP</label>
                  <input type="number" step="0.01" {...register('mrp', { required: true })} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Billing Rate</label>
                  <input type="number" step="0.01" {...register('saleRate', { required: true })} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-blue-600" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-500 font-bold">Cancel</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};