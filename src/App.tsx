import React from 'react';
import { Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// import Header from './components/Header';

const App: React.FC = () => {
  return (
    <>
      <ToastContainer />
      <div className="my-2">
        <Outlet />
      </div>
    </>
  );
};

export default App;
