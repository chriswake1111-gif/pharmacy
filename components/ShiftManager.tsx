
import React, { useState, useRef } from 'react';
import { ShiftDefinition } from '../types';
import { X, Plus, Trash2, Save, Clock, Type, Palette, GripVertical, AlertCircle, FileText } from 'lucide-react';

interface Props {
  shiftDefs: Record<string, ShiftDefinition>;
  setShiftDefs: (defs: Record<string, ShiftDefinition>) => void;
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { name: 'Blue', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { name: 'Indigo', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { name: 'Purple', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { name: 'Pink', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { name: 'Rose', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { name: 'Orange', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { name: 'Amber', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { name: 'Yellow', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { name: 'Green', color: 'bg-green-100 text-green-700 border-green-200' },
  { name: 'Emerald', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { name: 'Teal', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { name: 'Cyan', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { name: 'Sky', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  { name: 'Gray', color: 'bg-gray-100 text-gray-600 border-gray-200' },
];

export const ShiftManager: React.FC<Props> = ({ shiftDefs, setShiftDefs, isOpen, onClose }) => {
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form State
  const [formData, setFormData] = useState<Partial<ShiftDefinition>>({});

  // DnD State
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  
  if (!isOpen) return null;

  const sortedShifts = (Object.values(shiftDefs) as ShiftDefinition[]).sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!formData.label?.trim()) {
      newErrors.label = '請輸入班別名稱';
      isValid = false;
    }

    if (!formData.shortLabel?.trim()) {
      newErrors.shortLabel = '請輸入簡稱';
      isValid = false;
    }

    // Time validation: Simple check for HH:MM - HH:MM or specific keywords like "休假"
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s*-\s*([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    // Allow standard format OR "休假"
    if (formData.time && !timePattern.test(formData.time) && formData.time !== '休假') {
      newErrors.time = '格式需為 09:00 - 17:30';
      isValid = false;
    }

    if (formData.hours === undefined || formData.hours < 0) {
      newErrors.hours = '時數必須大於等於 0';
      isValid = false;
    }

    if (formData.defaultOvertime !== undefined && formData.defaultOvertime < 0) {
      newErrors.defaultOvertime = '加班時數不能為負';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleEdit = (shift: ShiftDefinition) => {
    setEditingCode(shift.code);
    setFormData({ ...shift });
    setErrors({});
  };

  const handleCreate = () => {
    setEditingCode('NEW');
    setFormData({
      code: `CUSTOM_${Date.now()}`,
      label: '新班別',
      shortLabel: '新',
      time: '09:00 - 17:00',
      hours: 8,
      defaultOvertime: 0,
      description: '',
      color: COLOR_PRESETS[0].color,
      sortOrder: sortedShifts.length + 1
    });
    setErrors({});
  };

  const handleSave = () => {
    if (!validateForm()) return;

    if (!formData.code) return;

    const newShift: ShiftDefinition = {
      code: formData.code,
      label: formData.label!,
      shortLabel: formData.shortLabel!,
      time: formData.time || '',
      hours: Number(formData.hours) || 0,
      defaultOvertime: Number(formData.defaultOvertime) || 0,
      color: formData.color || COLOR_PRESETS[0].color,
      description: formData.description || '',
      sortOrder: formData.sortOrder || 99
    };

    setShiftDefs({
      ...shiftDefs,
      [newShift.code]: newShift
    });
    setEditingCode(null);
    setFormData({});
    setErrors({});
  };

  const handleDelete = (code: string) => {
    if (Object.keys(shiftDefs).length <= 1) {
      alert('至少需要保留一個班別');
      return;
    }
    if (window.confirm('確定要刪除此班別嗎？')) {
      const newDefs = { ...shiftDefs };
      delete newDefs[code];
      setShiftDefs(newDefs);
      if (editingCode === code) {
        setEditingCode(null);
      }
    }
  };

  // DnD Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
    e.preventDefault();
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const copyList = [...sortedShifts];
      const dragItemContent = copyList[dragItem.current];
      copyList.splice(dragItem.current, 1);
      copyList.splice(dragOverItem.current, 0, dragItemContent);
      
      const newDefs = { ...shiftDefs };
      copyList.forEach((shift, index) => {
         newDefs[shift.code] = {
           ...shift,
           sortOrder: index + 1
         };
      });
      setShiftDefs(newDefs);
    }
    
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const renderForm = () => (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 animate-fade-in-up cursor-default">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">班別名稱 <span className="text-red-500">*</span></label>
          <input 
            value={formData.label || ''}
            onChange={e => setFormData({...formData, label: e.target.value})}
            className={`w-full px-3 py-2 border rounded-md text-sm ${errors.label ? 'border-red-500 bg-red-50' : ''}`}
            placeholder="例如: 早班"
          />
          {errors.label && <p className="text-xs text-red-500 mt-1">{errors.label}</p>}
        </div>
        <div>
           <label className="block text-xs font-bold text-gray-500 mb-1">簡稱 (顯示用) <span className="text-red-500">*</span></label>
           <input 
            value={formData.shortLabel || ''}
            onChange={e => setFormData({...formData, shortLabel: e.target.value})}
            className={`w-full px-3 py-2 border rounded-md text-sm ${errors.shortLabel ? 'border-red-500 bg-red-50' : ''}`}
            placeholder="例如: 早"
            maxLength={4}
          />
          {errors.shortLabel && <p className="text-xs text-red-500 mt-1">{errors.shortLabel}</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">時間區間</label>
          <input 
            value={formData.time || ''}
            onChange={e => setFormData({...formData, time: e.target.value})}
            className={`w-full px-3 py-2 border rounded-md text-sm ${errors.time ? 'border-red-500 bg-red-50' : ''}`}
            placeholder="09:00 - 17:30"
          />
          {errors.time && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10}/> {errors.time}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div>
               <label className="block text-xs font-bold text-gray-500 mb-1">正班時數</label>
               <input 
                type="number"
                step="0.5"
                min="0"
                value={formData.hours || 0}
                onChange={e => setFormData({...formData, hours: parseFloat(e.target.value)})}
                className={`w-full px-3 py-2 border rounded-md text-sm ${errors.hours ? 'border-red-500 bg-red-50' : ''}`}
              />
               {errors.hours && <p className="text-xs text-red-500 mt-1">{errors.hours}</p>}
            </div>
            <div>
               <label className="block text-xs font-bold text-red-500 mb-1">預設加班</label>
               <input 
                type="number"
                step="0.5"
                min="0"
                value={formData.defaultOvertime || 0}
                onChange={e => setFormData({...formData, defaultOvertime: parseFloat(e.target.value)})}
                className={`w-full px-3 py-2 border rounded-md text-sm text-red-600 font-bold bg-red-50 ${errors.defaultOvertime ? 'border-red-500' : ''}`}
              />
               {errors.defaultOvertime && <p className="text-xs text-red-500 mt-1">{errors.defaultOvertime}</p>}
            </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-500 mb-1">班別說明 / 備註</label>
        <div className="relative">
          <FileText size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input 
            value={formData.description || ''}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-brand-500 outline-none"
            placeholder="例如: 含0.5小時休息時間..."
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-500 mb-2">顏色樣式</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => setFormData({...formData, color: preset.color})}
              className={`w-8 h-8 rounded-full border-2 transition-all ${preset.color.replace('text-', 'bg-').split(' ')[0]} ${formData.color === preset.color ? 'border-gray-600 scale-110 shadow-md' : 'border-transparent'}`}
              title={preset.name}
            />
          ))}
          <div className={`ml-2 px-3 py-1 rounded text-sm flex items-center ${formData.color}`}>
             預覽樣式
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button 
          onClick={() => {
            setEditingCode(null);
            setErrors({});
          }}
          className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded text-sm"
        >
          取消
        </button>
        <button 
          onClick={handleSave}
          className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 text-sm flex items-center gap-2"
        >
          <Save size={16} /> 儲存
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl">
          <h2 className="text-gray-800 text-lg font-bold flex items-center gap-2">
            <Clock size={20} /> 管理班別設定
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-white">
          {/* List existing shifts */}
          <div className="space-y-3 mb-6">
             {sortedShifts.map((shift, index) => (
                <div 
                  key={shift.code}
                  draggable={editingCode === null} 
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`transition-all ${editingCode === null ? 'cursor-move' : ''}`}
                >
                  {editingCode === shift.code ? (
                    renderForm()
                  ) : (
                    <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-brand-200 hover:shadow-sm transition-all group bg-gray-50">
                       <div className="flex items-center gap-3 flex-1">
                          <GripVertical size={20} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                          <div className={`w-12 h-10 rounded flex items-center justify-center text-xs font-bold ${shift.color} shadow-sm flex-shrink-0`}>
                             {shift.shortLabel}
                          </div>
                          <div>
                             <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                               {shift.label}
                               <span className="text-xs font-normal text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                 {shift.hours}h
                               </span>
                               {(shift.defaultOvertime || 0) > 0 && (
                                  <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                    +{shift.defaultOvertime} OT
                                  </span>
                               )}
                             </div>
                             <div className="flex items-center gap-2 text-xs text-gray-500">
                               <span>{shift.time}</span>
                               {shift.description && (
                                 <span className="text-gray-400 border-l pl-2 border-gray-300 truncate max-w-[150px]">
                                   {shift.description}
                                 </span>
                               )}
                             </div>
                          </div>
                       </div>
                       <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(shift)}
                            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded"
                          >
                            <Type size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(shift.code)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                       </div>
                    </div>
                  )}
                </div>
             ))}
          </div>
          
          {editingCode === 'NEW' && renderForm()}

          {editingCode !== 'NEW' && (
             <button 
               onClick={handleCreate}
               className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2 font-medium"
             >
               <Plus size={20} /> 新增班別
             </button>
          )}
        </div>
        
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end rounded-b-xl">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium text-sm shadow-sm"
           >
             完成
           </button>
        </div>
      </div>
    </div>
  );
};
