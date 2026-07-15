import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Tafadhali jaza barua pepe na nywila.');
      return;
    }
    setLoading(true);
    const res = await login(email.trim(), password);
    if (!res.success) {
      setError(
        res.error === 'Invalid credentials'
          ? 'Barua pepe au nywila si sahihi. Jaribu tena.'
          : res.error || 'Imeshindwa kuingia. Jaribu tena.',
      );
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-glow login-glow-1" />
      <div className="login-glow login-glow-2" />

      <div className="login-card">

        {/* ══════════════════════════
            LEFT — brand & philosophy
        ══════════════════════════ */}
        <div className="login-left">

          {/* Wordmark — just "Nasaha", no "Admin" */}
          <div className="login-logo">
            <div className="login-logo-mark">N</div>
            <span className="login-logo-text">Nasaha</span>
          </div>

          {/* Central hero — the tagline from the user */}
          <div className="login-hero">
            <p className="login-tagline-label">Falsafa ya Mfumo</p>
            <h1 className="login-hero-title">
              Duniani Shule<br />
              Tunazifunza<br />
              Kila Siku
            </h1>
            <p className="login-hero-sub">
              Jukwaa la kusimamia na kushiriki maarifa,
              methali, na makala ya lugha yetu ya Kiswahili.
            </p>
          </div>

          {/* Decorative quote */}
          <div className="login-quote">
            <blockquote>"Elimu ni bora kuliko utajiri."</blockquote>
            <cite>— Methali ya Kiswahili</cite>
          </div>

          {/* Feature dots */}
          <ul className="login-features">
            <li>Simamia Dibaji za kila siku</li>
            <li>Chapisha Makala na Methali</li>
            <li>Hifadhi maarifa kwa vizazi</li>
          </ul>
        </div>

        {/* ══════════════════════════
            RIGHT — form
        ══════════════════════════ */}
        <div className="login-right">

          {/* Header — no role labels */}
          <div className="login-form-header">
            <h2 className="login-form-title">Karibu Tena</h2>
            <p className="login-form-sub">Weka taarifa zako ili uendelee</p>
          </div>

          {/* Error */}
          {error && (
            <div className="login-error">
              <span className="login-error-dot" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="login-form">

            {/* Email */}
            <div className="form-group">
              <label>Barua Pepe</label>
              <input
                type="email"
                className="form-input"
                placeholder="jina@nasaha.app"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <div className="login-label-row">
                <label>Nywila</label>
                <button type="button" className="login-forgot">
                  Umesahau nywila?
                </button>
              </div>
              <div className="login-pwd-wrap">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="form-input login-pwd-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? 'Ficha nywila' : 'Onyesha nywila'}
                >
                  {showPwd ? 'Ficha' : 'Onyesha'}
                </button>
              </div>
            </div>

            {/* Submit — no role label */}
            <button
              type="submit"
              className="btn-primary login-submit"
              disabled={loading}
            >
              {loading
                ? <><span className="login-spinner" /> Inaingia…</>
                : 'Ingia'}
            </button>
          </form>

          {/* Divider */}
          <div className="login-divider">
            <span />
            <p>mfumo salama wa Nasaha</p>
            <span />
          </div>

          {/* Footer */}
          <p className="login-footer-note">
            Mfumo huu ni wa watu walioidhinishwa pekee.
            Wasiliana na msimamizi wa mfumo kwa msaada.
          </p>
        </div>

      </div>
    </div>
  );
}
