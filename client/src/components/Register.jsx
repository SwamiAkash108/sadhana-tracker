import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
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
      await register(name, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen relative flex items-center justify-center p-margin-mobile md:p-margin-desktop overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url('data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
              <rect width="100" height="100" fill="none"/>
              <line x1="0" y1="0" x2="100" y2="100" stroke="#000" stroke-width="2" opacity="0.3"/>
              <line x1="100" y1="0" x2="0" y2="100" stroke="#000" stroke-width="2" opacity="0.3"/>
              <circle cx="50" cy="50" r="8" fill="none" stroke="#000" stroke-width="1.5" opacity="0.2"/>
              <circle cx="50" cy="50" r="4" fill="#000" opacity="0.1"/>
              <rect x="0" y="0" width="100" height="100" fill="none" stroke="#000" stroke-width="1" opacity="0.15"/>
            </svg>`
          )}')`,
          backgroundSize: '100px 100px',
        }}
      />

      <main className="relative z-10 w-full max-w-[540px]">
        {/* Offset Shadow */}
        <div className="absolute inset-0 bg-primary translate-x-3 translate-y-3 rounded-none" />
        <div className="relative bg-surface-container-lowest border-border-width-thick border-primary p-8 md:p-12 flex flex-col gap-8 md:gap-10 rounded-none">
          <div className="flex flex-col items-center text-center gap-2">
            <h1 className="font-headline-xl text-headline-xl text-primary tracking-tighter uppercase">SADHANA</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Start your journey</p>
          </div>

          {error && (
            <div className="bg-error-container text-on-error-container font-label-sm text-label-sm p-3 border-l-4 border-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-label-sm text-label-sm text-primary uppercase tracking-widest" htmlFor="name">
                Name
              </label>
              <input
                id="name" name="name" type="text" required
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-surface-bright border-border-width-thin border-primary p-4 font-label-sm text-label-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-0 focus:border-secondary transition-colors rounded-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-label-sm text-label-sm text-primary uppercase tracking-widest" htmlFor="email">
                Email
              </label>
              <input
                id="email" name="email" type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-surface-bright border-border-width-thin border-primary p-4 font-label-sm text-label-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-0 focus:border-secondary transition-colors rounded-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-label-sm text-label-sm text-primary uppercase tracking-widest" htmlFor="password">
                Password
              </label>
              <input
                id="password" name="password" type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-bright border-border-width-thin border-primary p-4 font-label-sm text-label-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-0 focus:border-secondary transition-colors rounded-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest py-5 border-border-width-thin border-primary hover:bg-secondary hover:text-on-secondary hover:border-secondary transition-colors duration-200 rounded-none relative group overflow-hidden disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? 'Creating…' : 'Begin your Sadhana'}
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </span>
              <div className="absolute inset-0 halftone-bg opacity-0 group-hover:opacity-30 transition-opacity duration-200 z-0" />
            </button>
          </form>

          <div className="text-center pt-4 border-t border-primary-fixed">
            <Link to="/login"
              className="font-body-md text-body-md text-on-surface-variant hover:text-secondary transition-colors inline-block relative after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-[1px] after:bottom-0 after:left-0 after:bg-secondary after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left"
            >
              Already tracking? Log in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}