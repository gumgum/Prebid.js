import * as utils from 'src/utils'
import { registerBidder } from 'src/adapters/bidderFactory'
import { config } from 'src/config'
const BIDDER_CODE = 'gumgum'
const BID_ENDPOINT = `https://g2.gumgum.com/hbid/imp`
const DT_CREDENTIALS = { member: 'YcXr87z2lpbB' }
let browserParams = {};
const requestCache = {};
const throttleTable = {};
const defaultThrottle = 3e4;
let pageViewId = ''

function _getTimeStamp() {
  return new Date().getTime();
}
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
    return browserParams
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
    let digiTrustUser = window.DigiTrust && (config.getConfig('digiTrustId') || window.DigiTrust.getUser(DT_CREDENTIALS));
    return (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || '';
  };

  let digiTrustId = getDigiTrustId();
  // Verify there is an ID and this user has not opted out
  if (!digiTrustId || (digiTrustId.privacy && digiTrustId.privacy.optout)) {
    return {};
  }
  return {
    'dti': digiTrustId.id,
    'dtk': digiTrustId.keyv
  };
}

function b64Encode(data) {
  return window.btoa(JSON.stringify(data))
}
// Things we are NOT doing yet:
//   hover tracking,
//   badge
//   viewability tracking
//   pixel dropping other than impurl
function inSlotLoader (resp) {
  var loader = `<!doctype html><body></body><script>
  function newEl (s) {
    return document.createElement(s)
  }
  function addNode (parent, node) {
    return parent.appendChild(node)
  }
  function rmNode (parent, node) {
    parent = parent || node.parentNode
    return parent ? parent.removeChild(node) : null
  }
  function toArray (x, start, end) {
    return [].slice.call(x, start, end)
  }
  function byClass (className, context) {
    var base = context || document
    return base.getElementsByClassName(className)
  }
  function bySelector (selector, context) {
    var base = context || document
    var response = []
    try {
      response = toArray(base.querySelectorAll(selector))
    } catch (err) {
      console.log('invalid CSS selector: "' + selector + '"')
    }
    return response
  }
  function resetHTML (html) {
    return html.replace(/_CLEARCSS_/g, 'margin:0;padding:0;position:static;outline:0;background:transparent none;border:none;overflow:visible;visibility:visible;filter:alpha(opacity=100);opacity:1;box-sizing:content-box;-moz-box-sizing:content-box;text-decoration:none;font:normal 12px/1 arial;text-shadow:none;box-shadow:none;color:#000;text-align:left;vertical-align:top;float:none;max-width:none;max-height:none')
  }
  function createSafeFrame (visible) {
    var iframe = newEl('iframe')
    iframe.allowTransparency = 1
    iframe.frameBorder = 0
    iframe.scrolling = 'no'
    iframe.title = 'Advertisement'
    // exluding allow-orientation-lock and allow-top-navigation
    iframe.sandbox = 'allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts'
    iframe.src = 'about:blank'
    if (visible) {
      iframe.width = (iframe.height = '100%')
    } else {
      iframe.width = (iframe.height = '0')
      iframe.style.display = 'none'
    }
    return iframe
  }
  function iframeHTML (html, targetNode, replace) {
    var iframe = createSafeFrame(true)
    var clearhtml = resetHTML(html)
    // node or selector
    if (targetNode && !targetNode.nodeType) {
      targetNode = [bySelector(targetNode) || [false]][0]
    }
    // break on no node
    if (!targetNode) {
      return false
    }
    // replace or append
    if (replace && targetNode.parentNode) {
      targetNode.parentNode.replaceChild(iframe, targetNode)
    } else {
      addNode(targetNode, iframe)
    }
    // let the iframe be built, then inject html
    setTimeout(function () {
      var idoc = iframe.contentDocument
      if (idoc) {
        idoc.open('text/html', 'replace')
        idoc.write('<!DOCTYPE html><br style="display:none;"><style>*{padding:0;margin:0;background:transparent none;border:none;font-size:0}</style>' + clearhtml)
        setTimeout(function () {
          idoc.close()
        }, 50)
      } else {
        console.log('iframeHTML error: contentDocument not found', html, targetNode, replace)
      }
    }, 50)
    return iframe
  }
  function parseHTML (html, elementIndex) {
    var tmp = newEl('span')
    var finalElement = null
    var sandbox = null
    var matches = []
    var content = []
    var it = null
    var len = null
    elementIndex = elementIndex || 0
    // legacy support
    html = resetHTML(html)
    while ((sandbox = /(?:<!--\[iframe\]-->)\s*([\s\S]*?)\s*(?:<!--\[\/iframe\]-->)/gmi.exec(html)) !== null) {
      matches.push(sandbox[0])
      content.push(sandbox[1])
    }
    for (it = 0, len = matches.length; it < len; it++) {
      html = html.replace(matches[it], '<div class="gumgum-ifr-' + it + '"></div>')
    }
    tmp.innerHTML = html
    for (it = 0; it < len; it++) {
      iframeHTML(content[it], byClass('gumgum-ifr-' + it, tmp)[0], true)
    }
    if (elementIndex === '*') {
      finalElement = toArray(tmp.childNodes)
    } else if (tmp && tmp.children[elementIndex]) {
      finalElement = rmNode(tmp, tmp.children[elementIndex])
    } else {
      throw new Error('Invalid parseHTML return Node')
    }
    tmp = null
    return finalElement
  }
  function triggerPixel (url) {
    const img = new Image();
    img.src = url;
  }
  (function (data, origin) {
    var data = JSON.parse(window.atob(data))
    var ad = data.ad
    var width = ad.width
    var height = ad.height
    var inIframe = ad.ii
    var ipu = ad.impurl
    var markup = ad.markup
    var uid = 'ad_slot_' + (Date.now())
    var adUnit
    var sandbox = origin.document
    var container = sandbox.createElement('div')
    // build the placement inside the prebid iframe
    container.setAttribute('style', 'width:' + width + 'px' + ';height:' + height + 'px')
    addNode(sandbox.body, container)

    if (ad) {
      markup = markup.replace(/GGUID/g, uid)
      if (inIframe && !/<!--iframe-->/im.test(markup)) {
        adUnit = iframeHTML(markup, container)
      } else {
        adUnit = parseHTML('<div style="display:block;width:100%;height:100%">' + markup + '</div>')
        addNode(container, adUnit)
      }
      addNode(container, parseHTML('<img src="https://c.gumgum.com/images/pixel.gif" class="ad-standalone-img" style="display:none;visibility:hidden;">'))

      // Trigger impression
      triggerPixel(ipu)
    }
  })("${b64Encode(resp)}", window)
  <\/script>`
  return loader
}
function inScreenLoader (resp) {
  var encodedResponse = b64Encode(resp)
  return resp.isw.replace(/HB_DATA/i, encodedResponse)
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['gg'],
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
    const timestamp = _getTimeStamp();
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
      const {
        bidId,
        params = {},
        transactionId
      } = bidRequest;
      const trackingId = params.inScreen;
      const slotId = params.inSlot;
      const timeout = config.getConfig('bidderTimeout');
      const bid = {
        tmax: timeout,
        tId: transactionId,
        id: bidId
      }
      const gumgumRequest = {
        id: bidId,
        url: BID_ENDPOINT,
        method: 'GET'
      }

      /* set productID in bid object to be sent to GG ad server */
      if (params.inScreen) bid.pi = 2;
      if (params.inSlot) bid.pi = 3;

      /* tracking id is required for in-screen */
      if (trackingId) bid.t = trackingId;
      /* slot ads require a slot id */
      if (slotId) bid.si = slotId;

      /* include the pageViewId, if any */
      if (pageViewId) bid.pv = pageViewId;

      gumgumRequest.data = Object.assign(bid, _getBrowserParams(), _getDigiTrustQueryParams())
      gumgumRequest.pi = bid.pi
      bids.push(gumgumRequest)
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
        markup
      },
      pag,
      thms: throttle
    } = serverResponse
    const { pi } = bidRequest
    let ad = ''

    if (!markup) {
      return bidResponses
    }

    // we have to determine what product the request was for to know which loader to use.
    // for now use inSlotLoader
    switch (pi) {
      // do nothing for inscreen as we will wrap it at server level?
      case 2: ad = inScreenLoader(serverResponse); break
      case 3: ad = inSlotLoader(serverResponse)
    }

    /* cache the pageViewId */
    if (pag && pag.pvid) pageViewId = pag.pvid;

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
      // currency: CURRENCY,
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
