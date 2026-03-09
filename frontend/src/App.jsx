import './App.css';

import {BrowserRouter, Route, Routes} from 'react-router-dom';
import Home from './Pages/Home';
import EditorPage from './Pages/EditorPage';
import { Toaster } from 'react-hot-toast';



const App = () => {
  return (
    <>
      {}
      <Toaster position="top-right" reverseOrder={false} /> 

      {/* routing  */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor/:roomId" element={<EditorPage />} />
        </Routes>
      </BrowserRouter>
    </>

  )
}

export default App

