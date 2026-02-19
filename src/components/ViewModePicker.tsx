'use client';

import { useEffect, useState } from 'react';

interface ViewModePickerProps {
    currentMode: 'clustered' | 'unclustered';
    onChange: (mode: 'clustered' | 'unclustered') => void;
}

export default function ViewModePicker({ currentMode, onChange }: ViewModePickerProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="view-mode-picker" style={{
            position: 'absolute',
            bottom: '24px',
            right: '80px', // Left of ThemePicker (which is right: 24px)
            zIndex: 1000,
            background: 'var(--card-bg)',
            backdropFilter: 'blur(12px)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            gap: '4px',
        }}>
            <button
                onClick={() => onChange('clustered')}
                title="Group close markers together"
                style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: currentMode === 'clustered' ? 'var(--accent-color)' : 'transparent',
                    color: currentMode === 'clustered' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                }}
            >
                <span style={{ fontSize: '16px' }}>🔴</span>
                Grup
            </button>
            <button
                onClick={() => onChange('unclustered')}
                title="Show all individual markers"
                style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: currentMode === 'unclustered' ? 'var(--accent-color)' : 'transparent',
                    color: currentMode === 'unclustered' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                }}
            >
                <span style={{ fontSize: '16px' }}>📍</span>
                Full
            </button>
        </div>
    );
}
