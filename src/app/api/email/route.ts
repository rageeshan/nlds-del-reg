import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import QRCode from 'qrcode';
import { getDelegates } from '@/lib/delegates';

const EVENT_DOMAIN = process.env.EVENT_DOMAIN || 'http://localhost:3000';

export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'RESEND_API_KEY is not configured' },
                { status: 500 }
            );
        }

        const resend = new Resend(apiKey);
        const delegates = await getDelegates();

        if (delegates.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No delegates found' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const fromEmail = body.fromEmail || 'onboarding@resend.dev';
        const eventName = body.eventName || 'Our Event';

        let sent = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const delegate of delegates) {
            try {
                const url = `${EVENT_DOMAIN}/delegate/${delegate.delegateId}`;
                const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
                const base64Data = qrDataUrl.split(',')[1];

                const fullName = (delegate.name || `${delegate.firstName || ''} ${delegate.lastName || ''}`.trim() || delegate.delegateId).trim();
                const safeName = fullName.replace(/[/\\:*?"<>|]/g, '_') || delegate.delegateId;

                await resend.emails.send({
                    from: fromEmail,
                    to: delegate.email,
                    subject: `Welcome to ${eventName} - Your QR Code`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1a1a2e; text-align: center;">Welcome to ${eventName}!</h1>
              <p style="font-size: 16px; color: #333;">Dear <strong>${delegate.name}</strong>,</p>
              <p style="font-size: 16px; color: #333;">We're excited to have you join us! Below is your unique QR code for event registration.</p>
              <div style="text-align: center; margin: 30px 0;">
                <img src="cid:qrcode" alt="Your QR Code" style="width: 250px; height: 250px;" />
              </div>
              <div style="background: #f0f4ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1a1a2e;">Instructions:</h3>
                <ol style="color: #333; font-size: 14px;">
                  <li>Save this QR code or keep this email handy</li>
                  <li>Present the QR code at the registration desk upon arrival</li>
                  <li>Our team will scan it to complete your check-in</li>
                </ol>
              </div>
              <p style="font-size: 14px; color: #333;">Your Delegate ID: <strong>${delegate.delegateId}</strong></p>
              <hr style="border: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #999; text-align: center;">This is an automated message. Please do not reply.</p>
            </div>
          `,
                    attachments: [
                        {
                            filename: `${safeName}.png`,
                            content: base64Data,
                            contentType: 'image/png',
                        },
                    ],
                });
                sent++;
            } catch (err) {
                failed++;
                errors.push(`Failed to send to ${delegate.email}: ${(err as Error).message}`);
            }
        }

        return NextResponse.json({
            success: true,
            data: { sent, failed, total: delegates.length, errors: errors.slice(0, 10) },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to send emails' },
            { status: 500 }
        );
    }
}
