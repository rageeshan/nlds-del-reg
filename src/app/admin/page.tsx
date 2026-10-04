'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import Link from 'next/link';

interface ParsedRow {
    [key: string]: string;
}

export default function AdminPage() {
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [delegateCount, setDelegateCount] = useState(0);
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [sendingEmails, setSendingEmails] = useState(false);
    const [emailResult, setEmailResult] = useState<{ sent: number; failed: number } | null>(null);
    const [downloading, setDownloading] = useState(false);

    const handleFile = useCallback((file: File) => {
        setError('');
        setSaved(false);
        setEmailResult(null);
        setFileName(file.name);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setError('CSV parsing errors: ' + results.errors.map((e) => e.message).join(', '));
                    return;
                }
                const data = results.data as ParsedRow[];
                if (data.length === 0) {
                    setError('CSV file is empty');
                    return;
                }
                setHeaders(Object.keys(data[0]));
                setParsedData(data);
            },
            error: (err) => {
                setError('Failed to parse CSV: ' + err.message);
            },
        });
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) {
                handleFile(file);
            } else {
                setError('Please upload a CSV file');
            }
        },
        [handleFile]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const handleSave = async () => {
        setUploading(true);
        setError('');
        try {
            const res = await fetch('/api/delegates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ delegates: parsedData }),
            });
            const result = await res.json();
            if (result.success) {
                setSaved(true);
                setDelegateCount(result.data.count);
            } else {
                setError(result.error || 'Failed to save');
            }
        } catch {
            setError('Network error');
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadQR = async () => {
        setDownloading(true);
        setError('');
        try {
            const res = await fetch('/api/qr/export');
            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.error || 'Failed to download QR codes');
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'qr-codes.zip';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err?.message || 'Failed to download QR codes');
        } finally {
            setDownloading(false);
        }
    };

    const handleSendEmails = async () => {
        if (!confirm('Send emails to all delegates? This cannot be undone.')) return;
        setSendingEmails(true);
        setEmailResult(null);
        try {
            const res = await fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventName: 'AIESEC National Conference' }),
            });
            const result = await res.json();
            if (result.success) {
                setEmailResult(result.data);
            } else {
                setError(result.error || 'Failed to send emails');
            }
        } catch {
            setError('Network error while sending emails');
        } finally {
            setSendingEmails(false);
        }
    };

    return (
        <div className="page-container admin-page">
            <nav className="top-nav">
                <Link href="/" className="nav-back">← Home</Link>
                <h1 className="nav-title">Admin Panel</h1>
                <div style={{ width: 60 }} />
            </nav>

            <div className="admin-content">
                {/* CSV Upload */}
                <section className="admin-section">
                    <h2 className="section-title">📁 Upload CSV</h2>
                    <div
                        className={`drop-zone ${dragOver ? 'drop-zone-active' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                    >
                        <div className="drop-zone-icon">📄</div>
                        <p className="drop-zone-text">Drag & drop your CSV file here</p>
                        <p className="drop-zone-sub">or</p>
                        <label className="file-input-label">
                            Browse Files
                            <input type="file" accept=".csv" onChange={handleFileInput} hidden />
                        </label>
                        {fileName && <p className="file-name">Selected: {fileName}</p>}
                    </div>
                </section>

                {error && (
                    <div className="alert alert-error">
                        <span>❌</span> {error}
                    </div>
                )}

                {/* Preview */}
                {parsedData.length > 0 && !saved && (
                    <section className="admin-section">
                        <div className="section-header">
                            <h2 className="section-title">👀 Preview ({parsedData.length} delegates)</h2>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={uploading}
                            >
                                {uploading ? '⏳ Saving...' : '✅ Save & Generate IDs'}
                            </button>
                        </div>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        {headers.map((h) => (
                                            <th key={h}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.slice(0, 20).map((row, i) => (
                                        <tr key={i}>
                                            <td>{i + 1}</td>
                                            {headers.map((h) => (
                                                <td key={h}>{row[h]}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {parsedData.length > 20 && (
                                <p className="table-note">Showing first 20 of {parsedData.length} rows</p>
                            )}
                        </div>
                    </section>
                )}

                {/* Actions after save */}
                {saved && (
                    <section className="admin-section">
                        <div className="alert alert-success">
                            <span>✅</span> Successfully saved {delegateCount} delegates!
                        </div>

                        <div className="action-buttons">
                            <button
                                className="btn btn-secondary"
                                onClick={handleDownloadQR}
                                disabled={downloading}
                            >
                                {downloading ? '⏳ Generating...' : '📥 Download All QR Codes (ZIP)'}
                            </button>

                            <button
                                className="btn btn-accent"
                                onClick={handleSendEmails}
                                disabled={sendingEmails}
                            >
                                {sendingEmails ? '⏳ Sending...' : '📧 Send Emails to All Delegates'}
                            </button>
                        </div>

                        {emailResult && (
                            <div className="alert alert-info">
                                <p>📧 Emails sent: <strong>{emailResult.sent}</strong></p>
                                {emailResult.failed > 0 && (
                                    <p>❌ Failed: <strong>{emailResult.failed}</strong></p>
                                )}
                            </div>
                        )}
                    </section>
                )}

                {/* Always-visible QR & Email section for JSON delegates */}
                <section className="admin-section">
                    <h2 className="section-title">📲 QR Codes & Emails</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                        Generate QR codes or send emails for all delegates currently in the system (including those added directly to delegates.json).
                    </p>
                    <div className="action-buttons">
                        <button
                            className="btn btn-primary"
                            onClick={handleDownloadQR}
                            disabled={downloading}
                        >
                            {downloading ? '⏳ Generating ZIP...' : '📥 Download All QR Codes (ZIP)'}
                        </button>

                        <button
                            className="btn btn-accent"
                            onClick={handleSendEmails}
                            disabled={sendingEmails}
                        >
                            {sendingEmails ? '⏳ Sending...' : '📧 Send Emails to All Delegates'}
                        </button>
                    </div>

                    {emailResult && (
                        <div className="alert alert-info" style={{ marginTop: 16 }}>
                            <p>📧 Emails sent: <strong>{emailResult.sent}</strong></p>
                            {emailResult.failed > 0 && (
                                <p>❌ Failed: <strong>{emailResult.failed}</strong></p>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
