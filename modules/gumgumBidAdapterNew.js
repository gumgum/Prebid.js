import * as utils from 'src/utils'
import { registerBidder } from 'src/adapters/bidderFactory'
import { config } from 'src/config'
const BIDDER_CODE = 'gumgum'
const BID_ENDPOINT = `https://g2.gumgum.com/hbid/imp`
const DT_CREDENTIALS = { member: 'YcXr87z2lpbB' }

function _getTimeStamp() {
  return new Date().getTime();
}

function _getDigiTrustQueryParams() {
  function getDigiTrustId () {
    var digiTrustUser = (window.DigiTrust && window.DigiTrust.getUser) ? window.DigiTrust.getUser(dtCredentials) : {};
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
    switch (true) {
      case !!(params.inImage): break;
      case !!(params.inScreen): break;
      case !!(params.inSlot): break;
      case !!(params['native']): break;
      default: utils.logWarn(
        `[GumGum] No product selected for the placement ${placementCode}` +
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
    const browserParams = {
      // vw: topWindow.innerWidth,
      // vh: topWindow.innerHeight,
      // sw: topScreen.width,
      // sh: topScreen.height,
      pu: utils.getTopWindowUrl(),
      ce: utils.cookiesAreEnabled(),
      // dpr: topWindow.devicePixelRatio || 1
    };

    utils._each(validBidRequests, bidRequest => {
      const { bidId
        , params = {}
        , placementCode
      } = bidRequest;
      const timestamp = _getTimeStamp();
      const trackingId = params.inScreen;
      const nativeId = params['native'];
      const slotId = params.inSlot;
      const bid = {
        // tmax: $$PREBID_GLOBAL$$.cbTimeout
      };

      /* slot/native ads need the placement id */
      switch (true) {
        case !!(params.inImage): bid.pi = 1; break;
        case !!(params.inScreen): bid.pi = 2; break;
        case !!(params.inSlot): bid.pi = 3; break;
        case !!(params['native']): bid.pi = 5; break;
        default: return utils.logWarn(
          `[GumGum] No product selected for the placement ${placementCode}` +
          ', please check your implementation.'
        );
      }

      /* throttle based on the latest request for this product */
      const productId = bid.pi;
      const requestKey = productId + '|' + placementCode;
      const throttle = throttleTable[productId];
      const latestRequest = requestCache[requestKey];
      if (latestRequest && throttle && (timestamp - latestRequest) < throttle) {
        return utils.logWarn(
          `[GumGum] The refreshes for "${placementCode}" with the params ` +
          `${JSON.stringify(params)} should be at least ${throttle / 1e3}s apart.`
        );
      }
      /* update the last request */
      requestCache[requestKey] = timestamp;

      /* tracking id is required for in-image and in-screen */
      if (trackingId) bid.t = trackingId;
      /* native ads require a native placement id */
      if (nativeId) bid.ni = nativeId;
      /* slot ads require a slot id */
      if (slotId) bid.si = slotId;

      /* include the pageViewId, if any */
      if (pageViewId) bid.pv = pageViewId;

      const cachedBid = Object.assign({
        placementCode,
        id: bidId
      }, bid);

      const callback = { jsonp: `$$PREBID_GLOBAL$$.handleGumGumCB['${bidId}']` };
      CALLBACKS[bidId] = _handleGumGumResponse(cachedBid);
      const query = Object.assign(callback, browserParams, bid, _getDigiTrustQueryParams());
      const bidCall = `${bidEndpoint}?${utils.parseQueryStringParameters(query)}`;
      adloader.loadScript(bidCall);
    });


    const payload = {
      // use bidderRequest.bids[] to get bidder-dependent request info
      // if your bidder supports multiple currencies, use config.getConfig(currency)
      // to find which one the ad server needs
      // pull requested transaction ID from bidderRequest.bids[].transactionId
    }
    const payloadString = JSON.stringify(payload)
    return {
      method: 'POST',
      url: BID_ENDPOINT,
      data: payloadString
    }
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
