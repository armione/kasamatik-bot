// This API function is part of a multi-cron architecture suitable for Pro plans.
// For the Hobby plan, a single, time-managed cron job (`/api/auto-result-bets`) is used instead.
// This file is kept for easy upgrade to a Pro plan in the future but is currently inactive.

export default async function handler(request, response) {
  response.status(410).json({ message: 'This endpoint is part of a Pro plan architecture and is currently inactive.' });
}
