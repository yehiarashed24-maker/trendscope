import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/Landing/LandingPage';
import { ExplorerPage } from './pages/Explorer/ExplorerPage';
import { AnalysisPage } from './pages/Analysis/AnalysisPage';
import { IntelligencePage } from './pages/Intelligence/IntelligencePage';
import { WorkspacePage } from './pages/Workspace/WorkspacePage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { OnboardingModal } from './features/onboarding/OnboardingModal';
import { applyDocumentDirection } from './i18n';

export const App: React.FC = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    applyDocumentDirection(i18n.language);
  }, [i18n.language]);

  return (
    <BrowserRouter>
      <OnboardingModal />
      <Routes>
        {/* Full-Screen Serene Hero + Parallax Quote Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Dedicated Individual Feature Routes under Detective Shell */}
        <Route element={<AppLayout />}>
          <Route path="/explorer" element={<ExplorerPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/intelligence" element={<IntelligencePage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/dashboard" element={<Navigate to="/analysis" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
