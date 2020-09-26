import React from "react";
import { BrowserRouter } from "react-router-dom";

import AuthState from "./context/auth/AuthState";

import App from "./App";

const MyApp = () => {
  return (
    <AuthState>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthState>
  );
};

export default MyApp;
