import { useState, useEffect, useCallback } from 'react';
import { LandingPage } from '@/pages/LandingPage';
import { InputPage } from '@/pages/InputPage';
import { LoadingPage } from '@/pages/LoadingPage';
import { StorefrontPage } from '@/pages/StorefrontPage';
import { SharePage } from '@/pages/SharePage';
import { ErrorPage } from '@/pages/ErrorPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { validateStoreData } from '@/services/aiExtraction';
import { saveStore, getStoreById, getStoreUrl } from '@/services/storage';
import type { AppStep, StoreData, StoreRecord } from '@/types/store';
import './App.css';

function App() {
  const [step, setStep] = useState<AppStep>('landing');
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [storeRecord, setStoreRecord] = useState<StoreRecord | null>(null);
  const [error, setError] = useState<string>('');
  const [viewingStoreId, setViewingStoreId] = useState<string | null>(null);

  // Handle hash-based routing for store pages
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#store/')) {
        const storeId = hash.replace('#store/', '');
        const store = getStoreById(storeId);
        if (store) {
          setStoreData(store);
          setStoreRecord(store);
          setViewingStoreId(storeId);
          setStep('storefront');
        } else {
          setStep('storefront');
          setViewingStoreId(storeId);
          setStoreData(null);
        }
      } else if (hash === '' || hash === '#') {
        setStep('landing');
        setViewingStoreId(null);
      }
    };

    // Check hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleStart = useCallback(() => {
    setStep('input');
    window.location.hash = 'input';
  }, []);

  const handleSubmitInput = useCallback((data: StoreData) => {
    setStep('loading');
    setError('');

    // Small delay to show loading state
    setTimeout(() => {
      try {
        // Validate extracted data
        const validation = validateStoreData(data);
        if (!validation.valid) {
          setError(validation.error || 'Invalid data provided');
          setStep('error');
          return;
        }

        // Save to storage
        const record = saveStore(data);

        setStoreData(data);
        setStoreRecord(record);
        setStep('storefront');
        window.location.hash = `store/${record.id}`;
      } catch (err) {
        setError('Failed to create your website. Please try again.');
        setStep('error');
      }
    }, 800);
  }, []);

  const handleShare = useCallback(() => {
    setStep('share');
  }, []);

  const handleBackToLanding = useCallback(() => {
    setStep('landing');
    setStoreData(null);
    setStoreRecord(null);
    setError('');
    window.location.hash = '';
  }, []);

  const handleRetry = useCallback(() => {
    setStep('input');
    setError('');
  }, []);

  const handleViewStore = useCallback(() => {
    if (storeRecord) {
      setStep('storefront');
      window.location.hash = `store/${storeRecord.id}`;
    }
  }, [storeRecord]);

  const handleBackFromStorefront = useCallback(() => {
    if (viewingStoreId && storeRecord?.id !== viewingStoreId) {
      // User was viewing someone else's store
      setStep('landing');
      setViewingStoreId(null);
      window.location.hash = '';
    } else {
      // User was viewing their own newly created store
      setStep('share');
    }
  }, [viewingStoreId, storeRecord]);

  // Render appropriate page based on current step
  const renderPage = () => {
    switch (step) {
      case 'landing':
        return <LandingPage onStart={handleStart} />;

      case 'input':
        return (
          <InputPage
            onSubmit={handleSubmitInput}
            onBack={handleBackToLanding}
          />
        );

      case 'loading':
        return <LoadingPage />;

      case 'storefront':
        if (storeData && storeRecord) {
          return (
            <StorefrontPage
              data={storeData}
              storeId={storeRecord.id}
              onShare={handleShare}
              onBack={handleBackFromStorefront}
            />
          );
        }
        // Viewing a store that doesn't exist
        if (viewingStoreId && !storeData) {
          return <NotFoundPage onHome={handleBackToLanding} />;
        }
        return <NotFoundPage onHome={handleBackToLanding} />;

      case 'share':
        if (storeRecord) {
          return (
            <SharePage
              storeUrl={getStoreUrl(storeRecord.id)}
              storeName={storeRecord.store_name}
              onBack={handleBackToLanding}
              onViewStore={handleViewStore}
            />
          );
        }
        return <NotFoundPage onHome={handleBackToLanding} />;

      case 'error':
        return (
          <ErrorPage
            message={error}
            onRetry={handleRetry}
            onBack={() => setStep('input')}
          />
        );

      default:
        return <LandingPage onStart={handleStart} />;
    }
  };

  return (
    <div className="app-container">
      {renderPage()}
    </div>
  );
}

export default App;
