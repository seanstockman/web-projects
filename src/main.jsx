import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import './index.css';
import App from './App.jsx';
import Interlining from './interlining/Interlining.jsx';
import { createTheme, ThemeProvider } from '@mui/material';
import { lime, red } from '@mui/material/colors';
import ResponsiveAppBar from './components/ResponsiveAppBar.jsx';


const theme = createTheme({
  primary: red,
  secondary: lime
});

createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={theme}>
    <ResponsiveAppBar/>
    <BrowserRouter>
      <Routes>
        <Route index element={<App />} />
        <Route path="interlining" element={<Interlining />} />
      </Routes>
    </BrowserRouter>,
  </ThemeProvider>
)
