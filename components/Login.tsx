import React, { useState } from 'react';

interface Props {
  onSuccess: () => void;
}

const EXPECTED_LOGIN = 'Nozzo';
// SHA-256 hash of the password. Plaintext never appears in source.
const EXPECTED_PASSWORD_HASH =
  '92d51e717f5b6ca80e12350e3c6cc43910332e1a5a84a6da48737d84502081bf';

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const Login: React.FC<Props> = ({ onSuccess }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const hash = await sha256Hex(password);
      if (login === EXPECTED_LOGIN && hash === EXPECTED_PASSWORD_HASH) {
        try { sessionStorage.setItem('auth', '1'); } catch {}
        onSuccess();
      } else {
        setError('Nieprawidłowy login lub hasło.');
      }
    } catch {
      setError('Błąd weryfikacji.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
      <form
        onSubmit={handleSubmit}
        className="w-[360px] bg-white/90 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-3xl p-8 flex flex-col gap-4"
      >
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Logowanie</h1>
          <p className="text-[11px] text-gray-500">Dostęp do konfiguratora ramek</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Login</label>
          <input
            type="text"
            autoFocus
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm"
            disabled={busy}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Hasło</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm"
            disabled={busy}
          />
        </div>

        {error && (
          <div className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !login || !password}
          className="mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-wider py-3 rounded-xl transition-colors active:scale-95"
        >
          {busy ? 'Weryfikacja…' : 'Zaloguj'}
        </button>
      </form>
    </div>
  );
};
