import { NextRequest, NextResponse } from 'next/server';
import { getDelegates, saveDelegates } from '@/lib/delegates';
import { Delegate } from '@/lib/types';

export async function GET() {
    try {
        const delegates = await getDelegates();
        return NextResponse.json({ success: true, data: delegates });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to fetch delegates' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { delegates: rawDelegates } = body as { delegates: Array<Record<string, string>> };

        if (!rawDelegates || !Array.isArray(rawDelegates)) {
            return NextResponse.json(
                { success: false, error: 'Invalid data format' },
                { status: 400 }
            );
        }

        const delegates: Delegate[] = rawDelegates.map((rawRow, index) => {
            // Advanced fuzzy matcher: finds a column that contains ALL required keywords
            const find = (keywords: string[]) => {
                const keys = Object.keys(rawRow);
                const normalizedKeywords = keywords.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
                
                const foundKey = keys.find(k => {
                    const nk = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return normalizedKeywords.every(word => nk.includes(word));
                });
                return foundKey ? rawRow[foundKey] : undefined;
            };

            const id = String(
                rawRow['ID'] ||
                rawRow['Id'] ||
                rawRow['id'] ||
                find(['Delegate', 'ID']) ||
                find(['ID']) ||
                `DEL${String(index + 1).padStart(3, '0')}`
            ).trim();

            const preferredName = find(['Preferred', 'Name']) || find(['preferredName']) || '';
            const firstName = preferredName || find(['First', 'Name']) || find(['firstName']) || '';
            const lastName = find(['Last', 'Name']) || find(['lastName']) || '';
            const fullName = find(['Full', 'Name']) || find(['name']) || `${firstName} ${lastName}`.trim() || '';

            const parseBoolean = (val: any) => {
                const s = String(val || '').toLowerCase().trim();
                return ['yes', 'true', '1', 'y', 'checked', 'checked in', 'true'].includes(s);
            };
            const parseNum = (val: any) => {
                const s = String(val || '0').replace(/[^0-9]/g, '');
                return parseInt(s || '0', 10);
            };

            // Helper to parse apparel with sizes like "1 (S, Regular)" or "1 (S, Regular); 1 (L, Regular)"
            const parseApparelItem = (val: any) => {
                if (!val) return { purchased: false, size: '', quantity: 0 };
                const str = String(val).trim();
                if (!str || str === '0' || str.toLowerCase() === 'no' || str.toLowerCase() === 'false') {
                    return { purchased: false, size: '', quantity: 0 };
                }

                const matches = Array.from(str.matchAll(/(\d+)\s*\(([^)]+)\)/g));
                if (matches.length > 0) {
                    let totalQty = 0;
                    const descriptions: string[] = [];
                    for (const m of matches) {
                        const qty = parseInt(m[1], 10) || 1;
                        const desc = m[2].trim();
                        totalQty += qty;
                        descriptions.push(qty > 1 ? `${desc} x${qty}` : desc);
                    }
                    return {
                        purchased: true,
                        size: descriptions.join('; '),
                        quantity: totalQty,
                    };
                }

                const num = parseInt(str.replace(/[^0-9]/g, ''), 10);
                if (!isNaN(num) && num > 0) {
                    return {
                        purchased: true,
                        size: '',
                        quantity: num,
                    };
                }

                return {
                    purchased: true,
                    size: str,
                    quantity: 1,
                };
            };

            // Helper to parse count items like "1", "2"
            const parseCountItem = (val: any) => {
                if (!val) return { purchased: false, quantity: 0 };
                const str = String(val).trim();
                if (!str || str === '0' || str.toLowerCase() === 'no' || str.toLowerCase() === 'false') {
                    return { purchased: false, quantity: 0 };
                }
                const num = parseInt(str.replace(/[^0-9]/g, ''), 10);
                if (!isNaN(num) && num > 0) {
                    return {
                        purchased: true,
                        quantity: num,
                    };
                }
                if (['yes', 'true', 'checked', 'y'].includes(str.toLowerCase())) {
                    return {
                        purchased: true,
                        quantity: 1,
                    };
                }
                return { purchased: false, quantity: 0 };
            };

            const comboPack = parseApparelItem(find(['Combo', 'Pack']));
            const delegateTshirt = parseApparelItem(
                find(['Delegate', 'Tshirt']) ||
                find(['Delegate', 'T-shirt']) ||
                find(['Delegate', 'Shirt']) ||
                find(['Tshirt']) ||
                find(['T-shirt'])
            );
            const wristBand = parseCountItem(find(['Wrist', 'Band']));
            const stickerPack = parseCountItem(find(['Sticker', 'Pack']));
            const bucketHat = parseCountItem(find(['Bucket', 'Hat']));

            return {
                delegateId: id,
                name: fullName,
                firstName: firstName,
                lastName: lastName,
                preferredName: preferredName || firstName,
                email: find(['email']) || '',
                age: parseNum(find(['age'])),
                entity: find(['Entity']) || '',
                role: find(['Role']) || find(['Position']) || '',
                foodPreference: find(['Food', 'Preference']) || '',
                delegatePack: parseBoolean(find(['Merch', 'Pack'])) || parseBoolean(find(['Delegate', 'Pack'])),
                contactNumber: find(['Contact', 'Number']) || find(['phone']) || '',
                checkedIn: parseBoolean(find(['Status'])),
                
                comboPack,
                delegateTshirt,
                wristBand,
                stickerPack,
                bucketHat,
                totalItems: parseNum(find(['Total', 'Item', 'Count']) || find(['Total']))
            };
        });

        await saveDelegates(delegates);

        return NextResponse.json({
            success: true,
            data: { count: delegates.length },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to save delegates' },
            { status: 500 }
        );
    }
}
