'use client';

import { useMemo } from 'react';

interface OnuData {
    olt_name: string;
    status: string;
}

interface OltSelectorProps {
    oltList: string[];
    activeOlt: string | null;
    onSelect: (olt: string | null) => void;
    oltStats: OnuData[];
}

export default function OltSelector({ oltList, activeOlt, onSelect, oltStats }: OltSelectorProps) {
    // Pre-compute per-OLT counts
    const oltCounts = useMemo(() => {
        const counts = new Map<string, { total: number; problem: number }>();
        for (const o of oltStats) {
            const c = counts.get(o.olt_name) || { total: 0, problem: 0 };
            c.total++;
            if (o.status !== 'Online') c.problem++;
            counts.set(o.olt_name, c);
        }
        return counts;
    }, [oltStats]);

    return (
        <div className="olt-selector">
            <button
                className={`olt-pill ${activeOlt === null ? 'olt-pill-active' : ''}`}
                onClick={() => onSelect(null)}
            >
                <span className="olt-pill-icon">🌐</span>
                <span className="olt-pill-name">Semua OLT</span>
                <span className="olt-pill-count">{oltStats.length}</span>
            </button>

            {oltList.map((olt) => {
                const count = oltCounts.get(olt) || { total: 0, problem: 0 };
                const isActive = activeOlt === olt;
                const hasProblem = count.problem > 0;

                return (
                    <button
                        key={olt}
                        className={`olt-pill ${isActive ? 'olt-pill-active' : ''} ${hasProblem ? 'olt-pill-warning' : ''}`}
                        onClick={() => onSelect(isActive ? null : olt)}
                    >
                        <span className={`olt-pill-dot ${hasProblem ? 'dot-warning' : 'dot-ok'}`} />
                        <span className="olt-pill-name">{olt}</span>
                        <span className="olt-pill-count">{count.total}</span>
                        {hasProblem && (
                            <span className="olt-pill-problem">⚠ {count.problem}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
