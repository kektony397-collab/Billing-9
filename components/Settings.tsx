import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { CompanyProfile, AppTheme } from '../types';
import { Save, Building2, Palette, LayoutTemplate, Settings as SettingsIcon, Percent } from 'lucide-react';
import { toast } from 'sonner';

export const Settings: React.FC = () => {
  const { register, handleSubmit, setValue, watch } = useForm<CompanyProfile>();
  const currentTheme = watch('theme');
  const useDefaultGST = watch('useDefaultGST');

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await db.settings.get(1); 
      if (settings) {
        Object.keys(settings).forEach((key) => {
          setValue(key as keyof CompanyProfile, (settings as any)[key]);
        });
      }
    };
    loadSettings();
  }, [setValue]);

  const onSubmit = async (data: CompanyProfile) => {
    try {
      await db.settings.put({ ...data, id: 1 });
      toast.success('Settings Updated Successfully');
      setTimeout(() => window.location.reload(), 800); 
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const ThemeOption = ({ value, color, label }: { value: AppTheme, color: string, label: string }) => (
    <label className={`cursor-pointer flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${currentTheme === value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
      <input type="radio" {...register('theme')} value={value} className="hidden" />
      <div className={`w-12 h-12 rounded-full mb-2 ${color} shadow-lg`}></div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center space-x-4">
        <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg">
          <SettingsIcon className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Settings</h2>
          <p className="text-slate-500">Configure your application preferences</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
           <div className="flex items-center gap-2 mb-6"><Percent className="w-5 h-5" /><h3 className="text-xl font-bold">GST Configuration</h3></div>
           <div className="space-y-6">
              <label className="flex items-center cursor-pointer p-4 bg-slate-50 rounded-2xl border-2 border-transparent has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 transition-all">
                <input type="checkbox" {...register('useDefaultGST')} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 mr-4" />
                <div>
                  <div className="font-bold text-slate-800">Force Default GST Rate</div>
                  <div className="text-sm text-slate-500">Enable this to apply a fixed GST rate to every item on a new bill, overriding product settings.</div>
                </div>
              </label>

              {useDefaultGST && (
                <div className="animate-in slide-in-from-top-2">
                   <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Default GST Rate (%)</label>
                   <select {...register('defaultGSTRate')} className="w-full md:w-48 rounded-xl border-slate-200 border px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                   </select>
                </div>
              )}
           </div>
        </section>

        <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6"><Building2 className="w-5 h-5" /><h3 className="text-xl font-bold">Company Details</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2"><label className="block text-sm font-semibold mb-1">Company Name</label><input {...register('companyName', { required: true })} className="w-full rounded-xl border px-4 py-3" /></div>
            <div><label className="block text-sm font-medium mb-1">GSTIN</label><input {...register('gstin')} className="w-full rounded-xl border px-4 py-3" /></div>
            <div><label className="block text-sm font-medium mb-1">Phone</label><input {...register('phone')} className="w-full rounded-xl border px-4 py-3" /></div>
            
            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Drug Lic. 1</label><input {...register('dlNo1')} className="w-full rounded-xl border px-4 py-3" /></div>
              <div><label className="block text-sm font-medium mb-1">Drug Lic. 2</label><input {...register('dlNo2')} className="w-full rounded-xl border px-4 py-3" /></div>
              <div><label className="block text-sm font-medium mb-1">Drug Lic. 3</label><input {...register('dlNo3')} className="w-full rounded-xl border px-4 py-3" /></div>
              <div><label className="block text-sm font-medium mb-1">Drug Lic. 4</label><input {...register('dlNo4')} className="w-full rounded-xl border px-4 py-3" /></div>
            </div>

             <div className="col-span-1 md:col-span-2"><label className="block text-sm font-medium mb-1">Address 1</label><input {...register('addressLine1')} className="w-full rounded-xl border px-4 py-3" /></div>
            <div className="col-span-1 md:col-span-2"><label className="block text-sm font-medium mb-1">Address 2</label><input {...register('addressLine2')} className="w-full rounded-xl border px-4 py-3" /></div>
            <div className="col-span-1 md:col-span-2"><label className="block text-sm font-medium mb-1">Invoice Terms</label><textarea {...register('terms')} rows={3} className="w-full rounded-xl border px-4 py-3" /></div>
          </div>
        </section>

        <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
           <div className="flex items-center gap-2 mb-6"><Palette className="w-5 h-5" /><h3 className="text-xl font-bold">App Appearance</h3></div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ThemeOption value="blue" color="bg-blue-600" label="Ocean Blue" />
              <ThemeOption value="green" color="bg-emerald-600" label="Nature Green" />
              <ThemeOption value="purple" color="bg-purple-600" label="Royal Purple" />
              <ThemeOption value="dark" color="bg-gray-900" label="Midnight Dark" />
           </div>
        </section>

        <div className="flex justify-end sticky bottom-4"><button type="submit" className="flex items-center px-8 py-4 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:scale-105 transition-all"><Save className="w-5 h-5 mr-2" /> Save Settings</button></div>
      </form>
    </div>
  );
};