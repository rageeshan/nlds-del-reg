import crypto from 'crypto';
import { Redis } from '@upstash/redis';
import { Delegate, CheckInResult, DelegateStats } from './types';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.STORAGE_REST_API_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN!,
});

const DELEGATES_KEY = 'delegates';

export function generateRandomDelegateId(existingIds?: Set<string>): string {
    let id = '';
    do {
        const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
        id = `NLDS26-${hex}`;
    } while (existingIds && existingIds.has(id));
    if (existingIds) {
        existingIds.add(id);
    }
    return id;
}

export async function getDelegates(): Promise<Delegate[]> {
    const data = await redis.get<Delegate[]>(DELEGATES_KEY);
    return data || [];
}

export async function getDelegate(id: string): Promise<Delegate | undefined> {
    const delegates = await getDelegates();
    return delegates.find((d) => d.delegateId === id);
}

export async function saveDelegates(delegates: Delegate[]): Promise<void> {
    await redis.set(DELEGATES_KEY, delegates);
}

export async function checkInDelegate(id: string): Promise<CheckInResult> {
    const delegates = await getDelegates();
    const delegate = delegates.find((d) => d.delegateId === id);

    if (!delegate) {
        return {
            success: false,
            delegate: null as unknown as Delegate,
            alreadyCheckedIn: false,
            message: 'Delegate not found',
        };
    }

    if (delegate.checkedIn) {
        return {
            success: true,
            delegate,
            alreadyCheckedIn: true,
            message: `Already checked in at ${delegate.checkedInAt || 'unknown time'}`,
        };
    }

    delegate.checkedIn = true;
    delegate.checkedInAt = new Date().toISOString();
    await saveDelegates(delegates);

    return {
        success: true,
        delegate,
        alreadyCheckedIn: false,
        message: 'Check-in successful!',
    };
}

export async function getStats(): Promise<DelegateStats> {
    const delegates = await getDelegates();
    const total = delegates.length;
    const checkedIn = delegates.filter((d) => d.checkedIn).length;
    return {
        total,
        checkedIn,
        remaining: total - checkedIn,
        percentage: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
    };
}
