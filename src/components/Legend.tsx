'use client';

export default function Legend() {
    const items = [
        { status: 'Online', color: '#00e676', desc: 'ONU online & aktif' },
        { status: 'LOS', color: '#ff1744', desc: 'Loss of Signal' },
        { status: 'Power Fail', color: '#ffea00', desc: 'Mati listrik' },
        { status: 'Offline', color: '#78909c', desc: 'ONU offline' },
        { status: 'Unconfigured', color: '#448aff', desc: 'Belum dikonfigurasi' },
    ];

    return (
        <div className="map-legend">
            <div className="legend-title">STATUS LEGEND</div>
            {items.map((item) => (
                <div key={item.status} className="legend-item">
                    <span
                        className="legend-dot"
                        style={{
                            background: item.color,
                            boxShadow: `0 0 8px ${item.color}`,
                        }}
                    />
                    <div className="legend-text">
                        <span className="legend-status" style={{ color: item.color }}>
                            {item.status}
                        </span>
                        <span className="legend-desc">{item.desc}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
