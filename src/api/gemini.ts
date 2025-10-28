export interface GeminiAnalysisResult {
    matches?: {
        matchName: string;
        bets: string[];
    }[];
    betAmount?: number;
    odds?: number;
}

export async function analyzeBetSlipApi(base64ImageData: string): Promise<GeminiAnalysisResult | null> {
    const localApiUrl = '/api/analyze';
    const payload = { base64ImageData: base64ImageData };
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
        try {
            const response = await fetch(localApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`API isteği başarısız oldu: ${response.status}`);
            }
        } catch (error: any) {
            console.error(`Attempt failed: ${error.message}`);
            retries--;
            if (retries === 0) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
    return null;
}
