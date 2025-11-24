
import React from 'react';
import { X, MousePointer, MousePointer2, Save, AlertCircle, Clock, CheckCircle, RotateCcw, FileJson, Upload } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-4 flex justify-between items-center rounded-t-xl shrink-0">
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            📖 操作說明與注意事項
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={28} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50">
          
          {/* Section 1: Basic Workflow */}
          <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
              <span className="bg-brand-100 text-brand-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              基本流程
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <ul className="space-y-2 list-disc pl-5">
                <li><strong>選擇分店：</strong>上方下拉選單切換不同分店，員工名單與排班資料皆為獨立。</li>
                <li><strong>設定區間：</strong>點擊日期欄位選擇排班的開始與結束日期。</li>
                <li><strong>管理設定：</strong>初次使用請先至「管理員工」建立名單，與「管理班別」設定常用班別。</li>
              </ul>
              <div className="bg-blue-50 p-3 rounded-lg text-blue-800 text-xs leading-relaxed">
                💡 <strong>小撇步：</strong> 每個分店的員工名單是分開儲存的，切換分店後記得確認員工資料。
              </div>
            </div>
          </section>

          {/* Section 2: Grid Interaction */}
          <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
              <span className="bg-brand-100 text-brand-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              如何排班 (滑鼠操作)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="bg-gray-100 p-2 rounded-lg text-gray-600 shrink-0">
                   <MousePointer size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">單次點擊 (左鍵)</h4>
                  <p className="text-sm text-gray-600 mb-2">點擊格子開啟「班別選單」，選擇 A班、P班或休假。</p>
                  <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block">
                    💡 點選選單內的「回復預設」可清除該格修改
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-red-50 p-2 rounded-lg text-red-600 shrink-0">
                   <MousePointer2 size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">雙次點擊 (左鍵雙擊)</h4>
                  <p className="text-sm text-gray-600 mb-2">針對已排好班的格子，雙擊可設定 <strong>加班時數 (+1~4)</strong>。</p>
                  <p className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded inline-block font-bold">
                    ⚠️ 僅限正常上班班別 (如 A、P、全) 可設定加班
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Visual Indicators */}
          <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
              <span className="bg-brand-100 text-brand-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
              燈號與狀態
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 border rounded-lg flex items-center justify-center bg-blue-100 text-blue-800 border-blue-200 font-bold">
                  A
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">橘色呼吸燈 (未儲存)</h4>
                  <p className="text-sm text-gray-600">
                    代表該格資料已修改但<strong>尚未儲存</strong>。請記得按下右上角的「儲存」按鈕，燈號消失才算存檔成功。
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                 <div className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-lg">
                    <RotateCcw size={20} />
                 </div>
                 <div>
                    <h4 className="font-bold text-gray-900">回復預設 (清空)</h4>
                    <p className="text-sm text-gray-600">
                       上方工具列的紅色「回復預設」按鈕，會將目前選取區間的排班<strong>還原</strong>到上次存檔的狀態，並非全部刪除為空白。
                    </p>
                 </div>
              </div>
            </div>
          </section>
          
          {/* Section 4: Data Portability */}
          <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                <span className="bg-brand-100 text-brand-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                跨裝置存取 (備份與還原)
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-gray-50 p-3 rounded-lg flex gap-3">
                  <div className="bg-white p-2 rounded shadow-sm h-fit"><FileJson size={20} className="text-gray-600"/></div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">備份專案 (下載)</h4>
                    <p className="text-xs text-gray-500 mt-1">點擊上方工具列的 <FileJson size={14} className="inline"/> 圖示，將目前的員工、班別設定與所有排班記錄打包成一個 <code>.json</code> 檔案下載到電腦。</p>
                  </div>
               </div>
               <div className="bg-gray-50 p-3 rounded-lg flex gap-3">
                  <div className="bg-white p-2 rounded shadow-sm h-fit"><Upload size={20} className="text-gray-600"/></div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">還原專案 (匯入)</h4>
                    <p className="text-xs text-gray-500 mt-1">點擊上方工具列的 <Upload size={14} className="inline"/> 圖示，選擇之前備份的 <code>.json</code> 檔案。<strong>注意：這將會覆蓋您目前瀏覽器上的所有資料！</strong></p>
                  </div>
               </div>
             </div>
          </section>

          {/* Section 5: Important Notes */}
          <section className="bg-yellow-50 p-5 rounded-xl border border-yellow-200">
             <h3 className="text-lg font-bold text-yellow-800 mb-3 flex items-center gap-2">
                <AlertCircle size={20} /> 重要注意事項
             </h3>
             <ul className="space-y-2 text-sm text-yellow-900 list-decimal pl-5">
                <li>
                   <strong>資料儲存於瀏覽器：</strong> 本系統資料儲存在您的電腦瀏覽器中 (LocalStorage)。若清除瀏覽器快取或更換電腦，資料將會消失。建議定期使用「備份專案」下載 JSON 檔。
                </li>
                <li>
                   <strong>Excel 僅供列印：</strong> 「匯出 Excel」產生的檔案僅供列印或傳閱，<strong>無法</strong>再匯入回系統編輯。若要保留編輯進度，請使用「備份專案」。
                </li>
                <li>
                   <strong>手動儲存：</strong> 為避免誤改，系統<strong>不會自動儲存</strong>。修改完畢後請務必點擊右上角的「儲存」按鈕。
                </li>
             </ul>
          </section>

        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-end rounded-b-xl shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-sm transition-colors"
          >
            我瞭解了
          </button>
        </div>
      </div>
    </div>
  );
};
