import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { getDelegates } from '@/lib/delegates';

const EVENT_DOMAIN = process.env.EVENT_DOMAIN || 'http://localhost:3000';

export async function GET() {
    try {
        const delegates = await getDelegates();

        if (delegates.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No delegates found' },
                { status: 404 }
            );
        }

        const zip = new JSZip();

        for (const delegate of delegates) {
            const url = `${EVENT_DOMAIN}/delegate/${delegate.delegateId}`;
            const qrBuffer = await QRCode.toBuffer(url, {
                type: 'png',
                width: 400,
                margin: 2,
            });
            const entityFolder = (delegate.entity || 'Other').trim().replace(/[/\\:*?"<>|]/g, '_') || 'Other';
            const safeName = (delegate.name || 'Delegate').trim().replace(/[/\\:*?"<>|]/g, '_');
            zip.file(`${entityFolder}/${delegate.delegateId}_${safeName}.png`, qrBuffer);
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        return new NextResponse(new Uint8Array(zipBuffer), {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="qr-codes.zip"',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to export QR codes' },
            { status: 500 }
        );
    }
}
