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

function _getTimeStamp() {
  return new Date().getTime();
}

// TODO: tell Mario about potential 0 values for browserParams
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

// GG Functions
/**
 * Alias for createElement
 * @param {String} s HTML Tag name
 * @return {Node}
 */
function newEl (s) {
  return document.createElement(s)
}
/**
 * Adds a node to an element
 * @param {Node} parent Parent node to which add the specificed node
 * @param {Node} node   Node to be added
 */
function addNode (parent, node) {
  return parent.appendChild(node)
}
/**
 * Removes a node
 * @param  {Node} parent Parent node from where the specified node is removed
 * @param  {Node} node   node to be removed
 * @return {Node}        Removed node, or null if parent not found
 */
function rmNode (parent, node) {
  parent = parent || node.parentNode
  return parent ? parent.removeChild(node) : null
}
/**
 * Converts node list to array
 * @param {NodeList} x
 * @param {Number} start
 * @param {Number} end
 * @returns {Array}
 */
function toArray (x, start, end) {
  return [].slice.call(x, start, end)
}
/**
 * Gets elements by classname
 * @param  {String} className Classname to find elements
 * @param  {Node} context The element who's subtree will be searched, defaults to document.
 * @return {Array}            Set of elements
 */
function byClass (className, context) {
  var base = context || document
  return base.getElementsByClassName(className)
}
/**
 * Gets elements by selector
 * @param  {String} selector CSS selector to find elements
 * @param  {Node} context The element who's subtree will be searched, defaults to document.
 * @return {Array}
 */
function bySelector (selector, context) {
  var base = context || document
  var response = []
  try {
    response = toArray(base.querySelectorAll(selector))
  } catch (err) {
    utils.logWarn(selector, 'invalid CSS selector: "' + selector + '"')
  }
  return response
}
/**
 * Reset HTML/CSS strings
 * @param {String} html
 * @returns {String}
 */
function resetHTML (html) {
  return html.replace(/_CLEARCSS_/g, 'margin:0;padding:0;position:static;outline:0;background:transparent none;border:none;overflow:visible;visibility:visible;filter:alpha(opacity=100);opacity:1;box-sizing:content-box;-moz-box-sizing:content-box;text-decoration:none;font:normal 12px/1 arial;text-shadow:none;box-shadow:none;color:#000;text-align:left;vertical-align:top;float:none;max-width:none;max-height:none')
}
/**
 * Creates an empty domain-less iframe element
 * @param  {Boolean} visible  Wheter or not create an iframe that its visible, false by default
 * @return {Node}             Iframe Element
 */
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
/**
 * injects HTML strings into an IFRAME and attach it or replace to a particular node
 * @param  {String} html       Html to inject into iframe
 * @param  {Node} targetNode Where to inject the iframe
 * @return {[type]}            [description]
 */
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
      utils.logError('iframeHTML error: contentDocument not found', html, targetNode, replace)
    }
  }, 50)
  return iframe
}
// parse HTML strings and return topmost element or specified children
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
  html = resetHTML(html).replace(legacyToken, '<!--[iframe]-->').replace(legacyToken, '<!--[/iframe]-->')
  while ((sandbox = iframeToken.exec(html)) !== null) {
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
/**
 * Introduce a cache buster paramer to a given URL.  if the URL doesn't
 * include the macro {CACHEBUSTER}, the parameter gets appended.
 * @param {String} url
 * @return {String}
 */
function bustCache (url) {
  var cacheToken = /\{CACHEBUSTER\}/g
  var timestamp = _getTimeStamp()
  return cacheToken.test(url)
    ? url.replace(cacheToken, timestamp)
    : url + (~url.indexOf('?') ? '&' : '?') + '_' + timestamp
}
/**
 * Loads script, html or image resources
 * @param  {String} data Can be url or html string
 * @param  {Object} ops  Options used to load the resource
 * @return {Mixed}
 */
function loadObj (data, ops) {
  var O = null
  var rops = ops || {}
  var parent = rops.parent || document.body
  var callback = rops.callback || false
  var preserve = rops.preserve
  var type = rops.type || false
  var delay = rops.delay || 10
  var needsCacheBuster = rops.cb !== false
  var allowTagInsertion = true
  var doCallback = function () {
    return (callback && 'call' in callback) ? callback() : true
  }
  var onLoaded = function (evt) {
    O.onload = O.onreadystatechange = O.onerror = null
    if ('clearAttributes' in O) {
      O.clearAttributes()
    }
    while (O.lastChild) {
      rmNode(O, O.lastChild)
    }
    if (O.parentNode && !preserve) {
      rmNode(false, O)
    }
    doCallback()
  }
  var onStatus = function (rs) {
    if (!(rs = O.readyState) || rs === 'complete' || rs === 'loaded' || rs === 4) {
      onLoaded()
    }
  }
  var attachNode = function () {
    O.src = needsCacheBuster ? bustCache(data) : data
    if (allowTagInsertion) {
      addNode(parent, O)
    }
  }
  if (!type) return false
  switch (true) {
    // HTML, will parse/attach html and return on-callback
    case ((type === 'h' || type === 'html')):
      try {
        // Bugfix for IE<10
        data = parseHTML(data, '*')
        for (var i = 0, len = data.length; i < len; i++) {
          addNode(parent, data[i])
        }
        return doCallback()
      } catch (error) {
        return
      }
      // break
      // Non-html types
    case ((type === 'i' || type === 'img')):
      allowTagInsertion = false
      O = new window.Image(1, 1)
      break
    case ((type === 's' || type === 'scr' || type === 'script')):
      O = document.createElementNS ? document.createElementNS('http://www.w3.org/1999/xhtml', 'script') : newEl('script')
      O.setAttribute('async', true)
      O.setAttribute('data-cfasync', false)
      O.setAttribute('type', 'text/javascript')
      break
    default:
      O = newEl('iframe')
      preserve = true
      break
  }
  O.style.display = 'none'
  O.onload = (O.onreadystatechange = (O.onerror = onStatus))
  setTimeout(attachNode, delay)
  return true
}

function getPageReferrer () {
  return document ? document.referrer : ''
}
/**
 * Loads a batch of pixels
 * @param {Array}  passedPixels Set of pixels
 * @param {Object} options   Options
 *                 - evt    Type of event to load, loads all if this is
 *                          not especified
 *                 - gguid  Dynamic id for the ad
 *                 - parent Target element to insert the pixel,
 *                          if the pixel requires an iframe, this
 *                          option is ignored and a common pixel
 *                          container is used. See pxIframe
 * */
function loadPixels (passedPixels, options) {
  var ii = 0
  var pixel = NULL
  var pixels = passedPixels || []
  var opts = options || {}
  var pixelsLen = pixels.length || 0
  var event = opts.evt
  var parent = opts.parent
  var uid = opts.gguid
  var targetElement
  for (; ii < pixelsLen; ii++) {
    pixel = pixels[ii]
    if (pixel.u && (!event || pixel.e === event)) {
      targetElement = (pixel.i || !parent) ? pxIframe.contentDocument.body : parent
      loadObj(pixel.u.replace(/GGUID/ig, uid || ii), {
        parent: targetElement,
        type: pixel.t
      })
    }
  }
}

// ctrl looks like:
// { "ad": {
//     "id":29593,"width":300,"height":250,"ipd":2000,
//     "markup":"<div style=\"width:298px;height:248px;background:#fff;display:block;border:1px solid #000;background:#fff url(https://c.gumgum.com/images/logo/all300.png) no-repeat scroll center center\">\n<\/div>",
//     "ii":true,"du":null,"price":0,"zi":0,"impurl":"http://g2.gumgum.com/ad/view/enc/hasR4Y3aDoKInNYRxCfOp-Uatqav0e1WSxsJC3CiKrFfhtakxmere2ERa4j35oUrNAublFiGMylKDwnwgsXDw5tG6aNoB5VPCj0CL99KMqM6PqjltEdAYxCSOQDitoBjohKQICAWAZRKpz1SOa6uR-RyuIVXcvFYgEK_iQJhuGewnqk5IaAf0-IQOOKeWMIWn37LP2n2Vn0",
//     "clsurl":"http://g2.gumgum.com/ad/close?si=9&t=ggumtest&ab=29593&pv=6dc78451-c176-49be-9677-9a8c46e7727b&pu=http%3A%2F%2Flocalhost%3A9876%2F%3Fid%3D27669636&lt=&to=&ts=1507855248852&er=0.00"
//   },"pag": {
//       "t":"ggumtest","pvid":"6dc78451-c176-49be-9677-9a8c46e7727b","css":"#GGID ._gBadge._g.Badge {\n    z-index: 1000 !important;\n}\n\n/* DB-4066 */\nhtml { overflow-y: auto }","js":"G.infoFlag = 'japan';\n/* GG-18932 */\nG.samplerate = 100;\nG.loadObj('https://c.gumgum.com/libs/GG-18932.min.js',{type:'s',cb:false});\n/* AT-5020 */\nG.perfSampleRate = 100;\nconsole.log(\"environment\", env);"
//     },"thms":10000
// }

// this just gets passed the ctrl as data, and 'window' as origin.
// Things we are NOT doing:
//   hover tracking,
//   badge
//   viewability tracking
//   pixel dropping other than impurl
function pbjsInSlot (data, origin) {
  var ad = data.ad
  // var pag = data.pag
  var width = ad.width
  var height = ad.height
  var inIframe = ad.ii
  var ipu = ad.impurl
  // var clu = ad.clsurl
  // var scr = data.scr
  var markup = ad.markup
  var uid = 'ad_slot_' + (_getTimeStamp())
  // var adid = ad.id
  // var pageURL = utils.getTopWindowUrl()
  var adUnit
  var sandbox = origin.window.document
  var container = sandbox.createElement('div')
  // build the placement inside the prebid iframe
  container.setAttribute('style', 'width:' + width + 'px' + ';height:' + height + 'px')
  addNode(sandbox.body, container)

  if (ad) {
    markup = markup.replace(/GGUID/g, uid)
    if (inIframe && !/<!--iframe-->/im.test(adMarkup)) {
      adUnit = iframeHTML(markup, container)
    } else {
      adUnit = parseHTML('<div style=\'display:block;width:100%;height:100%\'>' + markup + '</div>')
      addNode(container, adUnit)
    }
    addNode(container, parseHTML('<img src="https://c.gumgum.com/images/pixel.gif" class="ad-standalone-img" style="display:none;visibility:hidden;">'))

    // Trigger impression
    utils.triggerPixel(ipu)
    // if (scr) {
    //   loadPixels(ad.scr, { evt: 'IMPRESSION', gguid: that.uid, parent: that.container })
    // }
  }
}

var inSlotLoader = `<!doctype html><body></body><script>
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
})(${JSON.stringify(data)}, window)
<\/script>`;

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
        bidId,
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
        tId: transactionId,
        id: bidId
        // we can add alot more info here like topWindorURL...
      }
      const gumgumRequest = {
        method: 'GET'
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

      const query = Object.assign(browserParams, bid, _getDigiTrustQueryParams());
      const bidCall = `${BID_ENDPOINT}?${utils.parseQueryStringParameters(query)}`;

      gumgumRequest.url = bidCall

      // usually we'd make the request to ad server here. We're gonna add it to an array and return
      // that. Let's see if the prebid API accepts an array of requests as return value.
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
  interpretResponse: function (serverResponse, request) {
    const bidResponses = []
    const {
      id,
      ad: {
        price: cpm,
        width,
        height,
        id: creativeId,
        markup
      }
    } = serverResponse

    // we have to determine what product the request was for to know which ad render function
    // to put in gumgumAdLoader.

    const bidResponse = {
      id,
      bidderCode: spec.code,
      cpm,
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
