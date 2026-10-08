'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

import { Delegate } from '@/lib/types';
import * as XLSX from 'xlsx';

interface Stats {
    total: number;
    checkedIn: number;
    remaining: number;
    percentage: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [delegates, setDelegates] = useState<Delegate[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'checked' | 'remaining'>('all');
    const [selectedEntity, setSelectedEntity] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    const entities = useMemo(() => {
        const unique = Array.from(new Set(delegates.map((d) => d.entity).filter(Boolean)));
        return unique.sort((a, b) => a.localeCompare(b));
    }, [delegates]);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, delegatesRes] = await Promise.all([
                fetch('/api/stats'),
                fetch('/api/delegates'),
            ]);
            const statsData = await statsRes.json();
            const delegatesData = await delegatesRes.json();

            if (statsData.success) setStats(statsData.data);
            if (delegatesData.success) setDelegates(delegatesData.data);
        } catch {
            console.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleExport = () => {
        const checkedDelegates = delegates.filter(d => d.checkedIn);

        if (checkedDelegates.length === 0) {
            alert('No delegates have checked in yet.');
            return;
        }

        const dataToExport = checkedDelegates.map(d => {
            const prefName = d.preferredName || d.firstName || d.name.split(' ')[0] || '';
            const fullName = d.name || `${prefName} ${d.lastName || ''}`.trim() || d.lastName || '';
            
            return {
                'Preferred Name': prefName,
                'Full Name': fullName,
                'Entity': d.entity,
                'Role': d.role || '-',
                'Email': d.email,
                'Contact': d.contactNumber || '-',
                'Status': d.checkedIn ? 'Checked In' : 'Pending',
                'Checked In At': d.checkedInAt ? new Date(d.checkedInAt).toLocaleString() : '-'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Checked-In Delegates");
        
        // Auto-size columns (rough approximation)
        const maxWidths = Object.keys(dataToExport[0] || {}).map(key => ({ wch: key.length + 5 }));
        worksheet['!cols'] = maxWidths;

        XLSX.writeFile(workbook, `Checked_In_Delegates_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Auto-refresh every 10s
        return () => clearInterval(interval);
    }, [fetchData]);

    const filteredDelegates = delegates.filter((d) => {
        const matchesSearch =
            search === '' ||
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            (d.preferredName && d.preferredName.toLowerCase().includes(search.toLowerCase())) ||
            (d.firstName && d.firstName.toLowerCase().includes(search.toLowerCase())) ||
            (d.lastName && d.lastName.toLowerCase().includes(search.toLowerCase())) ||
            d.entity.toLowerCase().includes(search.toLowerCase()) ||
            (d.role && d.role.toLowerCase().includes(search.toLowerCase())) ||
            d.delegateId.toLowerCase().includes(search.toLowerCase()) ||
            (d.email && d.email.toLowerCase().includes(search.toLowerCase())) ||
            (d.contactNumber && d.contactNumber.toLowerCase().includes(search.toLowerCase())) ||
            (d.foodPreference && d.foodPreference.toLowerCase().includes(search.toLowerCase()));

        const matchesFilter =
            filter === 'all' ||
            (filter === 'checked' && d.checkedIn) ||
            (filter === 'remaining' && !d.checkedIn);

        const matchesEntity =
            selectedEntity === 'all' || d.entity === selectedEntity;

        return matchesSearch && matchesFilter && matchesEntity;
    });

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <nav className="top-nav">
                <div className="nav-left">
                    <Link href="/" className="nav-back">← Home</Link>
                    <h1 className="nav-title">Dashboard</h1>
                </div>
                <div className="nav-actions">
                    <button 
                        className="btn btn-small btn-secondary btn-export" 
                        onClick={handleExport}
                        title="Export Checked-in Delegates to Excel"
                    >
                        📊 Export Checked-in
                    </button>
                    <button 
                        className="btn btn-small btn-ghost" 
                        onClick={fetchData}
                        title="Refresh data"
                    >
                        🔄
                    </button>
                </div>
            </nav>

            <div className="dashboard-content">
                {/* Stats Cards */}
                {stats && (
                    <div className="stats-grid">
                        <div className="stat-card stat-total">
                            <div className="stat-number">{stats.total}</div>
                            <div className="stat-label">Total Delegates</div>
                        </div>
                        <div className="stat-card stat-checked">
                            <div className="stat-number">{stats.checkedIn}</div>
                            <div className="stat-label">Checked In</div>
                        </div>
                        <div className="stat-card stat-remaining">
                            <div className="stat-number">{stats.remaining}</div>
                            <div className="stat-label">Remaining</div>
                        </div>
                    </div>
                )}

                {/* Progress Bar */}
                {stats && stats.total > 0 && (
                    <div className="progress-section">
                        <div className="progress-header">
                            <span>Check-in Progress</span>
                            <span className="progress-percent">{stats.percentage}%</span>
                        </div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${stats.percentage}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Search and Filter */}
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="🔍 Search by name, entity, or role..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                    <div className="filter-row">
                        <div className="filter-buttons">
                            <button
                                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter('all')}
                            >
                                All
                            </button>
                            <button
                                className={`filter-btn ${filter === 'checked' ? 'active' : ''}`}
                                onClick={() => setFilter('checked')}
                            >
                                ✅ Checked
                            </button>
                            <button
                                className={`filter-btn ${filter === 'remaining' ? 'active' : ''}`}
                                onClick={() => setFilter('remaining')}
                            >
                                ⏳ Remaining
                            </button>
                        </div>
                        <div className="entity-filter-wrapper">
                            <select
                                className="entity-select"
                                value={selectedEntity}
                                onChange={(e) => setSelectedEntity(e.target.value)}
                                aria-label="Filter by Entity"
                            >
                                <option value="all">🏢 All Entities ({delegates.length})</option>
                                {entities.map((ent) => {
                                    const count = delegates.filter((d) => d.entity === ent).length;
                                    return (
                                        <option key={ent} value={ent}>
                                            {ent} ({count})
                                        </option>
                                    );
                                })}
                            </select>
                            {selectedEntity !== 'all' && (
                                <button
                                    className="filter-reset-btn"
                                    onClick={() => setSelectedEntity('all')}
                                    title="Reset entity filter"
                                >
                                    ✕ Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Delegates Table */}
                <div className="table-wrapper">
                    <table className="data-table dashboard-table">
                        <thead>
                            <tr>
                                <th>Preferred Name</th>
                                <th>Full Name</th>
                                <th>Entity</th>
                                <th>Role</th>
                                <th>Email</th>
                                <th>Contact</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDelegates.map((d) => {
                                const prefName = d.preferredName || d.firstName || d.name.split(' ')[0] || '';
                                const fullName = d.name || `${prefName} ${d.lastName || ''}`.trim() || d.lastName || '';
                                return (
                                    <tr key={d.delegateId} className={d.checkedIn ? 'row-checked' : ''}>
                                        <td className="cell-name">{prefName}</td>
                                        <td className="cell-name">{fullName}</td>
                                        <td>{d.entity}</td>
                                        <td className="cell-role">{d.role || '-'}</td>
                                        <td>{d.email || '-'}</td>
                                        <td>{d.contactNumber || '-'}</td>
                                        <td>
                                            <span className={`status-badge ${d.checkedIn ? 'badge-checked' : 'badge-pending'}`}>
                                                {d.checkedIn ? '✅ In' : '⏳'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredDelegates.length === 0 && (
                        <div className="empty-state">
                            <p>No delegates found</p>
                        </div>
                    )}
                    <div className="table-footer">
                        Showing {filteredDelegates.length} of {delegates.length} delegates
                    </div>
                </div>
            </div>
        </div>
    );
}
