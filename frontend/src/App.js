import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import CourierSearch from "./components/CourierSearch";
import WoltDashboard from "./components/WoltDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CourierSearch />} />
        <Route path="/dashboard" element={<WoltDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
