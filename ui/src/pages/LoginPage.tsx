import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';

const GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
const IS_DEV = import.meta.env.DEV;

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, devLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/books');
    } catch {
      navigate('/books');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (role: 'ADMIN' | 'USER') => {
    setError('');
    setLoading(true);
    try {
      await devLogin(role);
      navigate('/books');
    } catch (err) {
      setError('Dev login failed — is the backend running with the dev profile?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: GRADIENT,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 48,
          width: 400,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎧</div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#1a202c', fontWeight: 700 }}>
            narrFlow
          </h1>
          <p style={{ margin: '8px 0 0', color: '#718096', fontSize: 14 }}>
            Multi-Persona Audiobook Experience
          </p>
        </div>

        {IS_DEV && (
          <div
            style={{
              marginBottom: 28,
              padding: 16,
              background: '#fffbeb',
              border: '1px solid #f6e05e',
              borderRadius: 10,
            }}
          >
            <p
              style={{
                margin: '0 0 12px',
                fontSize: 12,
                fontWeight: 700,
                color: '#975a16',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              ⚡ Dev Mode — Quick Login
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleDevLogin('ADMIN')}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  background: '#1a202c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Sign in as Admin
              </button>
              <button
                onClick={() => handleDevLogin('USER')}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  background: '#f7fafc',
                  color: '#2d3748',
                  border: '1px solid #e2e8f0',
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Sign in as User
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#4a5568',
                marginBottom: 6,
              }}
            >
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="tester01"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#4a5568',
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#c53030', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#a0aec0' : GRADIENT,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#a0aec0' }}>
          {IS_DEV ? 'Development mode' : 'Secure sign-in'}
        </p>
      </div>
    </div>
  );
}
