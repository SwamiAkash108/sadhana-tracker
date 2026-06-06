import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-display font-medium text-deepink mb-1.5">Sadhana</h1>
          <p className="text-sm text-bark">Begin your journey together</p>
        </div>

        <div className="card-paper p-6">
          <h2 className="text-lg font-display text-deepink mb-5">Create account</h2>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-md text-xs text-brick border" style={{ backgroundColor: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-bark mb-1.5 ml-1">Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-bark mb-1.5 ml-1">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-bark mb-1.5 ml-1">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-sm py-2.5">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-sand/60 text-center">
            <span className="text-xs text-walnut">Already have an account? </span>
            <Link to="/login" className="text-xs font-medium text-ink hover:text-deepink transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}