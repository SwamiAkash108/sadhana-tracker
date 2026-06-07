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
          <h1 className="text-[42px] font-display font-black text-ink leading-none mb-1">SADHANA</h1>
          <p className="text-xs text-mute font-sans tracking-wider uppercase">Start Your Journey</p>
        </div>
        <div className="card-wood p-6">
          {error && (
            <div className="mb-5 px-4 py-3 rounded border-2 border-red-500 bg-red-50 text-xs text-red-700">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-mute mb-1.5">Name</label>
              <input type="text" className="input-wood" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-mute mb-1.5">Email Address</label>
              <input type="email" className="input-wood" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-mute mb-1.5">Password</label>
              <input type="password" className="input-wood" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <button type="submit" disabled={loading} className="btn-wood w-full">
              {loading ? 'Creating…' : 'Begin Your Sadhana →'}
            </button>
          </form>
          <div className="mt-6 pt-4 border-t-2 border-ink text-center">
            <span className="text-xs text-mute">Already tracking? </span>
            <Link to="/login" className="text-xs font-bold text-ink uppercase tracking-wider hover:text-rust transition-colors">Log In →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}