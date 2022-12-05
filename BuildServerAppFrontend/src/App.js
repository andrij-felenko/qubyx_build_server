import React from 'react';

import { Route, Routes } from 'react-router-dom';
import './App.css';

import Header from './components/Header';
import NotFoundPage from './pages/NotFoundPage';
import StartingPage from './pages/StartingPage';

const App = () => {
  return (
    <div className='app-container'>
      <Header />
      <main>
        <Routes>
          <Route path='/' element={<StartingPage />} />
          <Route path='*' element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
