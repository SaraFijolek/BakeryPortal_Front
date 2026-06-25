import { Routes, Route } from "react-router-dom";
import './App.css'
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Login2FA from "./pages/Login2FA.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import ConfirmAccount from "./pages/ConfirmAccount.tsx";
import Advertisement from "./pages/Advertisement.tsx";
import Message from "./pages/Message.tsx";
import Comments from "./pages/Comments.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";
import UserProfile from "./pages/UserProfile.tsx";
import RatingsManager from "./pages/Ratingsmanager.tsx";

function App() {


  return (
      <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login2fa" element={<Login2FA />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/confirm-account" element={<ConfirmAccount />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/add-ad" element={<Advertisement/>} />
          <Route path="/message" element={<Message/>}/>
          <Route path="/comments" element={<Comments/>}/>
          <Route path="/admin" element={<AdminPanel/>}/>
          <Route path ="/ratingmenager" element={<RatingsManager/>} />
      </Routes>

  )
}

export default App
