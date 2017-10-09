import * as utils from 'src/utils'
import { registerBidder } from 'src/adapters/bidderFactory'
import { config } from 'src/config'
const BIDDER_CODE = 'gumgum'
const BID_ENDPOINT = `https://g2.gumgum.com/hbid/imp`
const DT_CREDENTIALS = { member: 'YcXr87z2lpbB' }

let browserParams = {};
// const requestCache = {};
// const throttleTable = {};
// const defaultThrottle = 3e4;

// function _getTimeStamp() {
//   return new Date().getTime();
// }

function _getBrowserParams() {
  let topWindow
  let topScreen
  if (browserParams.vw) {
    // we've already initialized browserParams, just return it.
    return browserParams
  }

  try {
    topWindow = global.top;
    topScreen = topWindow.screen;
  } catch (error) {
    utils.logError(error);
    return null
  }

  browserParams = {
    vw: topWindow.innerWidth,
    vh: topWindow.innerHeight,
    sw: topScreen.width,
    sh: topScreen.height,
    pu: utils.getTopWindowUrl(),
    ce: utils.cookiesAreEnabled(),
    dpr: topWindow.devicePixelRatio || 1
  }
  return browserParams
}

// TODO: use getConfig()
function _getDigiTrustQueryParams() {
  function getDigiTrustId () {
    var digiTrustUser = (window.DigiTrust && window.DigiTrust.getUser) ? window.DigiTrust.getUser(DT_CREDENTIALS) : {};
    return (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || '';
  };

  let digiTrustId = getDigiTrustId();
  // Verify there is an ID and this user has not opted out
  if (!digiTrustId || (digiTrustId.privacy && digiTrustId.privacy.optout)) {
    return {};
  }
  return {
    'dt': digiTrustId.id
  };
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['gg'], // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    const {
      params,
      adUnitCode
    } = bid;

    switch (true) {
      case !!(params.inImage): break;
      case !!(params.inScreen): break;
      case !!(params.inSlot): break;
      case !!(params['native']): break;
      default: utils.logWarn(
        `[GumGum] No product selected for the placement ${adUnitCode}` +
        ', please check your implementation.'
      );
        return false;
    }
    return true;

    // we can also check for throttle here.
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests) {
    const browserParams = _getBrowserParams();
    const bids = [];

    utils._each(validBidRequests, bidRequest => {
      const {
        // bidId,
        params = {},
        // adUnitCode,
        transactionId
      } = bidRequest;
      // const timestamp = _getTimeStamp();
      const trackingId = params.inScreen;
      const nativeId = params['native'];
      const slotId = params.inSlot;
      const timeout = config.getConfig('bidderTimeout');
      const bid = {
        tmax: timeout,
        tId: transactionId
        // we can add alot more info here like topWindorURL...
      }
      const gumgumRequest = {
        method: 'POST',
        url: BID_ENDPOINT
      }

      /* set productID in bid object to be sent to GG ad server */
      // should we make sure bids only have one of these set? Else,
      // it's kinda f'ed up because last product type takes priority.
      if (params.inImage) bid.pi = 1;
      if (params.inScreen) bid.pi = 2;
      if (params.inSlot) bid.pi = 3;
      if (params['native']) bid.pi = 5;

      /* tracking id is required for in-image and in-screen */
      if (trackingId) bid.t = trackingId;
      /* native ads require a native placement id */
      if (nativeId) bid.ni = nativeId;
      /* slot ads require a slot id */
      if (slotId) bid.si = slotId;

      const payload = Object.assign(bid, browserParams, _getDigiTrustQueryParams())
      const payloadString = JSON.stringify(payload)
      gumgumRequest.data = payloadString

      // usually we'd make the request to ad server here. We're gonna add it to an array and return
      // that. Let's see if the prebid API accepts an array of requests as return value.
      bids.push(gumgumRequest)
    });

    return bids
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, request) {
    const bidResponses = []
    // loop through serverResponses {
    const bidResponse = {
      requestId: bidRequest.bidId,
      bidderCode: spec.code,
      cpm: CPM,
      width: WIDTH,
      height: HEIGHT,
      creativeId: CREATIVE_ID,
      dealId: DEAL_ID,
      currency: CURRENCY,
      netRevenue: true,
      ttl: TIME_TO_LIVE,
      referrer: REFERER,
      ad: CREATIVE_BODY
    }
    bidResponses.push(bidResponse)
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
