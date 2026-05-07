import React, { useState, useEffect } from 'react';

const PasswordGate = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  console.log("rendering PasswordGate");

  useEffect(() => {
    console.log("useEffect running");
    const auth = localStorage.getItem('studio_flow_auth');
    console.log("auth value:", auth);

    setIsAuthenticated(auth === 'true');
  }, []);

  // 👇 TEMPORARY: always show something so we see render
  return (
    <div style={{ color: "white", padding: 20 }}>
      <div>PasswordGate is rendering</div>

      <div>Auth state: {String(isAuthenticated)}</div>

      <button onClick={() => setIsAuthenticated(true)}>
        FORCE LOGIN
      </button>

      <div style={{ marginTop: 20 }}>
        {isAuthenticated ? children : "LOCKED"}
      </div>
    </div>
  );
};

export default PasswordGate;
