import { Bet } from "../types";

export function showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 4000) {
    const container = document.getElementById('notifications');
    if (!container) return;

    const notificationId = `notif_${Date.now()}`;
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = `notification glass-card p-4 rounded-lg shadow-lg border-l-4 max-w-sm w-full`;

    const colors = {
        success: 'border-green-500',
        error: 'border-red-500',
        info: 'border-blue-500',
        warning: 'border-yellow-500'
    };
    
    notification.classList.add(colors[type]);

    notification.innerHTML = `
        <div class="flex items-start">
            <div class="ml-3 w-0 flex-1 pt-0.5">
                <p class="text-sm font-medium text-white">${message}</p>
            </div>
            <div class="ml-4 flex-shrink-0 flex">
                <button id="close-${notificationId}" class="inline-flex text-gray-400 hover:text-white">
                    <span class="sr-only">Close</span>
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    `;

    container.appendChild(notification);

    const close = () => {
        notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        notification.style.opacity = '0';
        notification.style.transform = 'scale(0.9)';
        setTimeout(() => notification.remove(), 300);
    }
    
    const timeoutId = setTimeout(close, duration);
    
    document.getElementById(`close-${notificationId}`)?.addEventListener('click', () => {
        clearTimeout(timeoutId);
        close();
    });
}


export function formatCurrency(amount: number, showSign: boolean = false): string {
    const options = {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    };
    const formatted = new Intl.NumberFormat('tr-TR', options).format(amount);
    if (showSign && amount > 0) {
        return `+${formatted}`;
    }
    return formatted;
}


export function calculateProfitLoss(bets: Bet[]): { totalStake: number, totalReturn: number } {
    return bets.reduce((acc, bet) => {
        acc.totalStake += bet.bet_amount;
        if (bet.status === 'won') {
            acc.totalReturn += bet.potential_return || (bet.bet_amount * bet.odds);
        } else if (bet.status === 'refunded') {
            acc.totalReturn += bet.bet_amount;
        }
        return acc;
    }, { totalStake: 0, totalReturn: 0 });
}
