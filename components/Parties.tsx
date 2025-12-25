import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { Party } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, Upload, Trash2, Edit2, X, Phone, MapPin, Loader2, Star, User } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import clsx from 'clsx';

export const Parties: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  const parties = useLiveQuery(
    async () => {
      const term = searchTerm.trim();
      if (!term) return db.parties.limit(50).toArray();
      
      // Attempt accurate search via Index first (faster), then fallback to filter if needed or combine
      // Using filter for Party search is usually acceptable as parties list is smaller than products
      // But we can optimize to use Name index
      return db.parties
        .filter(p => 
          p.name.toLowerCase().includes(term.toLowerCase()) || 
          p.phone.includes(term) ||
          (p.gstin || '').toLowerCase().includes(term.toLowerCase())
        )
        .limit(50)
        .toArray();
    },
    [searchTerm]
  );

  const { register, handleSubmit, reset, setValue } = useForm<Party>();

  React.useEffect(() => {
    if (editingParty) {
      Object.keys(editingParty).forEach((key) => {
        setValue(key as keyof Party, (editingParty as any)[key]);
      });
    } else {
      reset({ type: 'WHOLESALE', creditLimit: 0, outstandingBalance: 0 });
    }
  }, [editingParty, setValue, reset]);

  const onSubmit = async (data: Party) => {
    try {
      const formatted = {
        ...data,
        name: data.name.trim(),
        creditLimit: Number(data.creditLimit),
        outstandingBalance: Number(data.outstandingBalance)
      };

      if (editingParty?.id) {
        await db.parties.update(editingParty.id, formatted);
        toast.success('Party updated');
      } else {
        await db.parties.add(formatted);
        toast.success('Party added');
      }
      setIsModalOpen(false);
      setEditingParty(null);
      reset();
    } catch (error) {
      console.error(error);
      toast.error('Error saving party');
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, party: Party) => {
    e.stopPropagation();
    if (!party.id) return;
    await db.parties.update(party.id, { isFavorite: !party.isFavorite });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this party?')) {
      await db.parties.delete(id);
      toast.success('Party deleted');
    }
  };

  // Improved Helper to find values in Excel row loosely
  const getValue = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
      // 1. Exact match
      if (row[key] !== undefined) return row[key];
      
      // 2. Case Insensitive Trimmed match
      const foundKey = rowKeys.find(k => k.trim().toLowerCase() === key.trim().toLowerCase());
      if (foundKey) return row[foundKey];
      
      // 3. Normalized Match (remove special chars)
      const cleanTarget = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const cleanKey = rowKeys.find(k => k.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanTarget);
      if (cleanKey) return row[cleanKey];
    }
    return '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) throw new Error("Empty File");

        const partiesToAdd: any[] = data.map((row: any) => ({
          name: String(getValue(row, ['Name', 'Party Name', 'Customer', 'Firm Name']) || 'Unknown').trim(),
          gstin: String(getValue(row, ['GSTIN', 'GST', 'Tin No']) || '').trim(),
          address: String(getValue(row, ['Address', 'Addr', 'City', 'Place']) || '').trim(),
          phone: String(getValue(row, ['Phone', 'Mobile', 'Contact', 'Ph No']) || '').trim(),
          email: String(getValue(row, ['Email']) || '').trim(),
          contactPerson: String(getValue(row, ['Contact Person', 'Owner', 'Proprietor']) || '').trim(),
          creditLimit: Number(getValue(row, ['Credit Limit', 'Limit', 'Cr Limit']) || 0),
          outstandingBalance: Number(getValue(row, ['Balance', 'Opening Balance', 'Due', 'Op Bal']) || 0),
          dlNo1: String(getValue(row, ['DL No 1', 'DL1', 'Drug Lic 1']) || '').trim(),
          dlNo2: String(getValue(row, ['DL No 2', 'DL2', 'Drug Lic 2']) || '').trim(),
          type: 'WHOLESALE'
        })).filter(p => p.name !== 'Unknown' && p.name !== '');

        await db.parties.bulkAdd(partiesToAdd);
        toast.success(`Imported ${partiesToAdd.length} parties successfully!`);
      } catch (e) {
        toast.error('Import failed. Check format.');
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Parties & Customers</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage wholesale and retail contacts</p>
        </div>
        
        <div className="flex gap-3">
          {isImporting ? (
             <div className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-medium">
               <Loader2 className="w-5 h-5 mr-2 animate-spin" />
               Processing...
             </div>
          ) : (
            <label className="cursor-pointer flex items-center px-5 py-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 shadow-sm transition-all font-medium">
              <Upload className="w-5 h-5 mr-2" />
              Import Excel
               <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
            </label>
          )}
          
          <button 
            onClick={() => { setEditingParty(null); setIsModalOpen(true); }}
            className="flex items-center px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 transition-all font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Party
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by Name, GST, Phone..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white dark:bg-gray-800 dark:text-white shadow-sm transition-all placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parties?.map((party) => (
          <div key={party.id} className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative">
            <button 
              onClick={(e) => toggleFavorite(e, party)}
              className={clsx("absolute top-6 right-6 transition-colors", party.isFavorite ? "text-yellow-400 fill-yellow-400" : "text-slate-300 hover:text-yellow-400")}
            >
               <Star className="w-5 h-5" />
            </button>

            <div className="flex justify-between items-start mb-4 pr-8">
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">{party.name}</h3>
                <div className="flex gap-2 mt-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${party.type === 'RETAIL' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                    {party.type || 'WHOLESALE'}
                  </span>
                  {party.outstandingBalance && party.outstandingBalance > 0 ? (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                       Due: ₹{party.outstandingBalance}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                 <div className="bg-slate-50 dark:bg-gray-700/50 p-2 rounded-lg">
                    <span className="block text-slate-400 mb-0.5 uppercase text-[10px] font-bold">Credit Limit</span>
                    <span className="font-bold">₹{party.creditLimit || '0'}</span>
                 </div>
                 <div className="bg-slate-50 dark:bg-gray-700/50 p-2 rounded-lg">
                    <span className="block text-slate-400 mb-0.5 uppercase text-[10px] font-bold">Balance</span>
                    <span className={clsx("font-bold", (party.outstandingBalance || 0) > 0 ? "text-red-500" : "text-green-500")}>
                      ₹{party.outstandingBalance || '0'}
                    </span>
                 </div>
              </div>

              {party.contactPerson && (
                 <div className="flex items-center">
                   <User className="w-4 h-4 mr-2 text-slate-400" />
                   {party.contactPerson}
                 </div>
              )}
              {party.phone && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-slate-400" />
                  {party.phone}
                </div>
              )}
              {party.address && (
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 mr-2 text-slate-400 mt-0.5" />
                  <span className="line-clamp-1">{party.address}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-gray-700 opacity-60 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => { setEditingParty(party); setIsModalOpen(true); }} className="flex-1 py-2 bg-slate-100 dark:bg-gray-700 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs font-bold flex items-center justify-center gap-2"><Edit2 className="w-3 h-3" /> Edit</button>
                 <button onClick={() => handleDelete(party.id!)} className="px-3 py-2 bg-slate-100 dark:bg-gray-700 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
         {parties?.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 flex flex-col items-center">
               <User className="w-12 h-12 mb-4 opacity-20" />
               <p>No parties found matching your search.</p>
            </div>
         )}
      </div>

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-gray-800">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{editingParty ? 'Edit Party' : 'Add New Party'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="label">Party / Firm Name</label>
                  <input {...register('name', { required: true })} className="input-field" placeholder="Enter party name" />
                </div>
                
                <div>
                   <label className="label">Contact Person</label>
                   <input {...register('contactPerson')} className="input-field" placeholder="Owner Name" />
                </div>

                <div>
                  <label className="label">Party Type</label>
                  <select {...register('type')} className="input-field">
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="RETAIL">Retail</option>
                  </select>
                </div>

                <div>
                  <label className="label">Phone</label>
                  <input {...register('phone')} className="input-field" placeholder="Contact Number" />
                </div>

                <div>
                  <label className="label">GSTIN</label>
                  <input {...register('gstin')} className="input-field" placeholder="GST Number" />
                </div>

                {/* Financials */}
                <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-2xl md:col-span-2 grid grid-cols-2 gap-4 border border-slate-100 dark:border-gray-700">
                   <div>
                      <label className="label text-blue-600">Credit Limit (₹)</label>
                      <input type="number" {...register('creditLimit')} className="input-field" placeholder="0" />
                   </div>
                   <div>
                      <label className="label text-red-500">Opening Balance (₹)</label>
                      <input type="number" {...register('outstandingBalance')} className="input-field" placeholder="0" />
                   </div>
                </div>

                <div className="md:col-span-2">
                   <label className="label">Address</label>
                   <textarea {...register('address')} className="input-field" rows={2} placeholder="Full Address" />
                </div>
                
                <div>
                  <label className="label">DL No. 1</label>
                  <input {...register('dlNo1')} className="input-field" />
                </div>

                <div>
                  <label className="label">DL No. 2</label>
                  <input {...register('dlNo2')} className="input-field" />
                </div>
              </div>
              
              <div className="flex justify-end pt-4 gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-gray-800 font-medium">Cancel</button>
                <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg font-bold">Save Details</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        .label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.25rem; }
        .dark .label { color: #94a3b8; }
        .input-field { width: 100%; border-radius: 0.75rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; font-size: 0.95rem; outline: none; transition: all 0.2s; }
        .dark .input-field { background-color: #1f2937; border-color: #374151; color: white; }
        .input-field:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
      `}</style>
    </div>
  );
};