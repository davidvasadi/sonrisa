import { useEffect, useState } from 'react';

// Two views only, so a hash is enough: #/ is the user view, #/admin the admin view.
// The template's TanStack Router was left out on purpose (D-033).
export type View = 'user' | 'admin';

const fromHash = (): View => (window.location.hash === '#/admin' ? 'admin' : 'user');

export function useView(): View {
  const [view, setView] = useState<View>(fromHash);
  useEffect(() => {
    const onChange = () => setView(fromHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return view;
}
