import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { CompanyProfile, AppTheme, PlatformMode, DarkMode } from '../types';
import { Save, Building2, Palette, Monitor, Smartphone, Moon, Sun, Laptop } from 'lucide-react';
import { toast } from 'sonner';

export const Settings: React.FC = () => {
  const { register, handleSubmit, setValue, watch } = useForm<CompanyProfile>();
  const currentTheme = watch('theme');
  const currentPlatform = watch('platformMode');
  const currentDarkMode = watch('darkMode');
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
      toast.success('Settings Updated');
      // Small delay to allow DB write before reload
      setTimeout(() => window.location.reload(), 500); 
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const ThemeOption = ({ value, color, label }: { value: AppTheme, color: string, label: string }) => (
    <label className={`cursor-pointer flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${currentTheme === value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-gray-700 hover:border-slate-300'}`}>
      <input type="radio" {...register('theme')} value={value} className="hidden" />
      <div className={`w-12 h-12 rounded-full mb-2 ${color} shadow-lg`}></div>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
    </label>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center space-x-4">
        <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg">
          <Palette className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Settings</h2>
          <p className="text-slate-500 dark:text-slate-400">Appearance & System Configuration</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Interface & Theme Section */}
        <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-gray-700">
           <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-white"><Monitor className="w-5 h-5" /><h3 className="text-xl font-bold">Interface Experience</h3></div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Platform Selector */}
             <div>
                <label className="block text-sm font-bold text-slate-400 uppercase mb-3">Platform Style</label>
                <div className="flex bg-slate-100 dark:bg-gray-900 p-1 rounded-xl">
                    {(['windows', 'android', 'auto'] as PlatformMode[]).map((mode) => (
                      <label key={mode} className={`flex-1 flex items-center justify-center py-2 rounded-lg cursor-pointer transition-all ${currentPlatform === mode ? 'bg-white dark:bg-gray-700 shadow-sm font-bold text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <input type="radio" {...register('platformMode')} value={mode} className="hidden" />
                        <span className="capitalize flex items-center gap-2">
                           {mode === 'windows' && <Monitor className="w-4 h-4" />}
                           {mode === 'android' && <Smartphone className="w-4 h-4" />}
                           {mode === 'auto' && <Laptop className="w-4 h-4" />}
                           {mode}
                        </span>
                      </label>
                    ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">Windows mode uses sidebar & fluent design. Android mode uses bottom navigation & material design.</p>
             </div>

             {/* Dark Mode Selector */}
             <div>
                <label className="block text-sm font-bold text-slate-400 uppercase mb-3">Color Mode</label>
                <div className="flex bg-slate-100 dark:bg-gray-900 p-1 rounded-xl">
                    {(['light', 'dark', 'system'] as DarkMode[]).map((mode) => (
                      <label key={mode} className={`flex-1 flex items-center justify-center py-2 rounded-lg cursor-pointer transition-all ${currentDarkMode === mode ? 'bg-white dark:bg-gray-700 shadow-sm font-bold text-purple-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <input type="radio" {...register('darkMode')} value={mode} className="hidden" />
                        <span className="capitalize flex items-center gap-2">
                           {mode === 'light' && <Sun className="w-4 h-4" />}
                           {mode === 'dark' && <Moon className="w-4 h-4" />}
                           {mode === 'system' && <Laptop className="w-4 h-4" />}
                           {mode}
                        </span>
                      </label>
                    ))}
                </div>
             </div>
           </div>

           <div className="mt-8">
             <label className="block text-sm font-bold text-slate-400 uppercase mb-3">Accent Theme</label>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ThemeOption value="blue" color="bg-blue-600" label="Ocean Blue" />
                <ThemeOption value="green" color="bg-emerald-600" label="Nature Green" />
                <ThemeOption value="purple" color="bg-purple-600" label="Royal Purple" />
                <ThemeOption value="dark" color="bg-gray-900" label="Midnight" />
             </div>
           </div>
        </section>

        {/* GST Section */}
        <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-gray-700">
           <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-white"><Building2 className="w-5 h-5" /><h3 className="text-xl font-bold">GST Configuration</h3></div>
           <div className="space-y-6">
              <label className="flex items-center cursor-pointer p-4 bg-slate-50 dark:bg-gray-700/50 rounded-2xl border-2 border-transparent has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 transition-all">
                <input type="checkbox" {...register('useDefaultGST')} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 mr-4" />
                <div>
                  <div className="font-bold text-slate-800 dark:text-white">Force Default GST Rate</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Enable this to apply a fixed GST rate to every item on a new bill.</div>
                </div>
              </label>

              {useDefaultGST && (
                <div className="animate-in slide-in-from-top-2">
                   <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Default GST Rate (%)</label>
                   <select {...register('defaultGSTRate')} className="w-full md:w-48 rounded-xl border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                   </select>
                </div>
              )}
           </div>
        </section>

        {/* Company Details */}
        <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-white"><Building2 className="w-5 h-5" /><h3 className="text-xl font-bold">Company Details</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2"><label className="label">Company Name</label><input {...register('companyName', { required: true })} className="input-field" /></div>
            <div><label className="label">GSTIN</label><input {...register('gstin')} className="input-field" /></div>
            <div><label className="label">Phone</label><input {...register('phone')} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Address 1</label><input {...register('addressLine1')} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Address 2</label><input {...register('addressLine2')} className="input-field" /></div>
          </div>
        </section>

        <div className="flex justify-end sticky bottom-4 z-30">
          <button type="submit" className="flex items-center px-8 py-4 bg-blue-600 text-white font-bold rounded-full shadow-xl hover:scale-105 transition-all">
            <Save className="w-5 h-5 mr-2" /> Save Settings
          </button>
        </div>
      </form>
      
      <style>{`
        .label { display: block; font-size: 0.875rem; font-weight: 600; color: #94a3b8; margin-bottom: 0.25rem; text-transform: uppercase; }
        .input-field { width: 100%; border-radius: 0.75rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; outline: none; transition: all 0.2s; }
        .dark .input-field { background-color: #111827; border-color: #374151; color: white; }
        .input-field:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
      `}</style>
    </div>
  );
};