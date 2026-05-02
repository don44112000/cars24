import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Landing from './pages/Landing/Landing';
import Start from './pages/Start/Start';
import Check from './pages/Check/Check';
import Results from './pages/Results/Results';
import Documents from './pages/Documents/Documents';
import History from './pages/History/History';
import Help from './pages/Help/Help';

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/start" element={<Start />} />
          <Route path="/check" element={<Check />} />
          <Route path="/results" element={<Results />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/history" element={<History />} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
