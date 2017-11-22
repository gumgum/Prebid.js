import * as utils from 'src/utils'

import { config } from 'src/config'
import { registerBidder } from 'src/adapters/bidderFactory'

const BIDDER_CODE = 'gumgum'
const BID_ENDPOINT = `https://g2.gumgum.com/hbid/imp`
const DT_CREDENTIALS = { member: 'YcXr87z2lpbB' }
const requestCache = {};
const throttleTable = {};
const defaultThrottle = 3e4;
let browserParams = false;
let pageViewId = false;

/**
 * Get common browser parameters (if possible)
 * @returns {Object}
 */
function _getBrowserParams() {
  let topWindow
  let topScreen
  if (browserParams) {
    return browserParams
  }
  try {
    topWindow = global.top;
    topScreen = topWindow.screen;
  } catch (error) {
    utils.logError(error);
    return {}
  }
  browserParams = {
    vw: topWindow.innerWidth,
    vh: topWindow.innerHeight,
    sw: topScreen.width,
    sh: topScreen.height,
    pu: utils.getTopWindowUrl(),
    ce: utils.cookiesAreEnabled(),
    dpr: topWindow.devicePixelRatio || 1
    // bf: getBrowserFP() - Mario says we need this now
  }
  return browserParams
}
/**
 * Get DigiTrust Identity
 * @returns {Object|false}
 */
function getDigiTrustId () {
  let digiTrustUser = window.DigiTrust && (config.getConfig('digiTrustId') || window.DigiTrust.getUser(DT_CREDENTIALS));
  return (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || false;
};
/**
 * Get DigiTrust params
 * @returns {Object}
 */
function _getDigiTrustQueryParams() {
  let digiTrustId = getDigiTrustId();
  // Verify there is an ID and this user has not opted out
  return (digiTrustId && !(digiTrustId.privacy && digiTrustId.privacy.optout)) ? {
    'dti': digiTrustId.id,
    'dtk': digiTrustId.keyv
  } : {};
}
/**
 * Base64 a JSON string from Object
 * @param {Object}
 * @returns {String}
 */
function b64Encode(data) {
  return window.btoa(JSON.stringify(data))
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['gg'],
  /**
   * Determines whether or not the given bid request is valid.
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    const {
      params,
      adUnitCode
    } = bid;
    const timestamp = utils.timestamp();
    let productId

    switch (true) {
      case !!(params.inScreen):
        productId = 2;
        break;
      case !!(params.inSlot):
        productId = 3;
        break;
      default: utils.logWarn(
        `[GumGum] No product selected for the placement ${adUnitCode}` +
        ', please check your implementation.'
      );
        return false;
    }

    /* throttle based on the latest request for this product */
    const requestKey = productId + '|' + adUnitCode;
    const throttle = throttleTable[productId];
    const latestRequest = requestCache[requestKey];
    if (latestRequest && throttle && (timestamp - latestRequest) < throttle) {
      utils.logWarn(
        `[GumGum] The refreshes for "${adUnitCode}" with the params ` +
        `${JSON.stringify(params)} should be at least ${throttle / 1e3}s apart.`
      );
      return false;
    }
    /* update the last request */
    requestCache[requestKey] = timestamp;

    return true;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests) {
    const bids = [];

    utils._each(validBidRequests, bidRequest => {
      const timeout = config.getConfig('bidderTimeout');
      const {
        bidId,
        params = {},
        transactionId
      } = bidRequest;

      const bid = {
        tmax: timeout,
        tId: transactionId,
        id: bidId
      }

      /* tracking id is required for in-screen */
      if (params.inScreen) {
        bid.pi = 2;
        bid.t = params.inScreen
      }
      /* slot id is required for in-slot */
      if (params.inSlot) {
        bid.pi = 3;
        bid.si = params.inSlot;
      }

      /* include the pageViewId, if any */
      if (pageViewId) {
        bid.pv = pageViewId;
      }

      bids.push({
        id: bidId,
        url: BID_ENDPOINT,
        method: 'GET',
        data: Object.assign(bid, _getBrowserParams(), _getDigiTrustQueryParams()),
        pi: bid.pi
      })
    });
    return bids;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = []
    const {
      ad: {
        price: cpm,
        width,
        height,
        id: creativeId,
        markup,
        pbw
      },
      pag,
      thms: throttle
    } = serverResponse
    const { pi } = bidRequest

    /* cache the pageViewId */
    if (pag && pag.pvid) {
      pageViewId = pag.pvid;
    }

    if (!markup || !pbw) {
      return bidResponses
    }
    const ad = pbw.replace(/AD_JSON/i, b64Encode(Object.assign({}, serverResponse, bidRequest)))

    /* set the new throttle */
    throttleTable[pi] = throttle || defaultThrottle;

    const bidResponse = {
      requestId: bidRequest.id,
      bidderCode: spec.code,
      // need to set a cpm > 0 for testing.
      cpm: cpm || 0.5,
      width,
      height,
      creativeId,
      // dealId: DEAL_ID,
      currency: 'USD',
      netRevenue: true,
      // ttl: TIME_TO_LIVE,
      // referrer: REFERER,
      ad
    }
    if (ad) {
      bidResponses.push(bidResponse)
    }
    return bidResponses
  },
  getUserSyncs: function (syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'ADAPTER_SYNC_URL'
      }]
    }
  }
}
registerBidder(spec)
