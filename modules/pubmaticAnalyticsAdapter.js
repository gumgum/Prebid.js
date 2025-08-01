import {_each, isArray, isStr, logError, logWarn, pick, generateUUID} from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { BID_STATUS, EVENTS, STATUS, REJECTION_REASON } from '../src/constants.js';
import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {getGptSlotInfoForAdUnitCode} from '../libraries/gptUtils/gptUtils.js';

const FLOOR_VALUES = {
  NO_DATA: 'noData',
  AD_UNIT: 'adUnit',
  SET_CONFIG: 'setConfig',
  FETCH: 'fetch',
  SUCCESS: 'success',
  ERROR: 'error',
  TIMEOUT: 'timeout'
};

/// /////////// CONSTANTS ///////////////
const ADAPTER_CODE = 'pubmatic';
const VENDOR_OPENWRAP = 'openwrap';
const DISPLAY_MANAGER = 'Prebid.js';
const SEND_TIMEOUT = 2000;
const END_POINT_HOST = 'https://t.pubmatic.com/';
const END_POINT_BID_LOGGER = END_POINT_HOST + 'wl?';
const END_POINT_WIN_BID_LOGGER = END_POINT_HOST + 'wt?';
const LOG_PRE_FIX = 'PubMatic-Analytics: ';
const cache = {
  auctions: {}
};
const SUCCESS = 'success';
const NO_BID = 'no-bid';
const ERROR = 'error';
const REQUEST_ERROR = 'request-error';
const TIMEOUT_ERROR = 'timeout-error';
const EMPTY_STRING = '';
const OPEN_AUCTION_DEAL_ID = '-1';
const MEDIA_TYPE_BANNER = 'banner';
const CURRENCY_USD = 'USD';
const BID_PRECISION = 2;
// todo: input profileId and profileVersionId ; defaults to zero or one
const DEFAULT_PUBLISHER_ID = 0;
const DEFAULT_PROFILE_ID = 0;
const DEFAULT_PROFILE_VERSION_ID = 0;
const enc = window.encodeURIComponent;
const MEDIATYPE = {
  BANNER: 0,
  VIDEO: 1,
  NATIVE: 2
}

// TODO : Remove - Once BM calculation moves to Server Side
const BROWSER_MAP = [
  { value: /(firefox)\/([\w.]+)/i, key: 12 }, // Firefox
  { value: /\b(?:crios)\/([\w.]+)/i, key: 1 }, // Chrome for iOS
  { value: /edg(?:e|ios|a)?\/([\w.]+)/i, key: 2 }, // Edge
  { value: /(opera|opr)(?:.+version\/|[/ ]+)([\w.]+)/i, key: 3 }, // Opera
  { value: /(?:ms|\()(ie) ([\w.]+)|(?:trident\/[\w.]+)/i, key: 4 }, // Internet Explorer
  { value: /fxios\/([-\w.]+)/i, key: 5 }, // Firefox for iOS
  { value: /((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w.]+);)/i, key: 6 }, // Facebook In-App Browser
  { value: / wv\).+(chrome)\/([\w.]+)/i, key: 7 }, // Chrome WebView
  { value: /droid.+ version\/([\w.]+)\b.+(?:mobile safari|safari)/i, key: 8 }, // Android Browser
  { value: /(chrome|chromium|crios)\/v?([\w.]+)/i, key: 9 }, // Chrome
  { value: /version\/([\w.,]+) .*mobile\/\w+ (safari)/i, key: 10 }, // Safari Mobile
  { value: /version\/([\w(.|,]+) .*(mobile ?safari|safari)/i, key: 11 }, // Safari
];

/// /////////// VARIABLES //////////////
let publisherId = DEFAULT_PUBLISHER_ID; // int: mandatory
let profileId = DEFAULT_PROFILE_ID; // int: optional
let profileVersionId = DEFAULT_PROFILE_VERSION_ID; // int: optional
let s2sBidders = [];

/// /////////// HELPER FUNCTIONS //////////////

function sizeToDimensions(size) {
  return {
    width: size.w || size[0],
    height: size.h || size[1]
  };
}

function validMediaType(type) {
  return ({'banner': 1, 'native': 1, 'video': 1}).hasOwnProperty(type);
}

function formatSource(src) {
  if (typeof src === 'undefined') {
    src = 'client';
  } else if (src === 's2s') {
    src = 'server';
  }
  return src.toLowerCase();
}

function setMediaTypes(types, bid) {
  if (bid.mediaType && validMediaType(bid.mediaType)) {
    return [bid.mediaType];
  }
  if (Array.isArray(types)) {
    return types.filter(validMediaType);
  }
  if (typeof types === 'object') {
    if (!bid.sizes) {
      bid.dimensions = [];
      _each(types, (type) => {
        bid.dimensions = bid.dimensions.concat(
          type.sizes.map(sizeToDimensions)
        );
      });
    }
    return Object.keys(types).filter(validMediaType);
  }
  return [MEDIA_TYPE_BANNER];
}

function copyRequiredBidDetails(bid) {
  return pick(bid, [
    'bidder',
    'bidderCode',
    'adapterCode',
    'bidId',
    'status', () => NO_BID, // default a bid to NO_BID until response is received or bid is timed out
    'finalSource as source',
    'params',
    'floorData',
    'adUnit', () => pick(bid, [
      'adUnitCode',
      'transactionId',
      'sizes as dimensions', sizes => sizes && sizes.map(sizeToDimensions),
      'mediaTypes', (types) => setMediaTypes(types, bid)
    ])
  ]);
}

function setBidStatus(bid, status) {
  switch (status) {
    case STATUS.GOOD:
      bid.status = SUCCESS;
      delete bid.error; // it's possible for this to be set by a previous timeout
      break;
    default:
      bid.status = ERROR;
      bid.error = {
        code: REQUEST_ERROR
      };
  }
}

function parseBidResponse(bid) {
  return pick(bid, [
    'bidPriceUSD', () => {
      // todo: check whether currency cases are handled here
      if (typeof bid.currency === 'string' && bid.currency.toUpperCase() === CURRENCY_USD) {
        return window.parseFloat(Number(bid.cpm).toFixed(BID_PRECISION));
      }
      // use currency conversion function if present
      if (typeof bid.getCpmInNewCurrency === 'function') {
        return window.parseFloat(Number(bid.getCpmInNewCurrency(CURRENCY_USD)).toFixed(BID_PRECISION));
      }
      logWarn(LOG_PRE_FIX + 'Could not determine the Net cpm in USD for the bid thus using bid.cpm', bid);
      return bid.cpm
    },
    'bidGrossCpmUSD', () => {
      if (typeof bid.originalCurrency === 'string' && bid.originalCurrency.toUpperCase() === CURRENCY_USD) {
        return window.parseFloat(Number(bid.originalCpm).toFixed(BID_PRECISION));
      }
      // use currency conversion function if present
      if (typeof getGlobal().convertCurrency === 'function') {
        return window.parseFloat(Number(getGlobal().convertCurrency(bid.originalCpm, bid.originalCurrency, CURRENCY_USD)).toFixed(BID_PRECISION));
      }
      logWarn(LOG_PRE_FIX + 'Could not determine the Gross cpm in USD for the bid, thus using bid.originalCpm', bid);
      return bid.originalCpm
    },
    'dealId',
    'currency',
    'cpm', () => window.parseFloat(Number(bid.cpm).toFixed(BID_PRECISION)),
    'originalCpm', () => window.parseFloat(Number(bid.originalCpm).toFixed(BID_PRECISION)),
    'originalCurrency',
    'adserverTargeting',
    'dealChannel',
    'meta',
    'status',
    'error',
    'bidId',
    'mediaType',
    'params',
    'floorData',
    'mi',
    'regexPattern', () => bid.regexPattern || undefined,
    'partnerImpId', // partner impression ID
    'dimensions', () => pick(bid, [
      'width',
      'height'
    ])
  ]);
}

function getDomainFromUrl(url) {
  const a = window.document.createElement('a');
  a.href = url;
  return a.hostname;
}

function getDevicePlatform() {
  var deviceType = 3;
  try {
    var ua = navigator.userAgent;
    if (ua && isStr(ua) && ua.trim() != '') {
      ua = ua.toLowerCase().trim();
      var isMobileRegExp = new RegExp('(mobi|tablet|ios).*');
      if (ua.match(isMobileRegExp)) {
        deviceType = 2;
      } else {
        deviceType = 1;
      }
    }
  } catch (ex) {}
  return deviceType;
}

// TODO : Remove - Once BM calculation moves to Server Side
function getBrowserType() {
  const userAgent = navigator?.userAgent;
  let browserIndex = userAgent == null ? -1 : 0;

  if (userAgent) {
    browserIndex = BROWSER_MAP.find(({ value }) => value.test(userAgent))?.key || 0;
  }
  return browserIndex;
}

function getValueForKgpv(bid, adUnitId) {
  if (bid.params && bid.params.regexPattern) {
    return bid.params.regexPattern;
  } else if (bid.bidResponse && bid.bidResponse.regexPattern) {
    return bid.bidResponse.regexPattern;
  } else if (bid.params && bid.params.kgpv) {
    return bid.params.kgpv;
  } else {
    return adUnitId;
  }
}

function getAdapterNameForAlias(aliasName) {
  return adapterManager.aliasRegistry[aliasName] || aliasName;
}

function getAdDomain(bidResponse) {
  if (bidResponse.meta && bidResponse.meta.advertiserDomains) {
    const adomain = bidResponse.meta.advertiserDomains[0]
    if (adomain) {
      try {
        const hostname = (new URL(adomain));
        return hostname.hostname.replace('www.', '');
      } catch (e) {
        logWarn(LOG_PRE_FIX + 'Adomain URL (Not a proper URL):', adomain);
        return adomain.replace('www.', '');
      }
    }
  }
}

function isObject(object) {
  return typeof object === 'object' && object !== null;
};

function isEmptyObject(object) {
  return isObject(object) && Object.keys(object).length === 0;
};

/**
 * Prepare meta object to pass in logger call
 * @param {*} meta
 */
export function getMetadata(meta) {
  if (!meta || isEmptyObject(meta)) return;
  const metaObj = {};
  if (meta.networkId) metaObj.nwid = meta.networkId;
  if (meta.advertiserId) metaObj.adid = meta.advertiserId;
  if (meta.networkName) metaObj.nwnm = meta.networkName;
  if (meta.primaryCatId) metaObj.pcid = meta.primaryCatId;
  if (meta.advertiserName) metaObj.adnm = meta.advertiserName;
  if (meta.agencyId) metaObj.agid = meta.agencyId;
  if (meta.agencyName) metaObj.agnm = meta.agencyName;
  if (meta.brandId) metaObj.brid = meta.brandId;
  if (meta.brandName) metaObj.brnm = meta.brandName;
  if (meta.dchain) metaObj.dc = meta.dchain;
  if (meta.demandSource) metaObj.ds = meta.demandSource;
  if (meta.secondaryCatIds) metaObj.scids = meta.secondaryCatIds;

  if (isEmptyObject(metaObj)) return;
  return metaObj;
}

function isS2SBidder(bidder) {
  return (s2sBidders.indexOf(bidder) > -1) ? 1 : 0
}

function isOWPubmaticBid(adapterName) {
  const s2sConf = config.getConfig('s2sConfig');
  const s2sConfArray = s2sConf ? (isArray(s2sConf) ? s2sConf : [s2sConf]) : [];
  return s2sConfArray.some(conf => {
    if (adapterName === ADAPTER_CODE && conf.defaultVendor === VENDOR_OPENWRAP &&
      conf.bidders.indexOf(ADAPTER_CODE) > -1) {
      return true;
    }
  })
}

function getFloorsCommonField (floorData) {
  if (!floorData) return;
  const { location, fetchStatus, floorProvider, modelVersion } = floorData;
  return {
    ffs: {
      [FLOOR_VALUES.SUCCESS]: 1,
      [FLOOR_VALUES.ERROR]: 2,
      [FLOOR_VALUES.TIMEOUT]: 4,
      undefined: 0
    }[fetchStatus],
    fsrc: {
      [FLOOR_VALUES.FETCH]: 2,
      [FLOOR_VALUES.NO_DATA]: 0,
      [FLOOR_VALUES.AD_UNIT]: 1,
      [FLOOR_VALUES.SET_CONFIG]: 1
    }[location],
    fp: floorProvider,
    mv: modelVersion
  }
}

function getFloorType(floorResponseData) {
  return floorResponseData ? (floorResponseData.enforcements.enforceJS == false ? 0 : 1) : undefined;
}

function gatherPartnerBidsForAdUnitForLogger(adUnit, adUnitId, highestBid, e) {
  highestBid = (highestBid && highestBid.length > 0) ? highestBid[0] : null;
  return Object.keys(adUnit.bids).reduce(function(partnerBids, bidId) {
    adUnit.bids[bidId].forEach(function(bid) {
      const adapterName = getAdapterNameForAlias(bid.adapterCode || bid.bidder);
      if (isOWPubmaticBid(adapterName) && isS2SBidder(bid.bidder)) {
        return;
      }
      const pg = window.parseFloat(Number(bid.bidResponse?.adserverTargeting?.hb_pb || bid.bidResponse?.adserverTargeting?.pwtpb).toFixed(BID_PRECISION));

      const prebidBidsReceived = e?.bidsReceived;
      if (isArray(prebidBidsReceived) && prebidBidsReceived.length > 0) {
        prebidBidsReceived.forEach(function(iBid) {
          if (iBid.adId === bid.adId) {
            bid.bidderCode = iBid.bidderCode;
          }
        });
      }

      partnerBids.push({
        'pn': adapterName,
        'bc': bid.bidderCode || bid.bidder,
        'bidid': bid.bidId || bidId,
        'origbidid': bid?.bidResponse?.partnerImpId || bid?.bidResponse?.prebidBidId || bid.bidId || bidId,
        'db': bid.bidResponse ? 0 : 1,
        'kgpv': getValueForKgpv(bid, adUnitId),
        'kgpsv': bid.params && bid.params.kgpv ? bid.params.kgpv : adUnitId,
        'psz': bid.bidResponse ? (bid.bidResponse.dimensions.width + 'x' + bid.bidResponse.dimensions.height) : '0x0',
        'eg': bid.bidResponse ? bid.bidResponse.bidGrossCpmUSD : 0,
        'en': bid.bidResponse ? bid.bidResponse.bidPriceUSD : 0,
        'di': bid.bidResponse ? (bid.bidResponse.dealId || OPEN_AUCTION_DEAL_ID) : OPEN_AUCTION_DEAL_ID,
        'dc': bid.bidResponse ? (bid.bidResponse.dealChannel || EMPTY_STRING) : EMPTY_STRING,
        'l1': bid.bidResponse ? bid.partnerTimeToRespond : 0,
        'ol1': bid.bidResponse ? bid.clientLatencyTimeMs : 0,
        'l2': 0,
        'adv': bid.bidResponse ? getAdDomain(bid.bidResponse) || undefined : undefined,
        'ss': isS2SBidder(bid.bidder),
        't': (bid.status == ERROR && bid.error.code == TIMEOUT_ERROR) ? 1 : 0,
        'wb': (highestBid && highestBid.adId === bid.adId ? 1 : 0),
        'mi': bid.bidResponse ? (bid.bidResponse.mi || undefined) : undefined,
        'af': bid.bidResponse ? (bid.bidResponse.mediaType || undefined) : undefined,
        'ocpm': bid.bidResponse ? (bid.bidResponse.originalCpm || 0) : 0,
        'ocry': bid.bidResponse ? (bid.bidResponse.originalCurrency || CURRENCY_USD) : CURRENCY_USD,
        'frv': bid.bidResponse ? bid.bidResponse.floorData?.floorRuleValue : undefined,
        'fv': bid.bidResponse ? bid.bidResponse.floorData?.floorValue : undefined,
        'md': bid.bidResponse ? getMetadata(bid.bidResponse.meta) : undefined,
        'pb': pg || undefined
      });
    });
    return partnerBids;
  }, [])
}

function getSizesForAdUnit(adUnit) {
  var bid = Object.values(adUnit.bids).filter((bid) => !!bid.bidResponse && bid.bidResponse.mediaType === 'native')[0];
  if (!!bid || (bid === undefined && adUnit.dimensions.length === 0)) {
    return ['1x1'];
  } else {
    return adUnit.dimensions.map(function (e) {
      return e[0] + 'x' + e[1];
    })
  }
}

function getAdUnitAdFormats(adUnit) {
  var af = adUnit ? Object.keys(adUnit.mediaTypes || {}).map(format => MEDIATYPE[format.toUpperCase()]) : [];
  return af;
}

function getAdUnit(adUnits, adUnitId) {
  return adUnits.filter(adUnit => (adUnit.divID && adUnit.divID == adUnitId) || (adUnit.code == adUnitId))[0];
}

function getTgId() {
  var testGroupId = parseInt(config.getConfig('testGroupId') || 0);
  if (testGroupId <= 15 && testGroupId >= 0) {
    return testGroupId;
  }
  return 0;
}

function getFloorFetchStatus(floorData) {
  if (!floorData?.floorRequestData) {
    return false;
  }
  const { location, fetchStatus } = floorData?.floorRequestData;
  const isDataValid = location !== FLOOR_VALUES.NO_DATA;
  const isFetchSuccessful = location === FLOOR_VALUES.FETCH && fetchStatus === FLOOR_VALUES.SUCCESS;
  const isAdUnitOrSetConfig = location === FLOOR_VALUES.AD_UNIT || location === FLOOR_VALUES.SET_CONFIG;
  return isDataValid && (isAdUnitOrSetConfig || isFetchSuccessful);
}

function getListOfIdentityPartners() {
  const namespace = getGlobal();
  const publisherProvidedEids = namespace.getConfig("ortb2.user.eids") || [];
  const availableUserIds = namespace.adUnits[0]?.bids[0]?.userId || {};
  const identityModules = namespace.getConfig('userSync')?.userIds || [];
  const identityModuleNameMap = identityModules.reduce((mapping, module) => {
    if (module.storage?.name) {
      mapping[module.storage.name] = module.name;
    }
    return mapping;
  }, {});

  const userIdPartners = Object.keys(availableUserIds).map(storageName =>
    identityModuleNameMap[storageName] || storageName
  );

  const publisherProvidedEidList = publisherProvidedEids.map(eid =>
    identityModuleNameMap[eid.source] || eid.source
  );

  const identityPartners = Array.from(new Set([...userIdPartners, ...publisherProvidedEidList]));
  return identityPartners.length > 0 ? identityPartners : undefined;
}

function executeBidsLoggerCall(e, highestCpmBids) {
  const auctionId = e.auctionId;
  const referrer = config.getConfig('pageUrl') || cache.auctions[auctionId]?.referer || '';
  const auctionCache = cache.auctions[auctionId];
  const wiid = auctionCache?.wiid || auctionId;
  const floorData = auctionCache?.floorData;
  const floorFetchStatus = getFloorFetchStatus(floorData);
  const outputObj = { s: [] };
  let pixelURL = END_POINT_BID_LOGGER;

  const country = e.bidderRequests?.length > 0
    ? e.bidderRequests.find(bidder => bidder?.bidderCode === ADAPTER_CODE)?.ortb2?.user?.ext?.ctr || ''
    : '';

  if (!auctionCache || auctionCache.sent) {
    return;
  }

  pixelURL += 'pubid=' + publisherId;
  outputObj['pubid'] = '' + publisherId;
  outputObj['iid'] = '' + wiid;
  outputObj['to'] = '' + auctionCache.timeout;
  outputObj['purl'] = referrer;
  outputObj['orig'] = getDomainFromUrl(referrer);
  outputObj['tst'] = Math.round((new window.Date()).getTime() / 1000);
  outputObj['pid'] = '' + profileId;
  outputObj['pdvid'] = '' + profileVersionId;
  outputObj['dvc'] = {'plt': getDevicePlatform()};
  outputObj['tgid'] = getTgId();
  outputObj['dm'] = DISPLAY_MANAGER;
  outputObj['dmv'] = '$prebid.version$' || '-1';
  outputObj['bm'] = getBrowserType();
  outputObj['ctr'] = country || '';
  outputObj['lip'] = getListOfIdentityPartners();

  if (floorData) {
    const floorRootValues = getFloorsCommonField(floorData?.floorRequestData);
    if (floorRootValues) {
      const { ffs, fsrc, fp, mv } = floorRootValues;
      if (floorData?.floorRequestData) {
        outputObj['ffs'] = ffs;
        outputObj['fsrc'] = fsrc;
        outputObj['fp'] = fp;
      }
      if (floorFetchStatus) {
        outputObj['fmv'] = mv || undefined;
      }
    }
    if (floorFetchStatus) {
      outputObj['ft'] = getFloorType(floorData?.floorResponseData);
    }
  }

  outputObj.s = Object.keys(auctionCache.adUnitCodes).reduce(function(slotsArray, adUnitId) {
    const adUnit = auctionCache.adUnitCodes[adUnitId];
    const origAdUnit = getAdUnit(auctionCache.origAdUnits, adUnitId) || {};
    // getGptSlotInfoForAdUnitCode returns gptslot corresponding to adunit provided as input.
    const slotObject = {
      'sn': adUnitId,
      'au': origAdUnit.owAdUnitId || getGptSlotInfoForAdUnitCode(adUnitId)?.gptSlot || adUnitId,
      'mt': getAdUnitAdFormats(origAdUnit),
      'sz': getSizesForAdUnit(adUnit, adUnitId),
      'ps': gatherPartnerBidsForAdUnitForLogger(adUnit, adUnitId, highestCpmBids.filter(bid => bid.adUnitCode === adUnitId), e),
      'fskp': floorData && floorFetchStatus ? (floorData.floorRequestData ? (floorData.floorRequestData.skipped == false ? 0 : 1) : undefined) : undefined,
      'sid': generateUUID()
    };
    slotsArray.push(slotObject);
    return slotsArray;
  }, []);

  auctionCache.sent = true;

  ajax(
    pixelURL,
    null,
    'json=' + enc(JSON.stringify(outputObj)),
    {
      contentType: 'application/x-www-form-urlencoded',
      withCredentials: true,
      method: 'POST'
    }
  );
}

function executeBidWonLoggerCall(auctionId, adUnitId) {
  const winningBidId = cache.auctions[auctionId]?.adUnitCodes[adUnitId]?.bidWon;
  const winningBids = cache.auctions[auctionId]?.adUnitCodes[adUnitId]?.bids[winningBidId];
  if (!winningBids) {
    logWarn(LOG_PRE_FIX + 'Could not find winningBids for : ', auctionId);
    return;
  }

  let winningBid = winningBids[0];
  if (winningBids.length > 1) {
    winningBid = winningBids.filter(bid => bid.adId === cache.auctions[auctionId]?.adUnitCodes[adUnitId]?.bidWonAdId)[0];
  }

  const adapterName = getAdapterNameForAlias(winningBid.adapterCode || winningBid.bidder);
  if (isOWPubmaticBid(adapterName) && isS2SBidder(winningBid.bidder)) {
    return;
  }
  const origAdUnit = getAdUnit(cache.auctions[auctionId]?.origAdUnits, adUnitId) || {};
  const owAdUnitId = origAdUnit.owAdUnitId || getGptSlotInfoForAdUnitCode(adUnitId)?.gptSlot || adUnitId;
  const auctionCache = cache.auctions[auctionId];
  const floorData = auctionCache?.floorData;
  const wiid = cache.auctions[auctionId]?.wiid || auctionId;
  const referrer = config.getConfig('pageUrl') || cache.auctions[auctionId]?.referer || '';
  const adv = winningBid.bidResponse ? getAdDomain(winningBid.bidResponse) || undefined : undefined;
  const fskp = floorData ? (floorData.floorRequestData ? (floorData.floorRequestData.skipped == false ? 0 : 1) : undefined) : undefined;
  const pg = window.parseFloat(Number(winningBid?.bidResponse?.adserverTargeting?.hb_pb || winningBid?.bidResponse?.adserverTargeting?.pwtpb)) || undefined;
  let pixelURL = END_POINT_WIN_BID_LOGGER;

  pixelURL += 'pubid=' + publisherId;
  pixelURL += '&purl=' + enc(config.getConfig('pageUrl') || cache.auctions[auctionId]?.referer || '');
  pixelURL += '&tst=' + Math.round((new window.Date()).getTime() / 1000);
  pixelURL += '&iid=' + enc(wiid);
  pixelURL += '&bidid=' + enc(winningBidId);
  pixelURL += '&pid=' + enc(profileId);
  pixelURL += '&pdvid=' + enc(profileVersionId);
  pixelURL += '&slot=' + enc(adUnitId);
  pixelURL += '&au=' + enc(owAdUnitId);
  pixelURL += '&pn=' + enc(adapterName);
  pixelURL += '&bc=' + enc(winningBid.bidderCode || winningBid.bidder);
  pixelURL += '&en=' + enc(winningBid.bidResponse?.bidPriceUSD);
  pixelURL += '&eg=' + enc(winningBid.bidResponse?.bidGrossCpmUSD);
  pixelURL += '&kgpv=' + enc(getValueForKgpv(winningBid, adUnitId));
  pixelURL += '&dm=' + enc(DISPLAY_MANAGER);
  pixelURL += '&dmv=' + enc('$prebid.version$' || '-1');
  pixelURL += '&origbidid=' + enc(winningBid?.bidResponse?.partnerImpId || winningBid?.bidResponse?.prebidBidId || winningBid.bidId);
  pixelURL += '&di=' + enc(winningBid?.bidResponse?.dealId || OPEN_AUCTION_DEAL_ID);
  const ds = winningBid.bidResponse?.meta ? getMetadata(winningBid.bidResponse.meta)?.ds : undefined;
  if (ds) {
    pixelURL += '&ds=' + enc(ds);
  }
  pg && (pixelURL += '&pb=' + enc(pg));

  pixelURL += '&plt=' + enc(getDevicePlatform());
  pixelURL += '&psz=' + enc((winningBid?.bidResponse?.dimensions?.width || '0') + 'x' +
    (winningBid?.bidResponse?.dimensions?.height || '0'));
  pixelURL += '&tgid=' + enc(getTgId());
  adv && (pixelURL += '&adv=' + enc(adv));
  pixelURL += '&orig=' + enc(getDomainFromUrl(referrer));
  pixelURL += '&ss=' + enc(isS2SBidder(winningBid.bidder));
  (fskp != undefined) && (pixelURL += '&fskp=' + enc(fskp));
  if (floorData) {
    const floorRootValues = getFloorsCommonField(floorData.floorRequestData);
    if (floorRootValues) {
      const { ffs, fsrc, fp, mv } = floorRootValues || {};
      const params = { ffs, fsrc, fp, fmv: mv };
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          pixelURL += `&${key}=${enc(value)}`;
        }
      });
    }
    const floorType = getFloorType(floorData.floorResponseData);
    if (floorType !== undefined) {
      pixelURL += '&ft=' + enc(floorType);
    }
    const floorRuleValue = winningBid?.bidResponse?.floorData?.floorRuleValue;
    (floorRuleValue !== undefined) && (pixelURL += '&frv=' + enc(floorRuleValue));

    const floorValue = winningBid?.bidResponse?.floorData?.floorValue;
    (floorValue !== undefined) && (pixelURL += '&fv=' + enc(floorValue));
  }
  pixelURL += '&af=' + enc(winningBid.bidResponse ? (winningBid.bidResponse.mediaType || undefined) : undefined);

  ajax(
    pixelURL,
    null,
    null,
    {
      contentType: 'application/x-www-form-urlencoded',
      withCredentials: true,
      method: 'GET'
    }
  );
}

/// /////////// ADAPTER EVENT HANDLER FUNCTIONS //////////////

function auctionInitHandler(args) {
  s2sBidders = (function () {
    const s2sBidders = [];
    try {
      const s2sConf = config.getConfig('s2sConfig');
      if (isArray(s2sConf)) {
        s2sConf.forEach(conf => {
          if (conf?.bidders) {
            s2sBidders.push(...conf.bidders);
          }
        });
      } else if (s2sConf?.bidders) {
        s2sBidders.push(...s2sConf.bidders);
      }
    } catch (e) {
      logError('Error processing s2s bidders:', e);
    }
    return s2sBidders || [];
  }());
  const cacheEntry = pick(args, [
    'timestamp',
    'timeout',
    'bidderDonePendingCount', () => args.bidderRequests.length,
  ]);
  cacheEntry.adUnitCodes = {};
  cacheEntry.floorData = {};
  cacheEntry.origAdUnits = args.adUnits;
  cacheEntry.referer = args.bidderRequests[0].refererInfo.topmostLocation;
  cache.auctions[args.auctionId] = cacheEntry;
}

function bidRequestedHandler(args) {
  args.bids.forEach(function(bid) {
    if (!cache.auctions[args.auctionId].adUnitCodes.hasOwnProperty(bid.adUnitCode)) {
      cache.auctions[args.auctionId].adUnitCodes[bid.adUnitCode] = {
        bids: {},
        bidWon: false,
        dimensions: bid.sizes
      };
    }
    if (bid.bidder === 'pubmatic' && !!bid?.params?.wiid) {
      cache.auctions[args.auctionId].wiid = bid.params.wiid;
    }
    cache.auctions[args.auctionId].adUnitCodes[bid.adUnitCode].bids[bid.bidId] = [copyRequiredBidDetails(bid)];
    if (bid.floorData) {
      cache.auctions[args.auctionId].floorData['floorRequestData'] = bid.floorData;
    }
  })
}

function bidResponseHandler(args) {
  if (!args.requestId) {
    logWarn(LOG_PRE_FIX + 'Got null requestId in bidResponseHandler');
    return;
  }
  const requestId = args.originalRequestId || args.requestId;
  let bid = cache.auctions[args.auctionId].adUnitCodes[args.adUnitCode].bids[requestId][0];
  if (!bid) {
    logError(LOG_PRE_FIX + 'Could not find associated bid request for bid response with requestId: ', args.requestId);
    return;
  }

  if ((bid.bidder && args.bidderCode && bid.bidder !== args.bidderCode) || (bid.bidder === args.bidderCode && bid.status === SUCCESS)) {
    bid = copyRequiredBidDetails(args);
    cache.auctions[args.auctionId].adUnitCodes[args.adUnitCode].bids[requestId].push(bid);
  } else if (args.originalRequestId) {
    bid.bidId = args.requestId;
  }

  if (args.floorData) {
    cache.auctions[args.auctionId].floorData['floorResponseData'] = args.floorData;
  }

  bid.adId = args.adId;
  bid.source = formatSource(bid.source || args.source);
  setBidStatus(bid, 1);
  const latency = args?.timeToRespond || Date.now() - cache.auctions[args.auctionId].timestamp;
  const auctionTime = cache.auctions[args.auctionId].timeout;
  // Check if latency is greater than auctiontime+150, then log auctiontime+150 to avoid large numbers
  bid.partnerTimeToRespond = latency > (auctionTime + 150) ? (auctionTime + 150) : latency;
  bid.clientLatencyTimeMs = Date.now() - cache.auctions[args.auctionId].timestamp;
  bid.bidResponse = parseBidResponse(args);
}

function bidRejectedHandler(args) {
  // If bid is rejected due to floors value did not met
  // make cpm as 0, status as bidRejected and forward the bid for logging
  if (args.rejectionReason === REJECTION_REASON.FLOOR_NOT_MET) {
    args.cpm = 0;
    args.status = BID_STATUS.BID_REJECTED;
    bidResponseHandler(args);
  }
}

function bidderDoneHandler(args) {
  cache.auctions[args.auctionId].bidderDonePendingCount--;
  args.bids.forEach(bid => {
    const cachedBid = cache.auctions[bid.auctionId].adUnitCodes[bid.adUnitCode].bids[bid.bidId || bid.originalRequestId || bid.requestId];
    if (typeof bid.serverResponseTimeMs !== 'undefined') {
      cachedBid.serverLatencyTimeMs = bid.serverResponseTimeMs;
    }
    if (!cachedBid.status) {
      cachedBid.status = NO_BID;
    }
    if (!cachedBid.clientLatencyTimeMs) {
      cachedBid.clientLatencyTimeMs = Date.now() - cache.auctions[bid.auctionId].timestamp;
    }
  });
}

function bidWonHandler(args) {
  const auctionCache = cache.auctions[args.auctionId];
  auctionCache.adUnitCodes[args.adUnitCode].bidWon = args.originalRequestId || args.requestId;
  auctionCache.adUnitCodes[args.adUnitCode].bidWonAdId = args.adId;
  executeBidWonLoggerCall(args.auctionId, args.adUnitCode);
}

function auctionEndHandler(args) {
  // if for the given auction bidderDonePendingCount == 0 then execute logger call sooners
  const highestCpmBids = getGlobal().getHighestCpmBids() || [];
  setTimeout(() => {
    executeBidsLoggerCall.call(this, args, highestCpmBids);
  }, (cache.auctions[args.auctionId]?.bidderDonePendingCount === 0 ? 500 : SEND_TIMEOUT));
}

function bidTimeoutHandler(args) {
  // db = 1 and t = 1 means bidder did NOT respond with a bid but we got a timeout notification
  // db = 0 and t = 1 means bidder did  respond with a bid but post timeout
  args.forEach(badBid => {
    const auctionCache = cache.auctions[badBid.auctionId];
    const bid = auctionCache.adUnitCodes[badBid.adUnitCode].bids[ badBid.bidId || badBid.originalRequestId || badBid.requestId ][0];
    if (bid) {
      bid.status = ERROR;
      bid.error = {
        code: TIMEOUT_ERROR
      };
    } else {
      logWarn(LOG_PRE_FIX + 'bid not found');
    }
  });
}

/// /////////// ADAPTER DEFINITION //////////////

const baseAdapter = adapter({analyticsType: 'endpoint'});
const pubmaticAdapter = Object.assign({}, baseAdapter, {

  enableAnalytics(conf = {}) {
    let error = false;

    if (typeof conf.options === 'object') {
      if (conf.options.publisherId) {
        publisherId = Number(conf.options.publisherId);
      }
      profileId = Number(conf.options.profileId) || DEFAULT_PROFILE_ID;
      profileVersionId = Number(conf.options.profileVersionId) || DEFAULT_PROFILE_VERSION_ID;
    } else {
      logError(LOG_PRE_FIX + 'Config not found.');
      error = true;
    }

    if (!publisherId) {
      logError(LOG_PRE_FIX + 'Missing publisherId(Number).');
      error = true;
    }

    if (error) {
      logError(LOG_PRE_FIX + 'Not collecting data due to error(s).');
    } else {
      baseAdapter.enableAnalytics.call(this, conf);
    }
  },

  disableAnalytics() {
    publisherId = DEFAULT_PUBLISHER_ID;
    profileId = DEFAULT_PROFILE_ID;
    profileVersionId = DEFAULT_PROFILE_VERSION_ID;
    s2sBidders = [];
    baseAdapter.disableAnalytics.apply(this, arguments);
  },

  track({eventType, args}) {
    switch (eventType) {
      case EVENTS.AUCTION_INIT:
        auctionInitHandler(args);
        break;
      case EVENTS.BID_REQUESTED:
        bidRequestedHandler(args);
        break;
      case EVENTS.BID_RESPONSE:
        bidResponseHandler(args);
        break;
      case EVENTS.BID_REJECTED:
        bidRejectedHandler(args)
        break;
      case EVENTS.BIDDER_DONE:
        bidderDoneHandler(args);
        break;
      case EVENTS.BID_WON:
        bidWonHandler(args);
        break;
      case EVENTS.AUCTION_END:
        auctionEndHandler(args);
        break;
      case EVENTS.BID_TIMEOUT:
        bidTimeoutHandler(args);
        break;
    }
  }
});

/// /////////// ADAPTER REGISTRATION //////////////

adapterManager.registerAnalyticsAdapter({
  adapter: pubmaticAdapter,
  code: ADAPTER_CODE
});

export default pubmaticAdapter;
