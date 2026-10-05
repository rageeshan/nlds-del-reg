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

        const usedPaths = new Set<string>();

        for (const delegate of delegates) {
            const url = `${EVENT_DOMAIN}/delegate/${delegate.delegateId}`;
            const qrBuffer = await QRCode.toBuffer(url, {
                type: 'png',
                width: 400,
                margin: 2,
            });
            const entityFolder = (delegate.entity || 'Other').trim().replace(/[/\\:*?"<>|]/g, '_') || 'Other';
            const fullName = (delegate.name || `${delegate.firstName || ''} ${delegate.lastName || ''}`.trim() || delegate.delegateId).trim();
            const safeName = fullName.replace(/[/\\:*?"<>|]/g, '_') || delegate.delegateId;

            let filePath = `${entityFolder}/${safeName}.png`;
            let counter = 1;
            while (usedPaths.has(filePath)) {
                counter++;
                filePath = `${entityFolder}/${safeName} (${counter}).png`;
            }
            usedPaths.add(filePath);

            zip.file(filePath, qrBuffer);
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
