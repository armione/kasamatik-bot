// /api/auto-result-bets.js
import { createClient } from '@supabase/supabase-js';

// Vercel Hobby plan functions have a short timeout. We set a safe limit to exit before that.
const TIME_LIMIT_MS = 8000; // 8 seconds

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase environment variables not found.");
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to call other APIs internally
const internalApiCall = async (endpoint, body) => {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const url = `${baseUrl}/api/${endpoint}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Internal API call to ${endpoint} failed: ${errorData.message || response.statusText}`);
    }
    return response.json();
};

export default async function handler(request, response) {
    const secret = request.query.secret;
    if (secret !== process.env.CRON_SECRET) {
        return response.status(401).json({ message: 'Unauthorized' });
    }

    const startTime = Date.now();
    let processedCount = 0;
    let failedCount = 0;

    try {
        const { data: pendingBets, error: fetchError } = await supabase
            .from('bets')
            .select('*')
            .eq('status', 'pending')
            .neq('bet_type', 'Kasa İşlemi')
            .lte('date', new Date().toISOString().split('T')[0]);

        if (fetchError) throw fetchError;
        if (!pendingBets || pendingBets.length === 0) {
            return response.status(200).json({ message: 'No pending bets to process.' });
        }

        for (const bet of pendingBets) {
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime > TIME_LIMIT_MS) {
                console.log(`Time limit reached (${elapsedTime}ms). Exiting gracefully.`);
                break;
            }

            try {
                const parsedMatches = await internalApiCall('parse-coupon', { couponDescription: bet.description });
                if (!Array.isArray(parsedMatches) || parsedMatches.length === 0) throw new Error('Could not parse coupon.');
                
                const matchResults = await Promise.all(
                    parsedMatches.map(match =>
                        internalApiCall('get-match-result', {
                            matchDescription: match.normalizedName,
                            matchDate: bet.date
                        })
                    )
                );

                const evaluations = await Promise.all(
                    matchResults.map((result, index) => {
                        if (result.status !== 'finished') return { outcome: 'pending' };
                        return internalApiCall('evaluate-bet', {
                            betDescription: parsedMatches[index].fullDescription,
                            matchResult: result
                        });
                    })
                );

                let finalCouponOutcome = 'pending';
                if (parsedMatches.length > 1) { // Coupon logic
                    const anyLegLost = evaluations.some(e => e.outcome === 'lost');
                    if (anyLegLost) {
                        finalCouponOutcome = 'lost';
                    } else {
                        const allLegsDecided = evaluations.every(e => e.outcome === 'won' || e.outcome === 'lost');
                        if (allLegsDecided) {
                            finalCouponOutcome = 'won';
                        }
                    }
                } else { // Single bet logic
                    finalCouponOutcome = evaluations[0]?.outcome || 'pending';
                }

                if (finalCouponOutcome === 'won' || finalCouponOutcome === 'lost') {
                    const profit_loss = finalCouponOutcome === 'won' ? (bet.bet_amount * bet.odds) - bet.bet_amount : -bet.bet_amount;
                    const win_amount = finalCouponOutcome === 'won' ? bet.bet_amount * bet.odds : 0;
                    
                    await supabase
                        .from('bets')
                        .update({ status: finalCouponOutcome, profit_loss, win_amount })
                        .eq('id', bet.id);
                    
                    processedCount++;
                }
            } catch (singleBetError) {
                console.error(`Error processing bet ID ${bet.id}:`, singleBetError.message);
                failedCount++;
            }
        }

        response.status(200).json({
            message: `Processing complete. Processed: ${processedCount}, Failed: ${failedCount}, Total found: ${pendingBets.length}.`,
        });

    } catch (error) {
        console.error('Auto-result cron job error:', error);
        response.status(500).json({ message: 'An error occurred during the cron job.', error: error.message });
    }
}
