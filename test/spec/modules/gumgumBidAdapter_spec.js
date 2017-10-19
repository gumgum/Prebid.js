import { expect } from 'chai';
import { spec } from 'modules/gumgumBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const ENDPOINT = 'https://g2.gumgum.com/hbid/imp';

describe('gumgumAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'gumgum',
      'params': {
        'inScreen': '10433394'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'inSlot': '789'
      };

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placementId': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [
      {
        'bidder': 'gumgum',
        'params': {
          'inSlot': '9'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e'
      }
    ];

    it('sends bid request to ENDPOINT via GET', () => {
      const requests = spec.buildRequests(bidRequests);
      const request = requests[0];
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('GET');
      expect(request.id).to.equal('30b31c1838de1e');
    });
  })

  describe('interpretResponse', () => {
    let response = {
      'ad': {
        'id': 29593,
        'width': 300,
        'height': 250,
        'ipd': 2000,
        'markup': '<div style="width:298px;height:248px;background:#fff;display:block;border:1px solid #000;background:#fff url(https://c.gumgum.com/images/logo/all300.png) no-repeat scroll center center">\n<\/div>',
        'ii': true,
        'du': null,
        'price': 0,
        'zi': 0,
        'impurl': 'http://g2.gumgum.com/ad/view/enc/hasR4Y3aDoKInNYRxCfOp-Uatqav0e1W53SJIj9O6H1wz_Fa2GDwdaH95ZNLv7mF-qw9O07jHy8pURLqGxiXoZtG6aNoB5VPCj0CL99KMqM6PqjltEdAYxCSOQDitoBjohKQICAWAZRKpz1SOa6uR-RyuIVXcvFYgEK_iQJhuGdH0z4z1lKDYiToe_acZaNBn37LP2n2Vn0',
        'clsurl': 'http://g2.gumgum.com/ad/close?si=9&t=ggumtest&ab=29593&pv=aa8bbb65-427f-4689-8cee-e3eed0b89eec&pu=http%3A%2F%2Flocalhost%3A9876%2F%3Fid%3D27669636&lt=&to=&ts=1507676828211&er=0.00'
      },
      'pag': {
        't': 'ggumtest',
        'pvid': 'aa8bbb65-427f-4689-8cee-e3eed0b89eec',
        'css': '#GGID ._gBadge._g.Badge {\n    z-index: 1000 !important;\n}\n\n/* DB-4066 */\nhtml { overflow-y: auto }',
        'js': "G.infoFlag = 'japan';\n/* GG-18932 */\nG.samplerate = 100;\nG.loadObj('https://c.gumgum.com/libs/GG-18932.min.js',{type:'s',cb:false});\n/* AT-5020 */\nG.perfSampleRate = 100;\nconsole.log(\"environment\", env);"
      },
      'thms': 10000
    }
    let request = {
      id: 12345,
      sizes: [[300, 250]],
      url: ENDPOINT,
      method: 'GET',
      pi: 3
    }

    it('should get correct bid response', () => {
      let expectedResponse = [
        {
          'requestId': 12345,
          'bidderCode': 'gumgum',
          'cpm': 0,
          'width': 300,
          'height': 250,
          'creativeId': 29593,
          // dealId: DEAL_ID,
          'currency': 'USD',
          'netRevenue': true,
          // ttl: TIME_TO_LIVE,
          // referrer: REFERER,
          'ad': '<div style="width:298px;height:248px;background:#fff;display:block;border:1px solid #000;background:#fff url(https://c.gumgum.com/images/logo/all300.png) no-repeat scroll center center">\n<\/div>'
        }
      ];

      let result = spec.interpretResponse(response, request);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', () => {
      let response = {
        'ad': {},
        'pag': {
          't': 'ggumtest',
          'pvid': 'aa8bbb65-427f-4689-8cee-e3eed0b89eec',
          'css': '#GGID ._gBadge._g.Badge {\n    z-index: 1000 !important;\n}\n\n/* DB-4066 */\nhtml { overflow-y: auto }',
          'js': "G.infoFlag = 'japan';\n/* GG-18932 */\nG.samplerate = 100;\nG.loadObj('https://c.gumgum.com/libs/GG-18932.min.js',{type:'s',cb:false});\n/* AT-5020 */\nG.perfSampleRate = 100;\nconsole.log(\"environment\", env);"
        },
        'thms': 10000
      }
      let result = spec.interpretResponse(response, request);
      expect(result.length).to.equal(0);
    });
  })
});
