import { useAuth } from '../context/AuthContext';

export function isAuthError(message) {
  return /token|authentication|session|expired/i.test(message || '');
}

export default function SessionErrorPanel({ error, onRetry }) {
  const { logout } = useAuth();
  const auth = isAuthError(error);

  return (
    <div className="bg-surface border-4 border-primary woodcut-shadow p-8 text-center">
      <p className="font-body-md text-body-md text-secondary mb-4">
        {auth ? 'Your session expired. Sign in again to continue.' : error}
      </p>
      {auth ? (
        <button type="button" onClick={logout} className="btn-woodcut px-6 py-3">
          Sign in again
        </button>
      ) : (
        <button type="button" onClick={onRetry} className="btn-woodcut px-6 py-3">
          Retry
        </button>
      )}
    </div>
  );
}
