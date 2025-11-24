
import React, { useState, useRef } from 'react';
import { Employee, Department } from '../types';
import { DEPARTMENTS } from '../constants';
import { X, Plus, Trash2, BriefcaseMedical, Store, Pencil, Save, GripVertical } from 'lucide-react';

interface Props {
  employees: Employee[];
  setEmployees: (emps: Employee[]) => void;
  isOpen: boolean;
  onClose: () => void;
  storeName: string; // Added storeName prop
}

export const EmployeeManager: React.FC<Props> = ({ employees, setEmployees, isOpen, onClose, storeName }) => {
  const [newName, setNewName] = useState('');
  const [department, setDepartment] = useState<Department>('retail');
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // DnD State
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const activeSection = useRef<Department | null>(null);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newId = Date.now().toString();
    setEmployees([...employees, { 
      id: newId, 
      name: newName.trim(), 
      department 
    }]);
    setNewName('');
  };

  const handleRemove = (id: string) => {
    if (window.confirm('確定要刪除此員工嗎？這將會清除該員工的排班資料。')) {
      setEmployees(employees.filter(e => e.id !== id));
    }
  };

  const startEditing = (emp: Employee) => {
    setEditingId(emp.id);
    setEditName(emp.name);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      setEmployees(employees.map(e => 
        e.id === editingId ? { ...e, name: editName.trim() } : e
      ));
      setEditingId(null);
      setEditName('');
    }
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number, dept: Department) => {
    dragItem.current = index;
    activeSection.current = dept;
    // Add a class for visual feedback if needed
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number, dept: Department) => {
    // Only allow sorting within the same department
    if (activeSection.current !== dept) return;
    dragOverItem.current = index;
    e.preventDefault();
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>, dept: Department) => {
    e.currentTarget.classList.remove('opacity-50');
    
    if (dragItem.current !== null && dragOverItem.current !== null && activeSection.current === dept) {
      // Filter out employees of this department
      const deptEmployees = employees.filter(e => e.department === dept);
      const otherEmployees = employees.filter(e => e.department !== dept);
      
      // Reorder within the department list
      const copyDeptItems = [...deptEmployees];
      const dragItemContent = copyDeptItems[dragItem.current];
      copyDeptItems.splice(dragItem.current, 1);
      copyDeptItems.splice(dragOverItem.current, 0, dragItemContent);
      
      // Reconstruct the full list (Retail first, then Dispensing to maintain strict global order logic)
      if (dept === 'retail') {
        setEmployees([...copyDeptItems, ...otherEmployees]);
      } else {
        setEmployees([...otherEmployees, ...copyDeptItems]);
      }
    }
    
    dragItem.current = null;
    dragOverItem.current = null;
    activeSection.current = null;
  };

  const renderEmployeeList = (dept: Department) => {
    const filteredEmps = employees.filter(e => e.department === dept);
    
    return (
      <div className="space-y-2 mb-6">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-2">
          {dept === 'retail' ? <Store size={14} /> : <BriefcaseMedical size={14} />}
          {DEPARTMENTS[dept]}
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {filteredEmps.length}人
          </span>
        </h3>
        
        {filteredEmps.length === 0 ? (
           <p className="text-sm text-gray-400 italic pl-4">無員工資料</p>
        ) : (
          filteredEmps.map((emp, index) => (
            <div 
              key={emp.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index, dept)}
              onDragEnter={(e) => handleDragEnter(e, index, dept)}
              onDragEnd={(e) => handleDragEnd(e, dept)}
              onDragOver={(e) => e.preventDefault()}
              className="flex justify-between items-center p-3 bg-white border border-gray-100 shadow-sm rounded-lg group hover:border-brand-200 hover:shadow-md transition-all cursor-move"
            >
              <div className="flex items-center gap-3 flex-1">
                <GripVertical size={16} className="text-gray-300 group-hover:text-gray-500" />
                
                {editingId === emp.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      autoFocus
                      className="flex-1 px-2 py-1 text-sm border border-brand-300 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                    <button onClick={saveEdit} className="text-green-600 hover:text-green-700">
                      <Save size={18} />
                    </button>
                  </div>
                ) : (
                  <span className="font-medium text-gray-700 flex-1">{emp.name}</span>
                )}
              </div>
              
              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                {editingId !== emp.id && (
                  <button 
                    onClick={() => startEditing(emp)}
                    className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded"
                    title="編輯姓名"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                <button 
                  onClick={() => handleRemove(emp.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="刪除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in-up">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl">
          <h2 className="text-gray-800 text-lg font-bold flex items-center gap-2">
            <UsersIcon /> 
            <span>管理員工名單</span>
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-1">
              {storeName}
            </span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        {/* Add New Section */}
        <div className="p-6 bg-white border-b border-gray-200">
          <div className="flex flex-col gap-3">
             <div className="flex gap-4">
               <label className="flex items-center gap-2 cursor-pointer select-none">
                 <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${department === 'retail' ? 'border-brand-600' : 'border-gray-300'}`}>
                    {department === 'retail' && <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                 </div>
                 <input 
                   type="radio" 
                   name="dept" 
                   value="retail" 
                   checked={department === 'retail'}
                   onChange={() => setDepartment('retail')}
                   className="hidden"
                 />
                 <span className={`flex items-center gap-1 text-sm font-medium ${department === 'retail' ? 'text-brand-700' : 'text-gray-600'}`}>
                    <Store size={16} /> {DEPARTMENTS.retail}
                 </span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer select-none">
                 <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${department === 'dispensing' ? 'border-brand-600' : 'border-gray-300'}`}>
                    {department === 'dispensing' && <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                 </div>
                 <input 
                   type="radio" 
                   name="dept" 
                   value="dispensing" 
                   checked={department === 'dispensing'}
                   onChange={() => setDepartment('dispensing')}
                   className="hidden"
                 />
                 <span className={`flex items-center gap-1 text-sm font-medium ${department === 'dispensing' ? 'text-brand-700' : 'text-gray-600'}`}>
                    <BriefcaseMedical size={16} /> {DEPARTMENTS.dispensing}
                 </span>
               </label>
             </div>
             <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder="輸入新員工姓名..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-sm"
                />
                <button 
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors text-sm font-medium shadow-sm"
                >
                  <Plus size={18} /> 新增
                </button>
             </div>
          </div>
        </div>

        {/* List Section */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {renderEmployeeList('retail')}
          <div className="border-t border-gray-200 my-4"></div>
          {renderEmployeeList('dispensing')}
        </div>

        <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-end rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-8 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors shadow-sm text-sm"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
