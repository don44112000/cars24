import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Landing from './pages/Landing/Landing';
import Start from './pages/Start/Start';
import Check from './pages/Check/Check';
import Results from './pages/Results/Results';
import Documents from './pages/Documents/Documents';
import History from './pages/History/History';
import Help from './pages/Help/Help';
import Forms from './pages/Forms/Forms';
import Verify from './pages/Verify/Verify';
import WizardLayout from './pages/Wizard/WizardLayout';
import WizardSetup from './pages/Wizard/WizardSetup';
import WizardVerify from './pages/Wizard/WizardVerify';
import WizardForms from './pages/Wizard/WizardForms';
import WizardResults from './pages/Wizard/WizardResults';

export default function App() {
  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Header />
      <main id="main-content" className="page-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Landing />} />
          {/* Standalone routes — preserved for independent feature use */}
          <Route path="/start" element={<Start />} />
          <Route path="/check" element={<Check />} />
          <Route path="/results" element={<Results />} />
          <Route path="/forms" element={<Forms />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/history" element={<History />} />
          <Route path="/help" element={<Help />} />

          {/* Merged wizard — orchestrates the three features */}
          <Route path="/wizard" element={<WizardLayout />}>
            <Route index element={<Navigate to="/wizard/setup" replace />} />
            <Route path="setup" element={<WizardSetup />} />
            <Route path="verify" element={<WizardVerify />} />
            <Route path="check" element={<Check />} />
            <Route path="forms" element={<WizardForms />} />
            <Route path="results" element={<WizardResults />} />
          </Route>
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
