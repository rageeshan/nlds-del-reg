import { getDelegate } from '@/lib/delegates';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DelegatePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const delegate = await getDelegate(id);

    if (!delegate) {
        notFound();
    }

    return (
        <div className="page-container delegate-page">
            <nav className="top-nav">
                <Link href="/scanner" className="nav-back">← Scanner</Link>
                <h1 className="nav-title">Delegate Info</h1>
                <div style={{ width: 60 }} />
            </nav>

            <div className="delegate-display">
                <div className={`status-banner ${delegate.checkedIn ? 'checked-in' : 'not-checked-in'}`}>
                    {delegate.checkedIn ? '✅ Checked In' : '⏳ Not Yet Checked In'}
                </div>

                <div className="delegate-card large-card">
                    <div className="delegate-id">{delegate.delegateId}</div>
                    <h2 className="delegate-name">{delegate.name}</h2>
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
                                <span className="detail-value">{delegate.delegateTshirt.size} (x{delegate.delegateTshirt.quantity})</span>
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

                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                    <Link href="/scanner" className="btn btn-primary btn-large">
                        📷 Back to QR Scanner
                    </Link>
                </div>
            </div>
        </div>
    );
}
