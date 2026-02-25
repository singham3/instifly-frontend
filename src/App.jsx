import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from "./components/home.jsx";
import About from "./components/about.jsx";
import Upload from "./components/upload.jsx";
import Login from "./components/login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import './App.css'

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/about" element={<About />} />
          <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
