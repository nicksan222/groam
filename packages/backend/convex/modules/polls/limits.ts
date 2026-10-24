/**
 * How many open polls a trip's first page holds: the web's Polls section and sidebar page the same
 * size. Home reads this many too, so a trip's counts match its sidebar up to this size; past it
 * the sidebar counts only its first page and the two can differ. A leaf module, so the web can
 * import it without the server code.
 */
export const OPEN_POLLS_FIRST_PAGE = 50;
