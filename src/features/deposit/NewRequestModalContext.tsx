import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';
import { DepositEditor } from './DepositEditor';
import { useTranslation } from '../../i18n/I18nContext';
import '../dashboard/new-request-dialog.css';

interface NewRequestModalContextValue {
  openNewRequestModal: () => void;
  closeNewRequestModal: () => void;
  isOpen: boolean;
}

const NewRequestModalContext =
  createContext<NewRequestModalContextValue | null>(null);

export function NewRequestModalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation();

  const openNewRequestModal = useCallback(() => {
    setIsInitialized(true);
    setIsOpen(true);
  }, []);

  const closeNewRequestModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const completeNewRequestModal = useCallback(() => {
    setIsOpen(false);
    setIsInitialized(false);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen, isInitialized]);

  return (
    <NewRequestModalContext.Provider
      value={{
        openNewRequestModal,
        closeNewRequestModal,
        isOpen,
      }}
    >
      {children}

      <dialog
        ref={dialogRef}
        className="employer-request-dialog"
        aria-labelledby="employer-request-dialog-title"
        onClose={closeNewRequestModal}
        onClick={event => {
          if (event.target === event.currentTarget) {
            closeNewRequestModal();
          }
        }}
      >
        <header className="employer-request-dialog__header">
          <h2 id="employer-request-dialog-title">{t('nav.newRequest')}</h2>
          <button
            className="employer-request-dialog__close"
            type="button"
            aria-label={t('shell.closeDialog')}
            onClick={closeNewRequestModal}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {isInitialized && (
          <DepositEditor
            embedded
            onComplete={completeNewRequestModal}
          />
        )}
      </dialog>
    </NewRequestModalContext.Provider>
  );
}

export function useNewRequestModal() {
  const context = useContext(NewRequestModalContext);

  if (!context) {
    throw new Error('NewRequestModalProvider is required');
  }

  return context;
}
