import {expect, assert} from 'chai';
import {spec, EVENTS} from '../../../modules/medianetBidAdapter.js';
import {POST_ENDPOINT} from '../../../libraries/medianetUtils/constants.js';
import { makeSlot } from '../integration/faker/googletag.js';
import { config } from '../../../src/config.js';
import {server} from '../../mocks/xhr.js';
import {resetWinDimensions} from '../../../src/utils.js';
import {getGlobal} from '../../../src/prebidGlobal.js';

getGlobal().version = getGlobal().version || 'version';
const VALID_BID_REQUEST = [{
  'bidder': 'medianet',
  'params': {
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-0',
  ortb2Imp: {
    ext: {
      tid: '277b631f-92f5-4844-8b19-ea13c095d3f1'
    }
  },
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 250]],
    }
  },
  'bidId': '28f8f8130a583e',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1,
}, {
  'bidder': 'medianet',
  'params': {
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-123',
  ortb2Imp: {
    ext: {
      tid: 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    }
  },
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 251]],
    }
  },
  'sizes': [[300, 251]],
  'bidId': '3f97ca71b1e5c2',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1
}];

const VALID_BID_REQUEST_WITH_CRID = [{
  'bidder': 'medianet',
  'params': {
    'crid': 'crid',
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-0',
  ortb2Imp: {
    ext: {
      tid: '277b631f-92f5-4844-8b19-ea13c095d3f1',
    }
  },
  'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 250]],
    }
  },
  'bidId': '28f8f8130a583e',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1
}, {
  'bidder': 'medianet',
  'params': {
    'crid': 'crid',
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-123',
  ortb2Imp: {
    ext: {
      tid: 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    }
  },
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 251]],
    }
  },
  'sizes': [[300, 251]],
  'bidId': '3f97ca71b1e5c2',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1
}];
const VALID_BID_REQUEST_WITH_ORTB2 = [{
  'bidder': 'medianet',
  'params': {
    'crid': 'crid',
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-0',
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 250]],
    }
  },
  'bidId': '28f8f8130a583e',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'ortb2Imp': {
    'ext': {
      tid: '277b631f-92f5-4844-8b19-ea13c095d3f1',
      'data': {'pbadslot': '/12345/my-gpt-tag-0'}
    }
  },
  'auctionsCount': 1
}, {
  'bidder': 'medianet',
  'params': {
    'crid': 'crid',
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-123',
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 251]],
    }
  },
  'sizes': [[300, 251]],
  'bidId': '3f97ca71b1e5c2',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'ortb2Imp': {
    'ext': {
      tid: 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
      'data': {'pbadslot': '/12345/my-gpt-tag-0'}
    }
  },
  'auctionsCount': 1
}];
  // Protected Audience API Request
const VALID_BID_REQUEST_WITH_AE_IN_ORTB2IMP = [{
  'bidder': 'medianet',
  'params': {
    'crid': 'crid',
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-0',
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 250]],
    }
  },
  'bidId': '28f8f8130a583e',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'ortb2Imp': {
    'ext': {
      'tid': '277b631f-92f5-4844-8b19-ea13c095d3f1',
      'ae': 1
    }
  },
  'auctionsCount': 1
}];

const VALID_BID_REQUEST_WITH_USERID = [{
  'bidder': 'medianet',
  'params': {
    'crid': 'crid',
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  userId: {
    britepoolid: '82efd5e1-816b-4f87-97f8-044f407e2911'
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-0',
  ortb2Imp: {
    ext: {
      tid: '277b631f-92f5-4844-8b19-ea13c095d3f1',
    }
  },
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 250]],
    }
  },
  'bidId': '28f8f8130a583e',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1
}, {
  'bidder': 'medianet',
  'params': {
    'crid': 'crid',
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-123',
  ortb2Imp: {
    ext: {
      tid: 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    }
  },
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 251]],
    }
  },
  'sizes': [[300, 251]],
  'bidId': '3f97ca71b1e5c2',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1
}];
const VALID_BID_REQUEST_WITH_USERIDASEIDS = [{
  'bidder': 'medianet',
  'params': {
    'crid': 'crid',
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  userIdAsEids: [{
    'source': 'criteo.com',
    'uids': [
      {
        'id': 'VZME3l9ycFFORncwaGJRVUNtUzB1UVhpWVd5TElrR3A5SHVSWXAwSFVPJTJCWiUyRnV2UTBPWjZOZ1ZrWnN4SldxcWUlMkJhUnFmUVNzUVg4N1NsdW84SGpUU1BsUllQSnN5bERMdFdPM2pWVXAlMkZVSSUyQkZsJTJGcktlenpZaHp0YXlvU25INWRQQ2tXciUyRk9PQmdac3RHeG9adDNKVzlRWE51ZyUzRCUzRA',
        'atype': 1
      }
    ]
  }
  ],
  'adUnitCode': 'div-gpt-ad-1460505748561-0',
  ortb2Imp: {
    ext: {
      tid: '277b631f-92f5-4844-8b19-ea13c095d3f1',
    }
  },
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 250]],
    }
  },
  'bidId': '28f8f8130a583e',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1
}, {
  'bidder': 'medianet',
  'params': {
    'crid': 'crid',
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-123',
  ortb2Imp: {
    ext: {
      tid: 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    }
  },
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 251]],
    }
  },
  'sizes': [[300, 251]],
  'bidId': '3f97ca71b1e5c2',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1
}];

const VALID_BID_REQUEST_INVALID_BIDFLOOR = [{
  'bidder': 'medianet',
  'params': {
    'cid': 'customer_id',
    'bidfloor': 'abcdef',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-0',
  ortb2Imp: {
    ext: {
      tid: '277b631f-92f5-4844-8b19-ea13c095d3f1',
    }
  },
  'sizes': [[300, 250]],
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 250]],
    }
  },
  'bidId': '28f8f8130a583e',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1
}, {
  'bidder': 'medianet',
  'params': {
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-123',
  ortb2Imp: {
    ext: {
      tid: 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    }
  },
  'sizes': [[300, 251]],
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 251]],
    }
  },
  'bidId': '3f97ca71b1e5c2',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1
}];
const VALID_NATIVE_BID_REQUEST = [{
  'bidder': 'medianet',
  'params': {
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-0',
  ortb2Imp: {
    ext: {
      tid: '277b631f-92f5-4844-8b19-ea13c095d3f1',
    }
  },
  'sizes': [[300, 250]],
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 250]],
    }
  },
  'bidId': '28f8f8130a583e',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1,
  'nativeParams': {
    'image': {
      'required': true,
      'sizes': [
        150,
        50
      ],
      'wmin': 50
    },
    'title': {
      'required': true,
      'len': 80
    },
    'sponsoredBy': {
      'required': true
    },
    'clickUrl': {
      'required': true
    },
    'body': {
      'required': true
    },
    'icon': {
      'required': true,
      'sizes': [
        50,
        50
      ]
    }
  }
}, {
  'bidder': 'medianet',
  'params': {
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-123',
  ortb2Imp: {
    ext: {
      tid: 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    }
  },
  'sizes': [[300, 251]],
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 251]],
    }
  },
  'bidId': '3f97ca71b1e5c2',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1,
  'nativeParams': {
    'image': {
      'required': true,
      'sizes': [
        150,
        50
      ],
      'wmin': 50
    },
    'title': {
      'required': true,
      'len': 80
    },
    'sponsoredBy': {
      'required': true
    },
    'clickUrl': {
      'required': true
    },
    'body': {
      'required': true
    },
    'icon': {
      'required': true,
      'sizes': [
        50,
        50
      ]
    }
  }
}];
const VALID_AUCTIONDATA = {
  'timeout': config.getConfig('bidderTimeout'),
  'refererInfo': {
    referer: 'http://media.net/prebidtest',
    stack: ['http://media.net/prebidtest'],
    page: 'http://media.net/page',
    domain: 'media.net',
    topmostLocation: 'http://media.net/topmost',
    reachedTop: true
  }
};
const VALID_PAYLOAD_INVALID_BIDFLOOR = {
  'site': {
    'page': 'http://media.net/prebidtest',
    'domain': 'media.net',
    'ref': 'http://media.net/prebidtest',
    'topMostLocation': 'http://media.net/topmost',
    'isTop': true
  },
  'ext': {
    'customer_id': 'customer_id',
    'prebid_version': 'v' + '$prebid.version$',
    'gdpr_applies': false,
    'usp_applies': false,
    'coppa_applies': false,
    'screen': {
      'w': 1000,
      'h': 1000
    },
    'vcoords': {
      'top_left': {
        'x': 50,
        'y': 100
      },
      'bottom_right': {
        'x': 490,
        'y': 880
      }
    }
  },
  'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'imp': [{
    'id': '28f8f8130a583e',
    ortb2Imp: VALID_BID_REQUEST_INVALID_BIDFLOOR[0].ortb2Imp,
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-0',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-0'
    },
    'banner': [{
      'w': 300,
      'h': 250
    }],
    'all': {
      'cid': 'customer_id',
      'bidfloor': 'abcdef',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }, {
    'id': '3f97ca71b1e5c2',
    ortb2Imp: VALID_BID_REQUEST_INVALID_BIDFLOOR[1].ortb2Imp,
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-123',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-123'
    },
    'banner': [{
      'w': 300,
      'h': 251
    }],
    'all': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }],
  'ortb2': {},
  'tmax': config.getConfig('bidderTimeout')
};
const VALID_PAYLOAD_NATIVE = {
  'site': {
    'page': 'http://media.net/prebidtest',
    'domain': 'media.net',
    'ref': 'http://media.net/prebidtest',
    'topMostLocation': 'http://media.net/topmost',
    'isTop': true
  },
  'ext': {
    'customer_id': 'customer_id',
    'prebid_version': 'v' + '$prebid.version$',
    'gdpr_applies': false,
    'usp_applies': false,
    'coppa_applies': false,
    'screen': {
      'w': 1000,
      'h': 1000
    },
    'vcoords': {
      'top_left': {
        'x': 50,
        'y': 100
      },
      'bottom_right': {
        'x': 490,
        'y': 880
      }
    }
  },
  'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'imp': [{
    'id': '28f8f8130a583e',
    ortb2Imp: VALID_NATIVE_BID_REQUEST[0].ortb2Imp,
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-0',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-0'
    },
    'banner': [{
      'w': 300,
      'h': 250
    }],
    'native': '{\"image\":{\"required\":true,\"sizes\":[150,50],\"wmin\":50},\"title\":{\"required\":true,\"len\":80},\"sponsoredBy\":{\"required\":true},\"clickUrl\":{\"required\":true},\"body\":{\"required\":true},\"icon\":{\"required\":true,\"sizes\":[50,50]}}',
    'all': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }, {
    'id': '3f97ca71b1e5c2',
    ortb2Imp: VALID_NATIVE_BID_REQUEST[1].ortb2Imp,
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-123',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-123'
    },
    'banner': [{
      'w': 300,
      'h': 251
    }],
    'native': '{\"image\":{\"required\":true,\"sizes\":[150,50],\"wmin\":50},\"title\":{\"required\":true,\"len\":80},\"sponsoredBy\":{\"required\":true},\"clickUrl\":{\"required\":true},\"body\":{\"required\":true},\"icon\":{\"required\":true,\"sizes\":[50,50]}}',
    'all': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }],
  'ortb2': {},
  'tmax': config.getConfig('bidderTimeout')
};
const VALID_PAYLOAD = {
  'site': {
    'page': 'http://media.net/prebidtest',
    'domain': 'media.net',
    'ref': 'http://media.net/prebidtest',
    'topMostLocation': 'http://media.net/topmost',
    'isTop': true
  },
  'ext': {
    'customer_id': 'customer_id',
    'prebid_version': 'v' + '$prebid.version$',
    'gdpr_applies': false,
    'usp_applies': false,
    'coppa_applies': false,
    'screen': {
      'w': 1000,
      'h': 1000
    },
    'vcoords': {
      'top_left': {
        'x': 50,
        'y': 100
      },
      'bottom_right': {
        'x': 490,
        'y': 880
      }
    }
  },
  'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'imp': [{
    'id': '28f8f8130a583e',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    ortb2Imp: VALID_BID_REQUEST[0].ortb2Imp,
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-0',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-0'
    },
    'banner': [{
      'w': 300,
      'h': 250
    }],
    'all': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }, {
    'id': '3f97ca71b1e5c2',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    ortb2Imp: VALID_BID_REQUEST[1].ortb2Imp,
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-123',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-123'
    },
    'banner': [{
      'w': 300,
      'h': 251
    }],
    'all': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }],
  'ortb2': {},
  'tmax': config.getConfig('bidderTimeout')
};
const VALID_PAYLOAD_WITH_USERID = {
  'site': {
    'page': 'http://media.net/prebidtest',
    'domain': 'media.net',
    'ref': 'http://media.net/prebidtest',
    'topMostLocation': 'http://media.net/topmost',
    'isTop': true
  },
  'ext': {
    'customer_id': 'customer_id',
    'prebid_version': 'v' + '$prebid.version$',
    'gdpr_applies': false,
    'user_id': {
      britepoolid: '82efd5e1-816b-4f87-97f8-044f407e2911'
    },
    'usp_applies': false,
    'coppa_applies': false,
    'screen': {
      'w': 1000,
      'h': 1000
    },
    'vcoords': {
      'top_left': {
        'x': 50,
        'y': 100
      },
      'bottom_right': {
        'x': 490,
        'y': 880
      }
    }
  },
  'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'imp': [{
    'id': '28f8f8130a583e',
    ortb2Imp: VALID_BID_REQUEST_WITH_USERID[0].ortb2Imp,
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'tagid': 'crid',
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-0',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-0'
    },
    'banner': [{
      'w': 300,
      'h': 250
    }],
    'all': {
      'cid': 'customer_id',
      'crid': 'crid',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }, {
    'id': '3f97ca71b1e5c2',
    ortb2Imp: VALID_BID_REQUEST_WITH_USERID[1].ortb2Imp,
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'tagid': 'crid',
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-123',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-123'
    },
    'banner': [{
      'w': 300,
      'h': 251
    }],
    'all': {
      'cid': 'customer_id',
      'crid': 'crid',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }],
  'ortb2': {},
  'tmax': config.getConfig('bidderTimeout')
};
const VALID_PAYLOAD_WITH_USERIDASEIDS = {
  'site': {
    'page': 'http://media.net/prebidtest',
    'domain': 'media.net',
    'ref': 'http://media.net/prebidtest',
    'topMostLocation': 'http://media.net/topmost',
    'isTop': true
  },
  'ext': {
    'customer_id': 'customer_id',
    'prebid_version': 'v' + '$prebid.version$',
    'gdpr_applies': false,
    'usp_applies': false,
    'coppa_applies': false,
    'screen': {
      'w': 1000,
      'h': 1000
    },
    'vcoords': {
      'top_left': {
        'x': 50,
        'y': 100
      },
      'bottom_right': {
        'x': 490,
        'y': 880
      }
    }
  },
  'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'imp': [{
    'id': '28f8f8130a583e',
    ortb2Imp: VALID_BID_REQUEST_WITH_USERID[0].ortb2Imp,
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'tagid': 'crid',
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-0',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-0'
    },
    'banner': [{
      'w': 300,
      'h': 250
    }],
    'all': {
      'cid': 'customer_id',
      'crid': 'crid',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }, {
    'id': '3f97ca71b1e5c2',
    ortb2Imp: VALID_BID_REQUEST_WITH_USERID[1].ortb2Imp,
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'tagid': 'crid',
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-123',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-123'
    },
    'banner': [{
      'w': 300,
      'h': 251
    }],
    'all': {
      'cid': 'customer_id',
      'crid': 'crid',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }],
  'ortb2': {
    'user': {
      'ext': {
        'eids': [{
          'source': 'criteo.com',
          'uids': [{
            'id': 'VZME3l9ycFFORncwaGJRVUNtUzB1UVhpWVd5TElrR3A5SHVSWXAwSFVPJTJCWiUyRnV2UTBPWjZOZ1ZrWnN4SldxcWUlMkJhUnFmUVNzUVg4N1NsdW84SGpUU1BsUllQSnN5bERMdFdPM2pWVXAlMkZVSSUyQkZsJTJGcktlenpZaHp0YXlvU25INWRQQ2tXciUyRk9PQmdac3RHeG9adDNKVzlRWE51ZyUzRCUzRA',
            'atype': 1
          }
          ]
        }]
      }
    },
  },
  'tmax': config.getConfig('bidderTimeout')
};
const VALID_PAYLOAD_WITH_CRID = {
  'site': {
    'page': 'http://media.net/prebidtest',
    'domain': 'media.net',
    'ref': 'http://media.net/prebidtest',
    'topMostLocation': 'http://media.net/topmost',
    'isTop': true
  },
  'ext': {
    'customer_id': 'customer_id',
    'prebid_version': 'v' + '$prebid.version$',
    'gdpr_applies': false,
    'usp_applies': false,
    'coppa_applies': true,
    'screen': {
      'w': 1000,
      'h': 1000
    },
    'vcoords': {
      'top_left': {
        'x': 50,
        'y': 100
      },
      'bottom_right': {
        'x': 490,
        'y': 880
      }
    }
  },
  'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'imp': [{
    'id': '28f8f8130a583e',
    ortb2Imp: VALID_BID_REQUEST_WITH_CRID[0].ortb2Imp,
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'tagid': 'crid',
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-0',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-0'
    },
    'banner': [{
      'w': 300,
      'h': 250
    }],
    'all': {
      'cid': 'customer_id',
      'crid': 'crid',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }, {
    'id': '3f97ca71b1e5c2',
    ortb2Imp: VALID_BID_REQUEST_WITH_CRID[1].ortb2Imp,
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'tagid': 'crid',
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-123',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-123'
    },
    'banner': [{
      'w': 300,
      'h': 251
    }],
    'all': {
      'cid': 'customer_id',
      'crid': 'crid',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }],
  'ortb2': {},
  'tmax': config.getConfig('bidderTimeout')
};
  // Protected Audience API Valid Payload
const VALID_PAYLOAD_PAAPI = {
  'site': {
    'domain': 'media.net',
    'page': 'http://media.net/prebidtest',
    'ref': 'http://media.net/prebidtest',
    'topMostLocation': 'http://media.net/topmost',
    'isTop': true
  },
  'ext': {
    'customer_id': 'customer_id',
    'prebid_version': 'v' + '$prebid.version$',
    'gdpr_applies': false,
    'usp_applies': false,
    'coppa_applies': false,
    'screen': {
      'w': 1000,
      'h': 1000
    },
    'vcoords': {
      'top_left': {
        'x': 50,
        'y': 100
      },
      'bottom_right': {
        'x': 490,
        'y': 880
      }
    }
  },
  'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'imp': [
    {
      'id': '28f8f8130a583e',
      'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
      'ext': {
        'ae': 1,
        'dfp_id': 'div-gpt-ad-1460505748561-0',
        'display_count': 1,
        'coordinates': {
          'top_left': {
            'x': 50,
            'y': 50
          },
          'bottom_right': {
            'x': 100,
            'y': 100
          }
        },
        'viewability': 1,
        'visibility': 1,
        'adUnitCode': 'div-gpt-ad-1460505748561-0'
      },
      'all': {
        'cid': 'customer_id',
        'crid': 'crid',
        'site': {
          'domain': 'media.net',
          'isTop': true,
          'page': 'http://media.net/prebidtest',
          'ref': 'http://media.net/prebidtest'
        }
      },
      'ortb2Imp': {
        'ext': {
          'tid': '277b631f-92f5-4844-8b19-ea13c095d3f1',
          'ae': 1
        }
      },
      'banner': [
        {
          'w': 300,
          'h': 250
        }
      ],
      'tagid': 'crid'
    }
  ],
  'ortb2': {},
  'tmax': 3000
};

const VALID_VIDEO_BID_REQUEST = [{
  'bidder': 'medianet',
  'params': {
    'cid': 'customer_id',
    'video': {
      'skipppable': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-0',
  'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
  'mediaTypes': {
    'video': {
      'context': 'instream',
    }
  },
  'bidId': '28f8f8130a583e',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1
}];

const VALID_PAYLOAD_PAGE_META = (() => {
  let PAGE_META;
  try {
    PAGE_META = JSON.parse(JSON.stringify(VALID_PAYLOAD));
  } catch (e) {}
  PAGE_META.site = Object.assign(PAGE_META.site, {
    'canonical_url': 'http://localhost:9999/canonical-test',
  });
  return PAGE_META;
})();
const VALID_PARAMS = {
  bidder: 'medianet',
  params: {
    cid: '8CUV090'
  }
};
const VALID_PARAMS_TS = {
  bidder: 'trustedstack',
  params: {
    cid: 'TS012345'
  }
};
const PARAMS_MISSING = {
  bidder: 'medianet',
};
const PARAMS_MISSING_TS = {
  bidder: 'trustedstack',
};
const PARAMS_WITHOUT_CID = {
  bidder: 'medianet',
  params: {}
};
const PARAMS_WITHOUT_CID_TS = {
  bidder: 'trustedstack',
  params: {}
};
const PARAMS_WITH_INTEGER_CID = {
  bidder: 'medianet',
  params: {
    cid: 8867587
  }
};
const PARAMS_WITH_INTEGER_CID_TS = {
  bidder: 'trustedstack',
  params: {
    cid: 8867587
  }
};
const PARAMS_WITH_EMPTY_CID = {
  bidder: 'medianet',
  params: {
    cid: ''
  }
};
const PARAMS_WITH_EMPTY_CID_TS = {
  bidder: 'trustedstack',
  params: {
    cid: ''
  }
};
const SYNC_OPTIONS_BOTH_ENABLED = {
  iframeEnabled: true,
  pixelEnabled: true,
};
const SYNC_OPTIONS_PIXEL_ENABLED = {
  iframeEnabled: false,
  pixelEnabled: true,
};
const SYNC_OPTIONS_IFRAME_ENABLED = {
  iframeEnabled: true,
  pixelEnabled: false,
};
const SERVER_CSYNC_RESPONSE = [{
  body: {
    ext: {
      csUrl: [{
        type: 'iframe',
        url: 'iframe-url'
      }, {
        type: 'image',
        url: 'pixel-url'
      }]
    }
  }
}];
const ENABLED_SYNC_IFRAME = [{
  type: 'iframe',
  url: 'iframe-url'
}];
const ENABLED_SYNC_PIXEL = [{
  type: 'image',
  url: 'pixel-url'
}];
const SERVER_RESPONSE_CPM_MISSING = {
  body: {
    'id': 'd90ca32f-3877-424a-b2f2-6a68988df57a',
    'bidList': [{
      'no_bid': false,
      'requestId': '27210feac00e96',
      'ad': 'ad',
      'width': 300,
      'height': 250,
      'creativeId': '375068987',
      'netRevenue': true
    }],
    'ext': {
      'csUrl': [{
        'type': 'image',
        'url': 'http://cs.media.net/cksync.php'
      }, {
        'type': 'iframe',
        'url': 'http://contextual.media.net/checksync.php?&vsSync=1'
      }]
    }
  }
};
const SERVER_RESPONSE_CPM_ZERO = {
  body: {
    'id': 'd90ca32f-3877-424a-b2f2-6a68988df57a',
    'bidList': [{
      'no_bid': false,
      'requestId': '27210feac00e96',
      'ad': 'ad',
      'width': 300,
      'height': 250,
      'creativeId': '375068987',
      'netRevenue': true,
      'cpm': 0.0
    }],
    'ext': {
      'csUrl': [{
        'type': 'image',
        'url': 'http://cs.media.net/cksync.php'
      }, {
        'type': 'iframe',
        'url': 'http://contextual.media.net/checksync.php?&vsSync=1'
      }]
    }
  }
};
const SERVER_RESPONSE_NOBID = {
  body: {
    'id': 'd90ca32f-3877-424a-b2f2-6a68988df57a',
    'bidList': [{
      'no_bid': true,
      'requestId': '3a62cf7a853f84',
      'width': 0,
      'height': 0,
      'ttl': 0,
      'netRevenue': false
    }],
    'ext': {
      'csUrl': [{
        'type': 'image',
        'url': 'http://cs.media.net/cksync.php'
      }, {
        'type': 'iframe',
        'url': 'http://contextual.media.net/checksync.php?&vsSync=1'
      }]
    }
  }
};
const SERVER_RESPONSE_NOBODY = {

};
const SERVER_RESPONSE_EMPTY_BIDLIST = {
  body: {
    'id': 'd90ca32f-3877-424a-b2f2-6a68988df57a',
    'bidList': 'bid',
    'ext': {
      'csUrl': [{
        'type': 'image',
        'url': 'http://cs.media.net/cksync.php'
      }, {
        'type': 'iframe',
        'url': 'http://contextual.media.net/checksync.php?&vsSync=1'
      }]
    }
  }

};
const SERVER_RESPONSE_VALID_BID = {
  body: {
    'id': 'd90ca32f-3877-424a-b2f2-6a68988df57a',
    'bidList': [{
      'no_bid': false,
      'requestId': '27210feac00e96',
      'ad': 'ad',
      'width': 300,
      'height': 250,
      'creativeId': '375068987',
      'netRevenue': true,
      'cpm': 0.1
    }],
    'ext': {
      'csUrl': [{
        'type': 'image',
        'url': 'http://cs.media.net/cksync.php'
      }, {
        'type': 'iframe',
        'url': 'http://contextual.media.net/checksync.php?&vsSync=1'
      }]
    }
  }
};
  // Protected Audience API Response
const SERVER_RESPONSE_PAAPI = {
  body: {
    'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidList': [{
      'no_bid': false,
      'requestId': '28f8f8130a583e',
      'ad': 'ad',
      'width': 300,
      'height': 250,
      'creativeId': 'crid',
      'netRevenue': true,
      'cpm': 0.1
    }],
    'ext': {
      'paApiAuctionConfigs': [
        {
          'bidId': '28f8f8130a583e',
          'config': {
            'seller': 'https://hbx.test.media.net',
            'decisionLogicUrl': 'https://hbx.test.media.net/decision-logic.js',
            'interestGroupBuyers': ['https://buyer.test.media.net'],
            'auctionSignals': {
              'logging_params': {
                'cid': 'customer_id',
                'crid': 'crid',
                'bid_uuid': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
                'browser_id': 2,
                'dfpid': 'div-gpt-ad-1460505748561-0'
              },
              'pvidLookup': {
                'https://buyer.test.media.net': {
                  'pvid': '172',
                  'seat': 'quantcast-qc1'
                }
              },
              'bidFlr': 0.0
            },
            'sellerTimout': 1000,
            'sellerSignals': {
              'callbackURL': 'https://test.com/paapi/v1/abcd'
            },
            'perBuyerSignals': {
              'https://buyer.test.media.net': [ 'test_buyer_signals' ]
            },
            'perBuyerTimeouts': {
              '*': 200
            }
          }
        }
      ],
      'csUrl': [{
        'type': 'iframe',
        'url': 'http://contextual.media.net/checksync.php?&vsSync=1'
      }]
    }
  }
};
  // Protected Audience API OpenRTB Response
const SERVER_RESPONSE_PAAPI_ORTB = {
  body: {
    'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidList': [{
      'no_bid': false,
      'requestId': '28f8f8130a583e',
      'ad': 'ad',
      'width': 300,
      'height': 250,
      'creativeId': 'crid',
      'netRevenue': true,
      'cpm': 0.1
    }],
    'ext': {
      'igi': [{
        'igs': [
          {
            'impid': '28f8f8130a583e',
            'bidId': '28f8f8130a583e',
            'config': {
              'seller': 'https://hbx.test.media.net',
              'decisionLogicUrl': 'https://hbx.test.media.net/decision-logic.js',
              'interestGroupBuyers': ['https://buyer.test.media.net'],
              'auctionSignals': {
                'logging_params': {
                  'cid': 'customer_id',
                  'crid': 'crid',
                  'bid_uuid': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
                  'browser_id': 2,
                  'dfpid': 'div-gpt-ad-1460505748561-0'
                },
                'pvidLookup': {
                  'https://buyer.test.media.net': {
                    'pvid': '172',
                    'seat': 'quantcast-qc1'
                  }
                },
                'bidFlr': 0.0
              },
              'sellerTimout': 1000,
              'sellerSignals': {
                'callbackURL': 'https://test.com/paapi/v1/abcd'
              },
              'perBuyerSignals': {
                'https://buyer.test.media.net': [ 'test_buyer_signals' ]
              },
              'perBuyerTimeouts': {
                '*': 200
              }
            }
          }
        ],
      }],
      'csUrl': [{
        'type': 'iframe',
        'url': 'http://contextual.media.net/checksync.php?&vsSync=1'
      }]
    }
  }
};

const SERVER_VIDEO_OUTSTREAM_RESPONSE_VALID_BID = {
  body: {
    'id': 'd90ca32f-3877-424a-b2f2-6a68988df57a',
    'bidList': [{
      'no_bid': false,
      'requestId': '27210feac00e96',
      'cpm': 12.00,
      'width': 640,
      'height': 480,
      'ttl': 180,
      'creativeId': '370637746',
      'netRevenue': true,
      'vastXml': '',
      'currency': 'USD',
      'dfp_id': 'video1',
      'mediaType': 'video',
      'vto': 5000,
      'mavtr': 10,
      'avp': true,
      'ap': true,
      'pl': true,
      'mt': true,
      'jslt': 3000,
      'context': 'outstream'
    }],
    'ext': {
      'csUrl': [{
        'type': 'image',
        'url': 'http://cs.media.net/cksync.php'
      }, {
        'type': 'iframe',
        'url': 'http://contextual.media.net/checksync.php?&vsSync=1'
      }]
    }
  }
};
const SERVER_VALID_BIDS = [{
  'no_bid': false,
  'requestId': '27210feac00e96',
  'ad': 'ad',
  'width': 300,
  'height': 250,
  'creativeId': '375068987',
  'netRevenue': true,
  'cpm': 0.1
}];
const BID_REQUEST_SIZE_AS_1DARRAY = [{
  'bidder': 'medianet',
  'params': {
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-0',
  ortb2Imp: {
    ext: {
      tid: '277b631f-92f5-4844-8b19-ea13c095d3f1',
    }
  },
  'sizes': [300, 250],
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 250]],
    }
  },
  'bidId': '28f8f8130a583e',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1
}, {
  'bidder': 'medianet',
  'params': {
    'cid': 'customer_id',
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-123',
  ortb2Imp: {
    ext: {
      tid: 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    }
  },
  'sizes': [300, 251],
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 251]],
    }
  },
  'bidId': '3f97ca71b1e5c2',
  'bidderRequestId': '1e9b1f07797c1c',
  'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'auctionsCount': 1
}];
const VALID_BIDDER_REQUEST_WITH_GDPR = {
  'gdprConsent': {
    'consentString': 'consentString',
    'gdprApplies': true,
  },
  'uspConsent': '1NYN',
  'timeout': 3000,
  refererInfo: {
    referer: 'http://media.net/prebidtest',
    stack: ['http://media.net/prebidtest'],
    page: 'http://media.net/page',
    domain: 'media.net',
    topmostLocation: 'http://media.net/topmost',
    reachedTop: true
  }
};
const VALID_PAYLOAD_FOR_GDPR = {
  'site': {
    'domain': 'media.net',
    'page': 'http://media.net/prebidtest',
    'ref': 'http://media.net/prebidtest',
    'topMostLocation': 'http://media.net/topmost',
    'isTop': true
  },
  'ext': {
    'customer_id': 'customer_id',
    'prebid_version': 'v' + '$prebid.version$',
    'gdpr_consent_string': 'consentString',
    'gdpr_applies': true,
    'usp_applies': true,
    'coppa_applies': false,
    'usp_consent_string': '1NYN',
    'screen': {
      'w': 1000,
      'h': 1000
    },
    'vcoords': {
      'top_left': {
        'x': 50,
        'y': 100
      },
      'bottom_right': {
        'x': 490,
        'y': 880
      }
    }
  },
  'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'imp': [{
    'id': '28f8f8130a583e',
    ortb2Imp: VALID_BID_REQUEST[0].ortb2Imp,
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-0',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-0'
    },
    'banner': [{
      'w': 300,
      'h': 250
    }],
    'all': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }, {
    'id': '3f97ca71b1e5c2',
    ortb2Imp: VALID_BID_REQUEST[1].ortb2Imp,
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-123',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-123'
    },
    'banner': [{
      'w': 300,
      'h': 251
    }],
    'all': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }],
  'ortb2': {},
  'tmax': 3000,
};
const VALID_BIDDER_REQUEST_WITH_GPP_IN_ORTB2 = {
  ortb2: {
    regs: {
      gpp: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN',
      gpp_sid: [5, 7]
    }
  },
  'timeout': 3000,
  refererInfo: {
    referer: 'http://media.net/prebidtest',
    stack: ['http://media.net/prebidtest'],
    page: 'http://media.net/page',
    domain: 'media.net',
    topmostLocation: 'http://media.net/topmost',
    reachedTop: true
  }
};
const VALID_PAYLOAD_FOR_GPP_ORTB2 = {
  'site': {
    'page': 'http://media.net/prebidtest',
    'domain': 'media.net',
    'ref': 'http://media.net/prebidtest',
    'topMostLocation': 'http://media.net/topmost',
    'isTop': true
  },
  'ext': {
    'customer_id': 'customer_id',
    'prebid_version': 'v' + '$prebid.version$',
    'gdpr_applies': false,
    'usp_applies': false,
    'coppa_applies': false,
    'screen': {
      'w': 1000,
      'h': 1000
    },
    'vcoords': {
      'top_left': {
        'x': 50,
        'y': 100
      },
      'bottom_right': {
        'x': 490,
        'y': 880
      }
    }
  },
  'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
  'imp': [{
    'id': '28f8f8130a583e',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    ortb2Imp: VALID_BID_REQUEST[0].ortb2Imp,
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-0',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-0'
    },
    'banner': [{
      'w': 300,
      'h': 250
    }],
    'all': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }, {
    'id': '3f97ca71b1e5c2',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    ortb2Imp: VALID_BID_REQUEST[1].ortb2Imp,
    'ext': {
      'dfp_id': 'div-gpt-ad-1460505748561-123',
      'visibility': 1,
      'viewability': 1,
      'coordinates': {
        'top_left': {
          x: 50,
          y: 50
        },
        'bottom_right': {
          x: 100,
          y: 100
        }
      },
      'display_count': 1,
      'adUnitCode': 'div-gpt-ad-1460505748561-123'
    },
    'banner': [{
      'w': 300,
      'h': 251
    }],
    'all': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    }
  }],
  'ortb2': {
    'regs': {
      'gpp': 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN',
      'gpp_sid': [5, 7],
    }
  },
  'tmax': config.getConfig('bidderTimeout')
};
describe('Media.net bid adapter', function () {
  let sandbox;
  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(window.top, 'innerHeight').value(780)
    sandbox.stub(window.top, 'innerWidth').value(440)
    sandbox.stub(window.top, 'scrollY').value(100)
    sandbox.stub(window.top, 'scrollX').value(50)
  });

  afterEach(function () {
    resetWinDimensions();
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    it('should accept valid bid params', function () {
      const isValid = spec.isBidRequestValid(VALID_PARAMS);
      expect(isValid).to.equal(true);
    });

    it('should reject bid if cid is not present', function () {
      const isValid = spec.isBidRequestValid(PARAMS_WITHOUT_CID);
      expect(isValid).to.equal(false);
    });

    it('should reject bid if cid is not a string', function () {
      const isValid = spec.isBidRequestValid(PARAMS_WITH_INTEGER_CID);
      expect(isValid).to.equal(false);
    });

    it('should reject bid if cid is a empty string', function () {
      const isValid = spec.isBidRequestValid(PARAMS_WITH_EMPTY_CID);
      expect(isValid).to.equal(false);
    });

    it('should have missing params', function () {
      const isValid = spec.isBidRequestValid(PARAMS_MISSING);
      expect(isValid).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    beforeEach(function () {
      getGlobal().medianetGlobals = {};

      const documentStub = sandbox.stub(document, 'getElementById');
      const boundingRect = {
        top: 50,
        left: 50,
        bottom: 100,
        right: 100
      };
      documentStub.withArgs('div-gpt-ad-1460505748561-123').returns({
        getBoundingClientRect: () => boundingRect
      });
      documentStub.withArgs('div-gpt-ad-1460505748561-0').returns({
        getBoundingClientRect: () => boundingRect
      });
      const windowSizeStub = sandbox.stub(spec, 'getWindowSize');
      windowSizeStub.returns({
        w: 1000,
        h: 1000
      });
    });

    it('should build valid payload on bid', function () {
      const requestObj = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
      expect(JSON.parse(requestObj.data)).to.deep.include(VALID_PAYLOAD);
    });

    it('should accept size as a one dimensional array', function () {
      const bidReq = spec.buildRequests(BID_REQUEST_SIZE_AS_1DARRAY, VALID_AUCTIONDATA);
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD);
    });

    it('should ignore bidfloor if not a valid number', function () {
      const bidReq = spec.buildRequests(VALID_BID_REQUEST_INVALID_BIDFLOOR, VALID_AUCTIONDATA);
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD_INVALID_BIDFLOOR);
    });

    it('should add gdpr to response ext', function () {
      const bidReq = spec.buildRequests(VALID_BID_REQUEST, VALID_BIDDER_REQUEST_WITH_GDPR);
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD_FOR_GDPR);
    });

    it('should have gpp params in ortb2', function () {
      const bidReq = spec.buildRequests(VALID_BID_REQUEST, VALID_BIDDER_REQUEST_WITH_GPP_IN_ORTB2);
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD_FOR_GPP_ORTB2);
    });

    it('should parse params for native request', function () {
      const bidReq = spec.buildRequests(VALID_NATIVE_BID_REQUEST, VALID_AUCTIONDATA);
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD_NATIVE);
    });

    it('should parse params for video request', function () {
      const bidReq = spec.buildRequests(VALID_VIDEO_BID_REQUEST, VALID_AUCTIONDATA);
      expect(JSON.stringify(bidReq.data)).to.include('instream');
    });

    it('should have valid crid present in bid request', function() {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        const config = {
          'coppa': true
        };
        return config[key];
      });
      const bidreq = spec.buildRequests(VALID_BID_REQUEST_WITH_CRID, VALID_AUCTIONDATA);
      expect(JSON.parse(bidreq.data)).to.deep.equal(VALID_PAYLOAD_WITH_CRID);
    });

    it('should have valid ortb2Imp param present in bid request', function() {
      let bidreq = spec.buildRequests(VALID_BID_REQUEST_WITH_ORTB2, VALID_AUCTIONDATA);
      let actual = JSON.parse(bidreq.data).imp[0].ortb2Imp;
      const expected = VALID_BID_REQUEST_WITH_ORTB2[0].ortb2Imp
      assert.equal(JSON.stringify(actual), JSON.stringify(expected))

      bidreq = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
      actual = JSON.parse(bidreq.data).imp[0].ortb2Imp;
      expect(actual).to.deep.equal(VALID_BID_REQUEST[0].ortb2Imp);
    });

    it('should have userid in bid request', function () {
      const bidReq = spec.buildRequests(VALID_BID_REQUEST_WITH_USERID, VALID_AUCTIONDATA);
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD_WITH_USERID);
    });

    it('should have userIdAsEids in bid request', function () {
      const bidReq = spec.buildRequests(VALID_BID_REQUEST_WITH_USERIDASEIDS, VALID_AUCTIONDATA);
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD_WITH_USERIDASEIDS);
    });

    it('should have valid payload when PAAPI is enabled', function () {
      const bidReq = spec.buildRequests(VALID_BID_REQUEST_WITH_AE_IN_ORTB2IMP, {...VALID_AUCTIONDATA, paapi: {enabled: true}});
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD_PAAPI);
    });

    it('should send whatever is set in ortb2imp.ext.ae in all bid requests when PAAPI is enabled', function () {
      const bidReq = spec.buildRequests(VALID_BID_REQUEST_WITH_AE_IN_ORTB2IMP, {...VALID_AUCTIONDATA, paapi: {enabled: true}});
      const data = JSON.parse(bidReq.data);
      expect(data).to.deep.equal(VALID_PAYLOAD_PAAPI);
      expect(data.imp[0].ext).to.have.property('ae');
      expect(data.imp[0].ext.ae).to.equal(1);
    });

    describe('build requests: when page meta-data is available', () => {
      beforeEach(() => {
        spec.clearPageMeta();
      });

      it('should pass canonical, twitter and fb parameters if available', () => {
        const documentStub = sandbox.stub(window.top.document, 'querySelector');
        documentStub.withArgs('link[rel="canonical"]').returns({
          href: 'http://localhost:9999/canonical-test'
        });
        documentStub.withArgs('meta[property="og:url"]').returns({
          content: 'http://localhost:9999/fb-test'
        });
        documentStub.withArgs('meta[name="twitter:url"]').returns({
          content: 'http://localhost:9999/twitter-test'
        });
        const bidReq = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
        expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD_PAGE_META);
      });
    });
  });

  describe('slot visibility', function () {
    let documentStub;
    beforeEach(function () {
      const windowSizeStub = sandbox.stub(spec, 'getWindowSize');
      windowSizeStub.returns({
        w: 1000,
        h: 1000
      });
      documentStub = sandbox.stub(document, 'getElementById');
    });
    it('slot visibility should be 2 and ratio 0 when ad unit is BTF', function () {
      const boundingRect = {
        top: 1010,
        left: 1010,
        bottom: 1050,
        right: 1050
      };
      documentStub.withArgs('div-gpt-ad-1460505748561-123').returns({
        getBoundingClientRect: () => boundingRect
      });
      documentStub.withArgs('div-gpt-ad-1460505748561-0').returns({
        getBoundingClientRect: () => boundingRect
      });

      const bidReq = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
      const data = JSON.parse(bidReq.data);
      expect(data.imp[0].ext.visibility).to.equal(2);
      expect(data.imp[0].ext.viewability).to.equal(0);
    });
    it('slot visibility should be 2 and ratio < 0.5 when ad unit is partially inside viewport', function () {
      const boundingRect = {
        top: 990,
        left: 990,
        bottom: 1050,
        right: 1050
      };
      documentStub.withArgs('div-gpt-ad-1460505748561-123').returns({
        getBoundingClientRect: () => boundingRect
      });
      documentStub.withArgs('div-gpt-ad-1460505748561-0').returns({
        getBoundingClientRect: () => boundingRect
      });
      const bidReq = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
      const data = JSON.parse(bidReq.data);
      expect(data.imp[0].ext.visibility).to.equal(2);
      expect(data.imp[0].ext.viewability).to.equal(100 / 75000);
    });
    it('slot visibility should be 1 and ratio > 0.5 when ad unit mostly in viewport', function () {
      const boundingRect = {
        top: 800,
        left: 800,
        bottom: 1050,
        right: 1050
      };
      documentStub.withArgs('div-gpt-ad-1460505748561-123').returns({
        getBoundingClientRect: () => boundingRect
      });
      documentStub.withArgs('div-gpt-ad-1460505748561-0').returns({
        getBoundingClientRect: () => boundingRect
      });
      const bidReq = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
      const data = JSON.parse(bidReq.data);
      expect(data.imp[0].ext.visibility).to.equal(1);
      expect(data.imp[0].ext.viewability).to.equal(40000 / 75000);
    });
    it('co-ordinates should not be sent and slot visibility should be 0 when ad unit is not present', function () {
      const bidReq = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
      const data = JSON.parse(bidReq.data);
      expect(data.imp[1].ext).to.not.have.ownPropertyDescriptor('viewability');
      expect(data.imp[1].ext.visibility).to.equal(0);
    });
    it('slot visibility should be calculable even in case of adUnitPath', function () {
      const code = '/19968336/header-bid-tag-0';
      const divId = 'div-gpt-ad-1460505748561-0';
      window.googletag.pubads().setSlots([makeSlot({ code, divId })]);

      const boundingRect = {
        top: 1010,
        left: 1010,
        bottom: 1050,
        right: 1050
      };
      documentStub.withArgs(divId).returns({
        getBoundingClientRect: () => boundingRect
      });
      documentStub.withArgs('div-gpt-ad-1460505748561-123').returns({
        getBoundingClientRect: () => boundingRect
      });

      const bidRequest = [{...VALID_BID_REQUEST[0], adUnitCode: code}]
      const bidReq = spec.buildRequests(bidRequest, VALID_AUCTIONDATA);
      const data = JSON.parse(bidReq.data);
      expect(data.imp[0].ext.visibility).to.equal(2);
      expect(data.imp[0].ext.viewability).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    it('should exclude iframe syncs if iframe is disabled', function () {
      const userSyncs = spec.getUserSyncs(SYNC_OPTIONS_PIXEL_ENABLED, SERVER_CSYNC_RESPONSE);
      expect(userSyncs).to.deep.equal(ENABLED_SYNC_PIXEL);
    });

    it('should exclude pixel syncs if pixel is disabled', function () {
      const userSyncs = spec.getUserSyncs(SYNC_OPTIONS_IFRAME_ENABLED, SERVER_CSYNC_RESPONSE);
      expect(userSyncs).to.deep.equal(ENABLED_SYNC_IFRAME);
    });

    it('should choose iframe sync urls if both sync options are enabled', function () {
      const userSyncs = spec.getUserSyncs(SYNC_OPTIONS_BOTH_ENABLED, SERVER_CSYNC_RESPONSE);
      expect(userSyncs).to.deep.equal(ENABLED_SYNC_IFRAME);
    });

    it('should have empty user sync array', function() {
      const userSyncs = spec.getUserSyncs(SYNC_OPTIONS_IFRAME_ENABLED, {});
      expect(userSyncs).to.deep.equal([]);
    });
  });

  describe('interpretResponse', function () {
    it('should not push bid response if cpm missing', function () {
      const validBids = [];
      const bids = spec.interpretResponse(SERVER_RESPONSE_CPM_MISSING, []);
      expect(bids).to.deep.equal(validBids);
    });

    it('should not push bid response if cpm 0', function () {
      const validBids = [];
      const bids = spec.interpretResponse(SERVER_RESPONSE_CPM_ZERO, []);
      expect(bids).to.deep.equal(validBids);
    });

    it('should not push response if no-bid', function () {
      const validBids = [];
      const bids = spec.interpretResponse(SERVER_RESPONSE_NOBID, []);
      expect(bids).to.deep.equal(validBids);
    });

    it('should have empty bid response', function() {
      const bids = spec.interpretResponse(SERVER_RESPONSE_NOBODY, []);
      expect(bids).to.deep.equal([]);
    });

    it('should have valid bids', function () {
      const bids = spec.interpretResponse(SERVER_RESPONSE_VALID_BID, []);
      expect(bids).to.deep.equal(SERVER_VALID_BIDS);
    });

    it('should have empty bid list', function() {
      const validBids = [];
      const bids = spec.interpretResponse(SERVER_RESPONSE_EMPTY_BIDLIST, []);
      expect(bids).to.deep.equal(validBids);
    });

    it('should return paapi if PAAPI response is received', function() {
      const response = spec.interpretResponse(SERVER_RESPONSE_PAAPI, []);
      expect(response).to.have.property('bids');
      expect(response).to.have.property('paapi');
      expect(response.paapi[0]).to.deep.equal(SERVER_RESPONSE_PAAPI.body.ext.paApiAuctionConfigs[0]);
    });

    it('should return paapi if openRTB PAAPI response received', function () {
      const response = spec.interpretResponse(SERVER_RESPONSE_PAAPI_ORTB, []);
      expect(response).to.have.property('bids');
      expect(response).to.have.property('paapi');
      expect(response.paapi[0]).to.deep.equal(SERVER_RESPONSE_PAAPI_ORTB.body.ext.igi[0].igs[0])
    });

    it('should have the correlation between paapi[0].bidId and bidreq.imp[0].id', function() {
      const bidReq = spec.buildRequests(VALID_BID_REQUEST_WITH_AE_IN_ORTB2IMP, {...VALID_AUCTIONDATA, paapi: {enabled: true}});
      const bidRes = spec.interpretResponse(SERVER_RESPONSE_PAAPI, []);
      expect(bidRes.paapi[0].bidId).to.equal(JSON.parse(bidReq.data).imp[0].id)
    });

    it('should have the correlation between paapi[0].bidId and bidreq.imp[0].id for openRTB response', function() {
      const bidReq = spec.buildRequests(VALID_BID_REQUEST_WITH_AE_IN_ORTB2IMP, {...VALID_AUCTIONDATA, paapi: {enabled: true}});
      const bidRes = spec.interpretResponse(SERVER_RESPONSE_PAAPI_ORTB, []);
      expect(bidRes.paapi[0].bidId).to.equal(JSON.parse(bidReq.data).imp[0].id)
    });
  });

  describe('onTimeout', function () {
    it('onTimeout exist as a function', () => {
      assert.typeOf(spec.onTimeout, 'function');
    });
    it('should send timeout data correctly', function () {
      const timeoutData = [{
        bidder: 'medianet',
        bidId: 'mnet-4644-442a-b5e0-93f268cf8d19',
        adUnitCode: 'adUnit-code',
        timeout: 3000,
        auctionId: '12a34b56c'
      }];
      sandbox.stub(window.navigator, 'sendBeacon').returns(false);

      spec.onTimeout(timeoutData);
      const reqBody = new URLSearchParams(server.requests[0].requestBody);

      assert.equal(server.requests[0].method, 'POST');
      assert.equal(server.requests[0].url, POST_ENDPOINT);
      assert.equal(reqBody.get('event'), EVENTS.TIMEOUT_EVENT_NAME);
      assert.equal(reqBody.get('rd'), timeoutData[0].timeout.toString());
      assert.equal(reqBody.get('acid[]'), timeoutData[0].auctionId);
    });
  });

  describe('onBidWon', function () {
    it('onBidWon exist as a function', () => {
      assert.typeOf(spec.onBidWon, 'function');
    });
    it('should send winning bid data correctly', function () {
      const bid = {
        bidder: 'medianet',
        bidId: 'mnet-4644-442a-b5e0-93f268cf8d19',
        adUnitCode: 'adUnit-code',
        timeout: 3000,
        auctionId: '12a34b56c',
        cpm: 12.24
      };
      sandbox.stub(window.navigator, 'sendBeacon').returns(false);

      spec.onBidWon(bid);
      const reqBody = new URLSearchParams(server.requests[0].requestBody);

      assert.equal(server.requests[0].method, 'POST');
      assert.equal(server.requests[0].url, POST_ENDPOINT);
      assert.equal(reqBody.get('event'), EVENTS.BID_WON_EVENT_NAME);
      assert.equal(reqBody.get('value'), bid.cpm.toString());
      assert.equal(reqBody.get('acid[]'), bid.auctionId);
    });
  });

  describe('onSetTargeting', function () {
    it('onSetTargeting exist as a function', () => {
      assert.typeOf(spec.onSetTargeting, 'function');
    });
    it('should send targeting data correctly', function () {
      const bid = {
        bidder: 'medianet',
        bidId: 'mnet-4644-442a-b5e0-93f268cf8d19',
        adUnitCode: 'adUnit-code',
        timeout: 3000,
        auctionId: '12a34b56c',
        cpm: 12.24
      };
      sandbox.stub(window.navigator, 'sendBeacon').returns(false);
      sandbox.stub(config, 'getConfig').withArgs('enableSendAllBids').returns(false);

      spec.onSetTargeting(bid);
      const reqBody = new URLSearchParams(server.requests[0].requestBody);

      assert.equal(server.requests[0].method, 'POST');
      assert.equal(server.requests[0].url, POST_ENDPOINT);
      assert.equal(reqBody.get('event'), EVENTS.SET_TARGETING);
      assert.equal(reqBody.get('value'), bid.cpm.toString());
      assert.equal(reqBody.get('acid[]'), bid.auctionId);
    });
  });

  describe('onBidderError', function () {
    it('onBidderError exist as a function', () => {
      assert.typeOf(spec.onBidderError, 'function');
    });
    it('should send bidderError data correctly', function () {
      const error = {
        reason: {message: 'Failed to fetch', status: 500},
        timedOut: true,
        status: 0
      }
      const bids = [{
        bidder: 'medianet',
        bidId: 'mnet-4644-442a-b5e0-93f268cf8d19',
        adUnitCode: 'adUnit-code',
        timeout: 3000,
        auctionId: '12a34b56c',
        cpm: 12.24
      }];
      sandbox.stub(window.navigator, 'sendBeacon').returns(false);

      spec.onBidderError({error, bidderRequest: {bids}});
      const reqBody = new URLSearchParams(server.requests[0].requestBody);

      assert.equal(server.requests[0].method, 'POST');
      assert.equal(server.requests[0].url, POST_ENDPOINT);
      assert.equal(reqBody.get('event'), EVENTS.BIDDER_ERROR);
      assert.equal(reqBody.get('rd'), `timedOut:${error.timedOut}|status:${error.status}|message:${error.reason.message}`);
      assert.equal(reqBody.get('acid[]'), bids[0].auctionId);
    });
  });

  it('context should be outstream', function () {
    const bids = spec.interpretResponse(SERVER_VIDEO_OUTSTREAM_RESPONSE_VALID_BID, []);
    expect(bids[0].context).to.equal('outstream');
  });
  describe('buildRequests floor tests', function () {
    let floor;
    const getFloor = function(req) {
      return floor[req.mediaType];
    };
    beforeEach(function () {
      floor = {
        'banner': {
          'currency': 'USD',
          'floor': 1
        }
      };
      getGlobal().medianetGlobals = {};

      const documentStub = sandbox.stub(document, 'getElementById');
      const boundingRect = {
        top: 50,
        left: 50,
        bottom: 100,
        right: 100
      };
      documentStub.withArgs('div-gpt-ad-1460505748561-123').returns({
        getBoundingClientRect: () => boundingRect
      });
      documentStub.withArgs('div-gpt-ad-1460505748561-0').returns({
        getBoundingClientRect: () => boundingRect
      });
      const windowSizeStub = sandbox.stub(spec, 'getWindowSize');
      windowSizeStub.returns({
        w: 1000,
        h: 1000
      });
      VALID_BID_REQUEST[0].getFloor = getFloor;
    });

    it('should build valid payload with floor', function () {
      let requestObj = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
      requestObj = JSON.parse(requestObj.data);
      expect(requestObj.imp[0].hasOwnProperty('bidfloors')).to.equal(true);
    });
  });

  describe('isBidRequestValid trustedstack', function () {
    it('should accept valid bid params', function () {
      const isValid = spec.isBidRequestValid(VALID_PARAMS_TS);
      expect(isValid).to.equal(true);
    });

    it('should reject bid if cid is not present', function () {
      const isValid = spec.isBidRequestValid(PARAMS_WITHOUT_CID_TS);
      expect(isValid).to.equal(false);
    });

    it('should reject bid if cid is not a string', function () {
      const isValid = spec.isBidRequestValid(PARAMS_WITH_INTEGER_CID_TS);
      expect(isValid).to.equal(false);
    });

    it('should reject bid if cid is a empty string', function () {
      const isValid = spec.isBidRequestValid(PARAMS_WITH_EMPTY_CID_TS);
      expect(isValid).to.equal(false);
    });

    it('should have missing params', function () {
      const isValid = spec.isBidRequestValid(PARAMS_MISSING_TS);
      expect(isValid).to.equal(false);
    });
  });

  describe('interpretResponse trustedstack', function () {
    it('should not push response if no-bid', function () {
      const validBids = [];
      const bids = spec.interpretResponse(SERVER_RESPONSE_NOBID, []);
      expect(bids).to.deep.equal(validBids);
    });

    it('should have empty bid response', function() {
      const bids = spec.interpretResponse(SERVER_RESPONSE_NOBODY, []);
      expect(bids).to.deep.equal([]);
    });

    it('should have valid bids', function () {
      const bids = spec.interpretResponse(SERVER_RESPONSE_VALID_BID, []);
      expect(bids).to.deep.equal(SERVER_VALID_BIDS);
    });

    it('should have empty bid list', function() {
      const validBids = [];
      const bids = spec.interpretResponse(SERVER_RESPONSE_EMPTY_BIDLIST, []);
      expect(bids).to.deep.equal(validBids);
    });
  });
});
