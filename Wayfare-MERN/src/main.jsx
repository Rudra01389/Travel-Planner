import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import App from "./App.jsx";
import { TripsProvider } from "./context/TripsContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TripsProvider>
          <App />
        </TripsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

import "./refinement.css";
