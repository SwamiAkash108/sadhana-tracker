import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InstallPrompt from './InstallPrompt';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center font-body-md relative overflow-hidden">
      <div className="absolute inset-0 halftone-bg opacity-10 pointer-events-none z-0" />
      <main className="w-full max-w-md px-margin-mobile md:px-0 z-10 relative">
        <div className="absolute -top-unit -left-unit w-full h-full bg-primary pointer-events-none z-0 hidden md:block" />
        <div className="bg-surface border-4 border-primary p-margin-desktop shadow-none relative z-10">
          <div className="text-center mb-12">
            <img
              src="/icons/narasimha.png"
              alt="Narasimha"
              className="h-56 w-auto object-contain mx-auto mb-4"
            />
            <h1 className="font-headline-md text-headline-md font-bold tracking-tighter text-primary">SADHANA</h1>
          </div>
          <div className="mb-8">
            <h2 className="font-headline-sm text-headline-sm text-primary mb-2">Welcome Back</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Enter your credentials to continue your journey.</p>
          </div>
          {error && (
            <div className="bg-error-container text-on-error-container font-label-sm text-label-sm p-3 mb-6 border-l-4 border-error">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-label-sm text-label-sm text-primary mb-2 uppercase" htmlFor="email">
                Email Address
              </label>
              <input
                id="email" name="email" type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="practitioner@example.com"
                className="w-full bg-surface border-x-0 border-t-0 border-b border-primary px-0 py-3 font-label-sm text-label-sm focus:ring-0 focus:border-secondary transition-colors placeholder:text-outline-variant"
              />
            </div>
            <div>
              <label className="block font-label-sm text-label-sm text-primary mb-2 uppercase" htmlFor="password">
                Password
              </label>
              <input
                id="password" name="password" type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface border-x-0 border-t-0 border-b border-primary px-0 py-3 font-label-sm text-label-sm focus:ring-0 focus:border-secondary transition-colors placeholder:text-outline-variant"
              />
            </div>
            <div className="pt-4">
              <button
                type="submit" disabled={loading}
                className="w-full bg-primary text-on-primary py-4 px-6 flex items-center justify-between group hover:bg-secondary transition-colors duration-300 disabled:opacity-50"
              >
                <span className="font-label-sm text-label-sm uppercase tracking-wider">
                  {loading ? 'Signing in…' : 'Log In'}
                </span>
                <span className="material-symbols-outlined transform group-hover:translate-x-2 transition-transform duration-300">
                  arrow_forward
                </span>
              </button>
            </div>
          </form>
          <div className="mt-8 pt-8 border-t border-outline-variant text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              New to the path?{' '}
              <Link to="/register" className="font-bold text-primary hover:text-secondary transition-colors underline decoration-2 underline-offset-4 ml-1">
                Create account
              </Link>
            </p>
          </div>
          <InstallPrompt variant="banner" />
        </div>
      </main>
    </div>
  );
}
