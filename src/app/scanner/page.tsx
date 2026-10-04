'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

import { Delegate } from '@/lib/types';

type DelegateResult = Delegate;

type ScanState = 'idle' | 'scanning' | 'success' | 'duplicate' | 'error';

export default function ScannerPage() {
    const [scanState, setScanState] = useState<ScanState>('idle');
    const [delegate, setDelegate] = useState<DelegateResult | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [scannerActive, setScannerActive] = useState(false);
    const scannerRef = useRef<HTMLDivElement>(null);
    const html5QrScannerRef = useRef<any>(null);

    const processUrl = useCallback(async (scannedUrl: string) => {
        // Extract delegateId from URL (supports custom IDs like NLDS26-32E706 and DEL001)
        const match = scannedUrl.match(/\/delegate\/([^/?#]+)/i);
        if (!match) {
            setScanState('error');
            setErrorMsg('Invalid QR code format');
            return;
        }

        const delegateId = match[1];

        try {
            // Check in the delegate
            const res = await fetch(`/api/delegates/${delegateId}`, {
                method: 'PATCH',
            });
            const result = await res.json();

            if (!result.success) {
                setScanState('error');
                setErrorMsg(result.error || 'Delegate not found');
                return;
            }

            const checkInData = result.data;
            setDelegate(checkInData.delegate);

            if (checkInData.alreadyCheckedIn) {
                setScanState('duplicate');
            } else {
                setScanState('success');
            }
        } catch {
            setScanState('error');
            setErrorMsg('Network error. Please try again.');
        }
    }, []);

    const startScanner = useCallback(async () => {
        if (!scannerRef.current) return;

        // Ensure the container has dimensions before starting (fixes iOS Safari)
        scannerRef.current.style.minHeight = '300px';
        scannerRef.current.style.width = '100%';

        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const scanner = new Html5Qrcode('qr-reader', {
                verbose: false,
                formatsToSupport: [0], // QR_CODE only
            });
            html5QrScannerRef.current = scanner;

            const qrboxSize = Math.min(250, Math.floor(window.innerWidth * 0.6));

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: qrboxSize, height: qrboxSize },
                    aspectRatio: 1,
                    videoConstraints: {
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                },
                (decodedText) => {
                    scanner.stop().catch(() => { });
                    setScannerActive(false);
                    processUrl(decodedText);
                },
                () => { }
            );

            // Force video element to show on iOS Safari
            const videoEl = scannerRef.current?.querySelector('video');
            if (videoEl) {
                videoEl.setAttribute('playsinline', 'true');
                videoEl.setAttribute('webkit-playsinline', 'true');
                videoEl.style.width = '100%';
                videoEl.style.height = 'auto';
                videoEl.style.objectFit = 'cover';
                videoEl.style.display = 'block';
            }

            setScannerActive(true);
        } catch (err) {
            console.error('Scanner error:', err);
            setErrorMsg('Camera access denied or not available. Please check your browser settings.');
            setScanState('error');
        }
    }, [processUrl]);

    const stopScanner = useCallback(async () => {
        if (html5QrScannerRef.current) {
            try {
                await html5QrScannerRef.current.stop();
            } catch { }
            html5QrScannerRef.current = null;
        }
        setScannerActive(false);
    }, []);

    const resetScanner = useCallback(() => {
        setScanState('idle');
        setDelegate(null);
        setErrorMsg('');
        setTimeout(() => startScanner(), 300);
    }, [startScanner]);

    useEffect(() => {
        // Auto-start scanner when page loads
        startScanner();
        return () => {
            stopScanner();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="page-container scanner-page">
            <nav className="top-nav">
                <Link href="/" className="nav-back">← Home</Link>
                <h1 className="nav-title">QR Scanner</h1>
                <div style={{ width: 60 }} />
            </nav>

            <div className="scanner-content">
                {scanState === 'idle' && !scannerActive && (
                    <div className="scanner-start">
                        <div className="scanner-icon">📷</div>
                        <h2>Ready to Scan</h2>
                        <p>Point your camera at a delegate&apos;s QR code</p>
                        <button className="btn btn-primary btn-large" onClick={startScanner}>
                            Start Scanner
                        </button>
                    </div>
                )}

                {(scanState === 'idle' || scanState === 'scanning') && (
                    <div className={`scanner-viewport ${scannerActive ? 'active' : ''}`}>
                        <div id="qr-reader" ref={scannerRef}></div>
                        {scannerActive && (
                            <button className="btn btn-danger btn-small" onClick={stopScanner}>
                                Stop
                            </button>
                        )}
                    </div>
                )}

                {/* Success State */}
                {scanState === 'success' && delegate && (
                    <div className="scan-result success-result">
                        <div className="result-header success-header">
                            <div className="result-icon">✅</div>
                            <h2>Check-In Successful!</h2>
                        </div>
                        <DelegateCard delegate={delegate} />
                        <button className="btn btn-primary btn-large" onClick={resetScanner}>
                            📷 Scan Next Delegate
                        </button>
                    </div>
                )}

                {/* Duplicate State */}
                {scanState === 'duplicate' && delegate && (
                    <div className="scan-result duplicate-result">
                        <div className="result-header duplicate-header">
                            <div className="result-icon">⚠️</div>
                            <h2>Already Checked In!</h2>
                            {delegate.checkedInAt && (
                                <p className="checkin-time">
                                    Checked in at {new Date(delegate.checkedInAt).toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                        <DelegateCard delegate={delegate} />
                        <button className="btn btn-primary btn-large" onClick={resetScanner}>
                            📷 Scan Next Delegate
                        </button>
                    </div>
                )}

                {/* Error State */}
                {scanState === 'error' && (
                    <div className="scan-result error-result">
                        <div className="result-header error-header">
                            <div className="result-icon">❌</div>
                            <h2>Error</h2>
                            <p>{errorMsg}</p>
                        </div>
                        <button className="btn btn-primary btn-large" onClick={resetScanner}>
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function DelegateCard({ delegate }: { delegate: DelegateResult }) {
    return (
        <div className="delegate-card">
            <div className="delegate-id">{delegate.delegateId}</div>
            <h3 className="delegate-name">{delegate.name}</h3>
            <div className="delegate-details">
                <div className="detail-row">
                    <span className="detail-label">🏢 Entity</span>
                    <span className="detail-value">{delegate.entity}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">🎒 Combo Pack</span>
                    <span className={`detail-value pack-badge ${delegate.comboPack?.purchased ? 'pack-yes' : 'pack-no'}`}>
                        {delegate.comboPack?.purchased ? (delegate.comboPack.size ? `${delegate.comboPack.size} (x${delegate.comboPack.quantity})` : `x${delegate.comboPack.quantity}`) : 'No'}
                    </span>
                </div>
                {delegate.delegateTshirt?.purchased && (
                    <div className="detail-row">
                        <span className="detail-label">👕 Delegate Tshirt</span>
                        <span className="detail-value">
                            {delegate.delegateTshirt.size} (x{delegate.delegateTshirt.quantity})
                        </span>
                    </div>
                )}
                {delegate.wristBand?.purchased && (
                    <div className="detail-row">
                        <span className="detail-label">⌚ Wrist Band</span>
                        <span className="detail-value">x{delegate.wristBand.quantity}</span>
                    </div>
                )}
                {delegate.stickerPack?.purchased && (
                    <div className="detail-row">
                        <span className="detail-label">🏷️ Sticker Pack</span>
                        <span className="detail-value">x{delegate.stickerPack.quantity}</span>
                    </div>
                )}
                {delegate.bucketHat?.purchased && (
                    <div className="detail-row">
                        <span className="detail-label">🎩 Bucket Hat</span>
                        <span className="detail-value">x{delegate.bucketHat.quantity}</span>
                    </div>
                )}
            </div>
        </div>
    );
}