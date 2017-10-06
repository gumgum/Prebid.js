import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';
const BIDDER_CODE = 'gumgum';
export const spec = {
    code: BIDDER_CODE,
    aliases: ['gg'], // short code
    /**
     * Determines whether or not the given bid request is valid.
     *
     * @param {BidRequest} bid The bid params to validate.
     * @return boolean True if this is a valid bid, and false otherwise.
     */
    isBidRequestValid: function(bid) {
      return !!(bid.params.placementId || (bid.params.member && bid.params.invCode));
    },
    /**
     * Make a server request from the list of BidRequests.
     *
     * @param {validBidRequests[]} - an array of bids
     * @return ServerRequest Info describing the request to the server.
     */
    buildRequests: function(validBidRequests[]) {
      const payload = {
        // use bidderRequest.bids[] to get bidder-dependent request info

        // if your bidder supports multiple currencies, use config.getConfig(currency)
        // to find which one the ad server needs

        // pull requested transaction ID from bidderRequest.bids[].transactionId
      };
      const payloadString = JSON.stringify(payload);
      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: payloadString,
      };
    },
    /**
     * Unpack the response from the server into a list of bids.
     *
     * @param {*} serverResponse A successful response from the server.
     * @return {Bid[]} An array of bids which were nested inside the server.
     */
    interpretResponse: function(serverResponse, request) {
      const bidResponses = [];
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
      };
      bidResponses.push(bidResponse);
      return bidResponses;
    },
    getUserSyncs: function(syncOptions) {
      if (syncOptions.iframeEnabled) {
        return [{
            type: 'iframe',
            url: 'ADAPTER_SYNC_URL'
        }];
      }
    }
}
registerBidder(spec);