/*
 * Everything the Supabase functions share with the website, bundled for the server by
 * `npm run sync:functions` into supabase/functions/_shared/core.js. Edit the source files, not that bundle.
 */
export { availability, cancelTerms, freeCancelHours, quote } from './quote'
export { bookedNights } from './booked'
export { clubStatus, isAtLeast, pointsFor } from './club'
export { bookingId } from './format'
export { site } from '../config/site'
export { agentQuote, markupFor, AGENT_DISCOUNT } from './agentRates'
