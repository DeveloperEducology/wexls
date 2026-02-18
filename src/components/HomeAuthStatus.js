'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './HomeAuthStatus.module.css';

function getDisplayName(user) {
  if (!user) return '';
  const meta = user.user_metadata || {};
  const fullName = String(meta.full_name || meta.name || '').trim();
  if (fullName) return fullName;
  const email = String(user.email || '').trim();
  if (!email) return 'Learner';
  return email.split('@')[0];
}

export default function HomeAuthStatus() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(data?.user || null);
      setLoading(false);
    };

    hydrate();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  if (loading) return <div className={styles.loading}>...</div>;

  if (!user) {
    return (
      <>
        <Link href="/login" className={styles.signInBtn}>Sign in</Link>
        <Link href="/register" className={styles.joinBtn}>Join now</Link>
      </>
    );
  }

  return (
    <>
      <div className={styles.userBadge} title={user.email || ''}>
        Hi, {getDisplayName(user)}
      </div>
      <button type="button" className={styles.signOutBtn} onClick={handleSignOut}>
        Sign out
      </button>
    </>
  );
}
