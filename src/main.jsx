import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import './index.css';
import App from './App.jsx';
import Interlining from './interlining/Interlining.jsx';
import DelaunayTriangulation from './delaunay-triangulation/DelaunayTriangulation.tsx';
import { Container, createTheme, ThemeProvider } from '@mui/material';
import { lime, red } from '@mui/material/colors';
import ResponsiveAppBar from './components/ResponsiveAppBar.jsx';
import useMediaQuery from '@mui/material/useMediaQuery';
import CssBaseline from '@mui/material/CssBaseline';

function Root() {
  // const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  // const [mode, setMode] = useState(prefersDarkMode);

  // useEffect(() => {
  //   const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  //   const handler = (e) => setMode(e.matches ? 'dark' : 'light');
  //   mediaQuery.addEventListener('change', handler);
  //   return () => mediaQuery.removeEventListener('change', handler);
  // }, []);

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');


  const themeOptions = {
    palette: {
      primary: {
        main: '#8937e1'
      },
      secondary: {
        main: '#1e76c8'
      },
      mode: prefersDarkMode ? 'dark' : 'light',
      background: prefersDarkMode
        ? {
          default: '#25213f',
          paper: '#25213f'
        }
        : {
          default: '#c4c0de',
          paper: 'rgb(240, 239, 246)',
        },
    },
    typography: {
      fontFamily: 'Verdana',
      fontSize: 13,
      fontWeightLight: 100,
      fontWeightRegular: 200,
      fontWeightMedium: 300,
      fontWeightBold: 500
    },
    spacing: 8,
    shape: {
      borderRadius: 0
    }
  };

  const theme = createTheme(themeOptions);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ResponsiveAppBar />
      <Container maxWidth="lg">
        <BrowserRouter>
          <Routes>
            <Route index element={<App />} />
            <Route path="projects/interlining" element={<Interlining />} />
            <Route path="projects/delaunay" element={<DelaunayTriangulation />} />
          </Routes>
        </BrowserRouter>
      </Container>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <Root />
)