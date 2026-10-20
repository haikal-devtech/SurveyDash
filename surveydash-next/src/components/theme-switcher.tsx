'use client';
import { useRef, useState, useSyncExternalStore } from 'react';
import { Sun, Moon, Monitor, X } from 'lucide-react';
import { resolveTheme, themePreference, THEME_STORAGE_KEY, type ThemePreference } from '@/lib/theme';
const eventName = 'surveydash:theme-change';
function apply(preference: ThemePreference) {
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolveTheme(
    preference,
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
}
function subscribe(callback: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const update = () => {
    apply(themePreference(document.documentElement.dataset.themePreference));
    callback();
  };
  const storage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      apply(themePreference(event.newValue));
      callback();
    }
  };
  media.addEventListener('change', update);
  window.addEventListener(eventName, update);
  window.addEventListener('storage', storage);
  return () => {
    media.removeEventListener('change', update);
    window.removeEventListener(eventName, update);
    window.removeEventListener('storage', storage);
  };
}
const options = [
  { value: 'light', label: 'Terang', Icon: Sun },
  { value: 'dark', label: 'Gelap', Icon: Moon },
  { value: 'system', label: 'Sistem', Icon: Monitor },
] as const;
export function ThemeSwitcher() {
  const trigger = useRef<HTMLButtonElement>(null);
  const preference = useSyncExternalStore(
    subscribe,
    () => themePreference(document.documentElement.dataset.themePreference),
    () => 'system' as const,
  );
  const [open, setOpen] = useState(false);
  function choose(value: ThemePreference) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {}
    apply(value);
    window.dispatchEvent(new Event(eventName));
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div
      className="theme-switcher"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setOpen(false);
          event.currentTarget.querySelector('button')?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        className="theme-trigger"
        type="button"
        aria-label="Ubah tampilan"
        title="Ubah tampilan"
        aria-expanded={open}
        aria-controls="theme-options"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <X size={19} />
        ) : (
          <>
            <Sun className="theme-sun" size={19} />
            <Moon className="theme-moon" size={19} />
          </>
        )}
      </button>
      {open && (
        <div id="theme-options" className="theme-options" role="group" aria-label="Tampilan">
          <strong>Tampilan</strong>
          {options.map(({ value, label, Icon }) => (
            <button
              type="button"
              key={value}
              aria-pressed={preference === value}
              onClick={() => choose(value)}
            >
              <Icon size={17} />
              {label}
              {preference === value && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
