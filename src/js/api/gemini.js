export async function analyzeBetSlipApi(base64ImageData) {
    const localApiUrl = '/api/analyze';
    const payload = { base64ImageData: base64ImageData };
    let response;
    let retries = 3;
    let delay = 1000;
    while (retries > 0) {
        try {
            response = await fetch(localApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`API isteği başarısız oldu: ${response.status}`);
            }
        } catch (error) {
            console.error(`Attempt failed: ${error.message}`);
            retries--;
            if (retries === 0) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
}