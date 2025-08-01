import { pbjsTestOnly } from 'test/helpers/pbjs-test-only.js';
import {getGlobal} from '../../src/prebidGlobal.js';

describe('Publisher API _ Alias Bidder', function () {
  var assert = require('chai').assert;
  var expect = require('chai').expect;
  var should = require('chai').should();
  var prebid = require('../../src/prebid.js');

  before(function () {
    var topSlotCode = '/19968336/header-bid-tag1';
    var topSlotSizes = [[728, 90], [970, 90]];
    var adUnit = {
      code: topSlotCode,
      sizes: topSlotSizes,
      bids: [
        {
          bidder: 'appnexus',
          params: {
            placementId: '5215561'
          }
        }
      ]
    };

    getGlobal().addAdUnits(adUnit);
  });

  after(function () {
    pbjsTestOnly.clearAllAdUnits();
  });

  describe('set Alias Bidder', function () {
    it('should have both of target bidder and alias bidder', function () {
      getGlobal().aliasBidder('appnexus', 'bRealTime1');
    });
  });
});
