import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  KeyRound,
  LogIn,
  MailCheck,
  Moon,
  RefreshCw,
  Save,
  ShieldCheck,
  Sun,
  UserPlus,
} from 'lucide-react';
import { useFirebase } from '../firebase/auth/AuthContext.tsx';
import { updateUserSettings } from '../firebase/firestore/repository.ts';
import { useOddsHunter } from '../hooks/useOddsHunter.tsx';
import { useTheme } from '../hooks/useTheme.tsx';
import type { BookmakerId } from '../types/sportybet.ts';

const BOOKMAKER_PRESENTATION: Record<
  BookmakerId,
  { tagline: string; highlights: string[]; accentClass: string }
> = {
  SPORTYBET_TZ: {
    tagline: 'Upcoming football, live matches & multi-sport accumulators',
    highlights: ['Official Share Codes', 'Live & Upcoming Football', 'Other Sports Picks'],
    accentClass: 'text-emerald-600 dark:text-emerald-400',
  },
  BETPAWA_TZ: {
    tagline: 'Dedicated betPawa Tanzania fixtures, odds & booking numbers',
    highlights: ['Native Booking Numbers', 'Dedicated TZ Fixtures', 'Independent Feed History'],
    accentClass: 'text-sky-600 dark:text-sky-400',
  },
};

export function SettingsPage() {
  const {
    user,
    profile,
    isAdmin,
    openAuthModal,
    updateAccountProfile,
    sendPasswordReset,
    resendVerificationEmail,
    refreshAuthUser,
  } = useFirebase();
  const { theme, setTheme } = useTheme();
  const {
    bookmakers,
    activeBookmaker,
    activeBookmakerInfo,
    setActiveBookmaker,
    setActiveSection,
    betslip,
  } = useOddsHunter();

  const [displayName, setDisplayName] = useState('');
  const [defaultMinOdds, setDefaultMinOdds] = useState(1.01);
  const [defaultMaxOdds, setDefaultMaxOdds] = useState(1.25);
  const [defaultStakeTzs, setDefaultStakeTzs] = useState(10000);
  const [autoScanIntervalSec, setAutoScanIntervalSec] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [bookmakerNotice, setBookmakerNotice] = useState<string | null>(null);
  const [accountActionMsg, setAccountActionMsg] = useState<string | null>(null);
  const [accountErrMsg, setAccountErrMsg] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [brandIconError, setBrandIconError] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setDefaultMinOdds(profile.defaultMinOdds);
      setDefaultMaxOdds(profile.defaultMaxOdds);
      setDefaultStakeTzs(profile.defaultStakeTzs);
      setAutoScanIntervalSec(profile.autoScanIntervalSec);
    } else if (user) {
      setDisplayName(user.displayName || user.email?.split('@')[0] || '');
    }
  }, [profile, user]);

  const handleSelectBookmaker = (id: BookmakerId, name: string) => {
    if (id === activeBookmaker) return;
    setActiveBookmaker(id);
    setBookmakerNotice(`Preferred bookmaker switched to ${name}. Your Daily Picks now show this feed.`);
    setTimeout(() => setBookmakerNotice(null), 4500);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSavedNotice(null);
    setAccountErrMsg(null);
    try {
      const nextName = displayName.trim() || user.displayName || 'Analyst';
      if (nextName !== (user.displayName || '')) {
        await updateAccountProfile(nextName);
      }
      if (user.emailVerified) {
        await updateUserSettings(user.uid, {
          displayName: nextName,
          defaultMinOdds,
          defaultMaxOdds,
          defaultStakeTzs,
          autoScanIntervalSec,
        });
        setSavedNotice('Your profile and default settings have been saved.');
      } else {
        setSavedNotice('Display name updated. Verify your email to sync preferences across devices.');
      }
      setTimeout(() => setSavedNotice(null), 4000);
    } catch (err) {
      setAccountErrMsg(err instanceof Error ? err.message : 'Unable to save your changes right now.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setActionBusy(true);
    setAccountErrMsg(null);
    setAccountActionMsg(null);
    try {
      await sendPasswordReset(user.email);
      setAccountActionMsg(`Password reset email sent to ${user.email}.`);
    } catch (err) {
      setAccountErrMsg(
        err instanceof Error ? err.message : 'Unable to send password reset email right now.'
      );
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-black border border-slate-300/80 dark:border-white/15 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
          {!brandIconError ? (
            <img
              src="/assets/aistudio/1795084245256_fb70236e.jpg"
              alt="App Icon"
              referrerPolicy="no-referrer"
              onError={() => setBrandIconError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <ShieldCheck className="w-5 h-5 text-slate-200" />
          )}
        </div>
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Choose your preferred bookmaker, customize the display theme, and manage your account
            preferences.
          </p>
        </div>
      </div>

      {/* Preferred Bookmaker (Primary Exclusive Selector) */}
      <section className="rounded-2xl bg-white dark:bg-[#0E1629]/90 dark:backdrop-blur-xl border border-slate-200 dark:border-white/[0.09] p-5 sm:p-6 space-y-5 shadow-xs dark:shadow-[0_20px_50px_-28px_rgba(2,6,23,0.95)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Preferred Bookmaker
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Select the sportsbook for your Daily Picks, live matches, and betslip builder. Both
              bookmakers preserve their own saved picks independently.
            </p>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 shrink-0">
            <span className="text-slate-400 dark:text-slate-500">Active: </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {activeBookmakerInfo.name}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {bookmakers.map((bm) => {
            const isActive = activeBookmaker === bm.id;
            const meta = BOOKMAKER_PRESENTATION[bm.id as BookmakerId] || BOOKMAKER_PRESENTATION.SPORTYBET_TZ;
            return (
              <button
                key={bm.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleSelectBookmaker(bm.id as BookmakerId, bm.name)}
                className={`group relative rounded-xl p-4 sm:p-5 border text-left transition-all duration-200 flex flex-col justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isActive
                    ? 'bg-blue-50/90 border-blue-500 ring-1 ring-blue-500/25 dark:bg-blue-600/[0.14] dark:border-blue-400/60 dark:ring-blue-400/20 shadow-sm'
                    : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70 dark:bg-white/[0.03] dark:border-white/[0.08] dark:hover:border-white/20 dark:hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      {bm.name}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {meta.tagline}
                    </p>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white dark:bg-blue-500'
                        : 'border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.04]'
                    }`}
                  >
                    {isActive && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.07] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className={`font-medium ${meta.accentClass}`}>
                    {meta.highlights[0]} · {meta.highlights[1]}
                  </span>
                  <span
                    className={`font-semibold ${
                      isActive
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                    }`}
                  >
                    {isActive ? 'Selected' : 'Switch'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {bookmakerNotice && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{bookmakerNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('feed')}
              className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300 hover:underline whitespace-nowrap shrink-0"
            >
              <span>View Daily Picks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {betslip.length > 0
                ? `Your active betslip currently holds ${betslip.length} selection${betslip.length === 1 ? '' : 's'}.`
                : 'Your preference is saved automatically across sessions.'}
            </span>
          </div>
        </div>
      </section>

      {/* Appearance: Dark Mode & Light Mode */}
      <section className="rounded-2xl bg-white dark:bg-[#0F172A]/85 dark:backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-4 shadow-xs dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Appearance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose between Dark Mode and Light Mode. Saved automatically for future visits.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left transition-all duration-200 flex items-start justify-between gap-3 cursor-pointer ${
              theme === 'dark'
                ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500/25 dark:bg-blue-600/15 dark:border-blue-500/50'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-white/[0.03] dark:border-white/[0.08] dark:hover:border-white/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-900 text-blue-400 border border-slate-700 shrink-0">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Dark Mode
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Deep dark glass workspace crafted for comfortable evening viewing.
                </p>
              </div>
            </div>
            {theme === 'dark' && (
              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left transition-all duration-200 flex items-start justify-between gap-3 cursor-pointer ${
              theme === 'light'
                ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500/25 dark:bg-blue-600/15 dark:border-blue-500/50'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-white/[0.03] dark:border-white/[0.08] dark:hover:border-white/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white text-amber-500 border border-slate-200 shadow-xs shrink-0">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Light Mode
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Crisp daylight layout with high-clarity card surfaces.
                </p>
              </div>
            </div>
            {theme === 'light' && (
              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            )}
          </button>
        </div>
      </section>

      {/* Account Profile & Scanner Defaults */}
      {!user ? (
        <div className="rounded-2xl bg-white dark:bg-[#0F172A]/85 dark:backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-4 shadow-xs dark:shadow-none">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Account &amp; Sync
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Sign in or create an account to save your preferred bookmaker, bookmarks, and scanner
              defaults across all your devices.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white whitespace-nowrap transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('signup')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#0F172A]/85 dark:backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-5 shadow-xs dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/[0.06] pb-3.5">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Account Profile &amp; Scanner Defaults
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Signed in as {user.email}
                {isAdmin ? ' · Administrator' : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <MailCheck className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={async () => {
                      setActionBusy(true);
                      try {
                        const ok = await refreshAuthUser();
                        setAccountActionMsg(
                          ok ? 'Email verified!' : 'Not verified yet — check your inbox first.'
                        );
                      } finally {
                        setActionBusy(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3 h-3 ${actionBusy ? 'animate-spin' : ''}`} />
                    <span>Refresh Verification</span>
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={async () => {
                      setActionBusy(true);
                      try {
                        await resendVerificationEmail();
                        setAccountActionMsg(`Verification email sent to ${user.email}.`);
                      } catch (e) {
                        setAccountErrMsg(e instanceof Error ? e.message : 'Unable to resend link.');
                      } finally {
                        setActionBusy(false);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap"
                  >
                    Resend Link
                  </button>
                </div>
              )}

              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void handlePasswordReset()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 whitespace-nowrap"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Send Password Reset</span>
              </button>
            </div>
          </div>

          {accountActionMsg && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-3.5 py-2 text-xs text-emerald-700 dark:text-emerald-200">
              {accountActionMsg}
            </div>
          )}
          {accountErrMsg && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-3.5 py-2 text-xs text-rose-700 dark:text-rose-200">
              {accountErrMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5 text-xs sm:col-span-2">
              <span className="text-slate-600 dark:text-slate-400 block">
                Display Name
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-slate-600 dark:text-slate-400 block">
                Default Minimum Odds
              </span>
              <input
                type="number"
                step="0.01"
                min="1.01"
                value={defaultMinOdds}
                onChange={(e) => setDefaultMinOdds(Number(e.target.value) || 1.01)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-mono tabular-nums"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-slate-600 dark:text-slate-400 block">
                Default Maximum Odds
              </span>
              <input
                type="number"
                step="0.01"
                min="1.01"
                value={defaultMaxOdds}
                onChange={(e) => setDefaultMaxOdds(Number(e.target.value) || 1.25)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-mono tabular-nums"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-slate-600 dark:text-slate-400 block">
                Default Hypothetical Stake (TZS)
              </span>
              <input
                type="number"
                min="0"
                step="500"
                value={defaultStakeTzs}
                onChange={(e) => setDefaultStakeTzs(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-mono tabular-nums"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-slate-600 dark:text-slate-400 block">
                Auto-Rescan Interval
              </span>
              <select
                value={autoScanIntervalSec}
                onChange={(e) => setAutoScanIntervalSec(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100"
              >
                <option value={0}>Manual Only</option>
                <option value={30}>Every 30 seconds</option>
                <option value={60}>Every 60 seconds</option>
                <option value={180}>Every 3 minutes</option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/[0.06]">
            <span className="text-xs text-emerald-700 dark:text-emerald-400">
              {savedNotice || ''}
            </span>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white whitespace-nowrap transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
