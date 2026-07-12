import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { authenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
    '/';

  useEffect(() => {
    if (!shake) return;
    const timer = window.setTimeout(() => setShake(false), 450);
    return () => window.clearTimeout(timer);
  }, [shake]);

  if (authenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const ok = login(password);
    if (ok) {
      navigate(from, { replace: true });
      return;
    }
    setError('Incorrect password');
    setShake(true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.card}>
        <h1 className={styles.title}>Diana&apos;s Vacation Journal</h1>
        <p className={styles.subtitle}>Private Travel Memories</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={`field ${shake ? styles.shake : ''}`}>
            <label htmlFor="journal-password">Passphrase</label>
            <div className={styles.passwordWrap}>
              <input
                id="journal-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError('');
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'password-error' : undefined}
              />
              <button
                type="button"
                className={styles.toggle}
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div
            id="password-error"
            className={styles.error}
            role={error ? 'alert' : undefined}
          >
            {error}
          </div>
          <button type="submit" className="btn btnPrimary" style={{ width: '100%' }}>
            Enter journal
          </button>
        </form>
        <p className={styles.hint}>A private keepsake for cherished travels.</p>
      </div>
    </div>
  );
}
