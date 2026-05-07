import React, { useState, useEffect } from 'react';

interface PasswordGateProps {
  children: React.ReactNode;
}

const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem('studio_flow_auth');
    setIsAuthenticated(auth === 'true');
    setLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password === 'lambchop.makes') {
      setIsAuthenticated(true);
      localStorage.setItem('studio_flow_auth', 'true');
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (loading) {
    return (
      <div style={{ color: 'white', padding: 40 }}>
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div style={{ color: 'white', padding: 40 }}>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
        />
        <button type="submit">Enter</button>
        {error && <p>Wrong password</p>}
      </form>
    </div>
  );
};

export default PasswordGate;
