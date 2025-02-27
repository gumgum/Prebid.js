let adUnits = {};
export function reset() {
  adUnits = {}
}

function ensureAdUnit(adunit, bidderCode) {
  let adUnit = adUnits[adunit] = adUnits[adunit] || { bidders: {} };
  if (bidderCode) {
    return adUnit.bidders[bidderCode] = adUnit.bidders[bidderCode] || {}
  }
  return adUnit;
}

function incrementAdUnitCount(adunit, counter, bidderCode) {
  let adUnit = ensureAdUnit(adunit, bidderCode);
  adUnit[counter] = (adUnit[counter] || 0) + 1;
  return adUnit[counter];
}

/**
 * Increments and returns current Adunit counter
 * @param {string} adunit id
 * @returns {number} current adunit count
 */
export function incrementRequestsCounter(adunit) {
  return incrementAdUnitCount(adunit, 'requestsCounter');
}

/**
 * Increments and returns current Adunit requests counter for a bidder
 * @param {string} adunit id
 * @param {string} bidderCode code
 * @returns {number} current adunit bidder requests count
 */
export function incrementBidderRequestsCounter(adunit, bidderCode) {
  return incrementAdUnitCount(adunit, 'requestsCounter', bidderCode);
}

/**
 * Increments and returns current Adunit wins counter for a bidder
 * @param {string} adunit id
 * @param {string} bidderCode code
 * @returns {number} current adunit bidder requests count
 */
export function incrementBidderWinsCounter(adunit, bidderCode) {
  return incrementAdUnitCount(adunit, 'winsCounter', bidderCode);
}

/**
 * Increments and returns current Adunit auctions counter
 * @param {string} adunit id
 * @returns {number} current adunit auctions count
 */
export function incrementAuctionsCounter(adunit) {
  return incrementAdUnitCount(adunit, 'auctionsCounter');
}

/**
 * Returns current Adunit counter
 * @param {string} adunit id
 * @returns {number} current adunit count
 */
export function getRequestsCounter(adunit) {
  return adUnits?.[adunit]?.requestsCounter || 0;
}

/**
 * Returns current Adunit requests counter for a specific bidder code
 * @param {string} adunit id
 * @param {string} bidder code
 * @returns {number} current adunit bidder requests count
 */
export function getBidderRequestsCounter(adunit, bidder) {
  return adUnits?.[adunit]?.bidders?.[bidder]?.requestsCounter || 0;
}

/**
 * Returns current Adunit requests counter for a specific bidder code
 * @param {string} adunit id
 * @param {string} bidder code
 * @returns {number} current adunit bidder requests count
 */
export function getBidderWinsCounter(adunit, bidder) {
  return adUnits?.[adunit]?.bidders?.[bidder]?.winsCounter || 0;
}

/**
 * Returns current Adunit auctions counter
 * @param {string} adunit id
 * @returns {number} current adunit auctions count
 */
export function getAuctionsCounter(adunit) {
  return adUnits?.[adunit]?.auctionsCounter || 0;
}
