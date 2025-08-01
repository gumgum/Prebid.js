import { logError, logInfo, logWarn, logMessage, deepClone, generateUUID, deepSetValue, deepAccess, getParameterByName } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';

const MODULE_NAME = 'greenbidsRtdProvider';
const MODULE_VERSION = '2.0.2';
const ENDPOINT = 'https://t.greenbids.ai';

const rtdOptions = {};

function init(moduleConfig) {
  const params = moduleConfig?.params;
  if (!params?.pbuid) {
    logError('Greenbids pbuid is not set!');
    return false;
  } else {
    rtdOptions.pbuid = params?.pbuid;
    rtdOptions.timeout = params?.timeout || 200;
    return true;
  }
}

function onAuctionInitEvent(auctionDetails) {
  /* Emitting one billing event per auction */
  const defaultId = 'default_id';
  const greenbidsId = deepAccess(auctionDetails.adUnits[0], 'ortb2Imp.ext.greenbids.greenbidsId', defaultId);
  /* greenbids was successfully called so we emit the event */
  if (greenbidsId !== defaultId) {
    events.emit(EVENTS.BILLABLE_EVENT, {
      type: 'auction',
      billingId: generateUUID(),
      auctionId: auctionDetails.auctionId,
      vendor: MODULE_NAME
    });
  }
}

function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  const greenbidsId = generateUUID();
  const promise = createPromise(reqBidsConfigObj, greenbidsId);
  promise.then(callback);
}

function createPromise(reqBidsConfigObj, greenbidsId) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      logWarn('GreenbidsRtdProvider: Greenbids API timeout, skipping shaping');
      resolve(reqBidsConfigObj);
    }, rtdOptions.timeout);
    ajax(
      ENDPOINT,
      {
        success: (response) => {
          processSuccessResponse(response, timeoutId, reqBidsConfigObj, greenbidsId);
          resolve(reqBidsConfigObj);
        },
        error: () => {
          clearTimeout(timeoutId);
          logWarn('GreenbidsRtdProvider: Greenbids API response error, skipping shaping');
          resolve(reqBidsConfigObj);
        },
      },
      createPayload(reqBidsConfigObj, greenbidsId),
    );
  });
}

function processSuccessResponse(response, timeoutId, reqBidsConfigObj, greenbidsId) {
  clearTimeout(timeoutId);
  try {
    const responseAdUnits = JSON.parse(response);
    updateAdUnitsBasedOnResponse(reqBidsConfigObj.adUnits, responseAdUnits, greenbidsId);
  } catch (e) {
    logWarn('GreenbidsRtdProvider: Greenbids API response parsing error, skipping shaping');
  }
}

function updateAdUnitsBasedOnResponse(adUnits, responseAdUnits, greenbidsId) {
  const isFilteringForced = getParameterByName('greenbids_force_filtering');
  const isFilteringDisabled = getParameterByName('greenbids_disable_filtering');
  adUnits.forEach((adUnit) => {
    const matchingAdUnit = findMatchingAdUnit(responseAdUnits, adUnit.code);
    if (matchingAdUnit) {
      deepSetValue(adUnit, 'ortb2Imp.ext.greenbids', {
        greenbidsId: greenbidsId,
        keptInAuction: matchingAdUnit.bidders,
        isExploration: matchingAdUnit.isExploration
      });
      if (matchingAdUnit.isExploration || isFilteringDisabled) {
        logMessage('Greenbids Rtd: either exploration traffic, or disabled filtering flag detected');
      } else if (isFilteringForced) {
        adUnit.bids = [];
        logInfo('Greenbids Rtd: filtering flag detected, forcing filtering of Rtd module.');
      } else {
        removeFalseBidders(adUnit, matchingAdUnit);
      }
    }
  });
}

function findMatchingAdUnit(responseAdUnits, adUnitCode) {
  return responseAdUnits.find((responseAdUnit) => responseAdUnit.code === adUnitCode);
}

function removeFalseBidders(adUnit, matchingAdUnit) {
  const falseBidders = getFalseBidders(matchingAdUnit.bidders);
  adUnit.bids = adUnit.bids.filter((bidRequest) => !falseBidders.includes(bidRequest.bidder));
}

function getFalseBidders(bidders) {
  return Object.entries(bidders)
    .filter(([bidder, shouldKeep]) => !shouldKeep)
    .map(([bidder]) => bidder);
}

function stripAdUnits(adUnits) {
  const stripedAdUnits = deepClone(adUnits);
  return stripedAdUnits.map(adUnit => {
    adUnit.bids = adUnit.bids.map(bid => {
      return { bidder: bid.bidder };
    });
    return adUnit;
  });
}

function createPayload(reqBidsConfigObj, greenbidsId) {
  return JSON.stringify({
    version: MODULE_VERSION,
    ...rtdOptions,
    referrer: window.location.href,
    prebid: '$prebid.version$',
    greenbidsId: greenbidsId,
    adUnits: stripAdUnits(reqBidsConfigObj.adUnits),
  });
}

export const greenbidsSubmodule = {
  name: MODULE_NAME,
  init: init,
  onAuctionInitEvent: onAuctionInitEvent,
  getBidRequestData: getBidRequestData,
  updateAdUnitsBasedOnResponse: updateAdUnitsBasedOnResponse,
  findMatchingAdUnit: findMatchingAdUnit,
  removeFalseBidders: removeFalseBidders,
  getFalseBidders: getFalseBidders,
  stripAdUnits: stripAdUnits,
};

submodule('realTimeData', greenbidsSubmodule);
