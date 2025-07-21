import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AIBillProvider } from './Components/AIBillContext';
import dayjs from 'dayjs';
import 'dayjs/locale/en';

dayjs.locale('en'); // Set global locale to English

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AIBillProvider>
      <App />
    </AIBillProvider>
  </StrictMode>,
)
