'use client';

import { useEffect, useState } from 'react';
import ThemePicker from './ThemePicker';

interface Stats {
    total: number;
    online: number;
    los: number;
    offline: number;
    powerFail: number;
    unconfigured: number;
}

interface StatsBarProps {
    stats: Stats;
    lastRefresh: string;
    isMock: boolean;
    onFilterClick: (status: string | null) => void;
    activeFilter: string | null;
    activeOlt: string | null;
}

function AnimatedNumber({ value, color }: { value: number; color: string }) {
    const [displayed, setDisplayed] = useState(value);

    useEffect(() => {
        if (displayed === value) return;
        const diff = value - displayed;
        const step = Math.max(1, Math.abs(Math.ceil(diff / 10)));
        const interval = setInterval(() => {
            setDisplayed((prev) => {
                if (prev === value) {
                    clearInterval(interval);
                    return value;
                }
                if (diff > 0) return Math.min(prev + step, value);
                return Math.max(prev - step, value);
            });
        }, 30);
        return () => clearInterval(interval);
    }, [value, displayed]);

    return (
        <span className="stat-number" style={{ color }}>
            {displayed.toLocaleString()}
        </span>
    );
}

export default function StatsBar({ stats, lastRefresh, isMock, onFilterClick, activeFilter, activeOlt }: StatsBarProps) {
    const [clock, setClock] = useState('');

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setClock(
                now.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                })
            );
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    const refreshTime = lastRefresh
        ? new Date(lastRefresh).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        })
        : '--:--:--';

    const statItems = [
        { label: 'Total', value: stats.total, color: 'var(--text-heading)', filterKey: null },
        { label: 'Online', value: stats.online, color: '#00e676', filterKey: 'Online' },
        { label: 'LOS', value: stats.los, color: '#ff1744', filterKey: 'LOS' },
        { label: 'Power Fail', value: stats.powerFail, color: '#ffea00', filterKey: 'Power fail' },
        { label: 'Offline', value: stats.offline, color: '#78909c', filterKey: 'Offline' },
        { label: 'Unconfigured', value: stats.unconfigured, color: '#448aff', filterKey: 'Unconfigured' },
    ];

    return (
        <header className="stats-bar">
            {/* Left: Brand */}
            <div className="stats-brand">
                <div className="brand-icon">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                </div>
                <div className="brand-text">
                    <span className="brand-title">NOC Network Monitor</span>
                    <span className="brand-subtitle">{activeOlt || 'GIS Dashboard'}</span>
                </div>
            </div>

            {/* Center: Stats */}
            <div className="stats-grid">
                {statItems.map((item) => (
                    <button
                        key={item.label}
                        className={`stat-card ${activeFilter === item.filterKey ? 'stat-card-active' : ''} ${item.filterKey === null ? 'stat-card-total' : ''}`}
                        onClick={() => onFilterClick(item.filterKey)}
                        style={{
                            '--stat-color': item.color,
                            borderColor: activeFilter === item.filterKey ? item.color : 'transparent',
                        } as React.CSSProperties}
                    >
                        <div className="stat-indicator" style={{ background: item.color }} />
                        <div className="stat-content">
                            <AnimatedNumber value={item.value} color={item.color} />
                            <span className="stat-label">{item.label}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Right: Clock + Theme + Status */}
            <div className="stats-meta">
                <ThemePicker />
                <div className="meta-clock">{clock}</div>
                <div className="meta-refresh">
                    <span className="refresh-dot" />
                    Last update: {refreshTime}
                </div>
                {isMock && (
                    <div className="meta-mock">DEMO MODE</div>
                )}
            </div>
        </header>
    );
}
