'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type AlertType = 'success' | 'error' | 'info';

interface ModalContextType {
  showAlert: (title: string, message: string, type?: AlertType) => Promise<void>;
  showConfirm: (title: string, message: string) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [alertModal, setAlertModal] = useState<{isOpen: boolean, title: string, message: string, type: AlertType, onConfirm: () => void} | null>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void} | null>(null);

  const showAlert = (title: string, message: string, type: AlertType = 'info'): Promise<void> => {
    return new Promise((resolve) => {
      setAlertModal({ isOpen: true, title, message, type, onConfirm: () => {
        setAlertModal(null);
        resolve();
      }});
    });
  };

  const showConfirm = (title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({ isOpen: true, title, message, onConfirm: () => {
        setConfirmModal(null);
        resolve(true);
      }, onCancel: () => {
        setConfirmModal(null);
        resolve(false);
      }});
    });
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Alert Modal */}
      {alertModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all">
            <div className={`p-6 border-b ${alertModal.type === 'success' ? 'border-green-100 bg-green-50' : alertModal.type === 'error' ? 'border-red-100 bg-red-50' : 'border-blue-100 bg-blue-50'}`}>
              <h3 className={`font-bold text-lg ${alertModal.type === 'success' ? 'text-green-800' : alertModal.type === 'error' ? 'text-red-800' : 'text-blue-800'}`}>
                {alertModal.title}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 font-medium">{alertModal.message}</p>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50">
              <button
                onClick={() => alertModal.onConfirm()}
                className={`px-6 py-2 rounded-xl font-bold text-white shadow-sm transition-colors ${
                  alertModal.type === 'success' ? 'bg-green-600 hover:bg-green-700' : alertModal.type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-blue hover:bg-brand-blue/90'
                }`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all">
            <div className="p-6 border-b border-orange-100 bg-orange-50">
              <h3 className="font-bold text-lg text-orange-800 flex items-center gap-2">
                Atención: {confirmModal.title}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 font-medium leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => confirmModal.onCancel()}
                className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmModal.onConfirm()}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
              >
                Sí, estoy seguro
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
