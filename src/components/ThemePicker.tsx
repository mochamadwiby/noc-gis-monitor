'use client';

import { useCallback, useEffect, useState } from 'react';

export const THEMES = [
    { id: 'dark', name: 'Dark', icon: '🌑', preview: '#0a0e17' },
    { id: 'midnight', name: 'Midnight', icon: '🌌', preview: '#0b1023' },
    { id: 'cyberpunk', name: 'Cyber', icon: '⚡', preview: '#0d0011' },
    { id: 'matrix', name: 'Matrix', icon: '🟢', preview: '#000a00' },
    { id: 'light', name: 'Light', icon: '☀️', preview: '#f1f5f9' },
] as const;

const STORAGE_KEY = 'noc-theme';

export default function ThemePicker() {
    const [current, setCurrent] = useState('dark');
    const [open, setOpen] = useState(false);

    // Load saved theme on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
        setCurrent(saved);
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

    const selectTheme = useCallback((id: string) => {
        setCurrent(id);
        document.documentElement.setAttribute('data-theme', id);
        localStorage.setItem(STORAGE_KEY, id);
        setOpen(false);
    }, []);

    const currentTheme = THEMES.find(t => t.id === current) || THEMES[0];

    return (
        <div className="theme-picker">
            <button
                className="theme-toggle"
                onClick={() => setOpen(prev => !prev)}
                title="Ganti tema"
            >
                <span className="theme-toggle-icon">{currentTheme.icon}</span>
            </button>

            {open && (
                <div className="theme-dropdown">
                    {THEMES.map((theme) => (
                        <button
                            key={theme.id}
                            className={`theme-option ${current === theme.id ? 'theme-option-active' : ''}`}
                            onClick={() => selectTheme(theme.id)}
                        >
                            <span
                                className="theme-swatch"
                                style={{ background: theme.preview }}
                            />
                            <span className="theme-option-name">{theme.name}</span>
                            {current === theme.id && <span className="theme-check">✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
