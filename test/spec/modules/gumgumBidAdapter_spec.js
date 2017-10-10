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
          'inSlot': '789'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('sends bid request to ENDPOINT via POST', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });
  })

  // describe('interpretResponse', () => {
  //   let response = {
  //     'version': '3.0.0',
  //     'tags': [
  //       {
  //         'uuid': '3db3773286ee59',
  //         'tag_id': 10433394,
  //         'auction_id': '4534722592064951574',
  //         'nobid': false,
  //         'no_ad_url': 'http://lax1-ib.adnxs.com/no-ad',
  //         'timeout_ms': 10000,
  //         'ad_profile_id': 27079,
  //         'ads': [
  //           {
  //             'content_source': 'rtb',
  //             'ad_type': 'banner',
  //             'buyer_member_id': 958,
  //             'creative_id': 29681110,
  //             'media_type_id': 1,
  //             'media_subtype_id': 1,
  //             'cpm': 0.5,
  //             'cpm_publisher_currency': 0.5,
  //             'publisher_currency_code': '$',
  //             'client_initiated_ad_counting': true,
  //             'rtb': {
  //               'banner': {
  //                 'content': '<!-- Creative -->',
  //                 'width': 300,
  //                 'height': 250
  //               },
  //               'trackers': [
  //                 {
  //                   'impression_urls': [
  //                     'http://lax1-ib.adnxs.com/impression'
  //                   ],
  //                   'video_events': {}
  //                 }
  //               ]
  //             }
  //           }
  //         ]
  //       }
  //     ]
  //   };

  //   it('should get correct bid response', () => {
  //     let expectedResponse = [
  //       {
  //         'requestId': '3db3773286ee59',
  //         'cpm': 0.5,
  //         'creative_id': 29681110,
  //         'dealId': undefined,
  //         'width': 300,
  //         'height': 250,
  //         'ad': '<!-- Creative -->',
  //         'mediaType': 'banner'
  //       }
  //     ];

  //     let result = spec.interpretResponse(response);
  //     expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
  //   });

  //   it('handles nobid responses', () => {
  //     let response = {
  //       'version': '0.0.1',
  //       'tags': [{
  //         'uuid': '84ab500420319d',
  //         'tag_id': 5976557,
  //         'auction_id': '297492697822162468',
  //         'nobid': true
  //       }]
  //     };

  //     let result = spec.interpretResponse(response);
  //     expect(result.length).to.equal(0);
  //   });

  //   it('handles non-banner media responses', () => {
  //     let response = {
  //       'tags': [{
  //         'uuid': '84ab500420319d',
  //         'ads': [{
  //           'ad_type': 'video',
  //           'cpm': 0.500000,
  //           'rtb': {
  //             'video': {
  //               'content': '<!-- Creative -->'
  //             }
  //           }
  //         }]
  //       }]
  //     };

  //     let result = spec.interpretResponse(response);
  //     expect(result[0]).to.have.property('vastUrl');
  //     expect(result[0]).to.have.property('descriptionUrl');
  //     expect(result[0]).to.have.property('mediaType', 'video');
  //   });

  //   it('handles native responses', () => {
  //     let response1 = Object.assign({}, response);
  //     response1.tags[0].ads[0].ad_type = 'native';
  //     response1.tags[0].ads[0].rtb.native = {
  //       'title': 'Native Creative',
  //       'desc': 'Cool description great stuff',
  //       'ctatext': 'Do it',
  //       'sponsored': 'GumGum',
  //       'icon': {
  //         'width': 0,
  //         'height': 0,
  //         'url': 'http://cdn.adnxs.com/icon.png'
  //       },
  //       'main_img': {
  //         'width': 2352,
  //         'height': 1516,
  //         'url': 'http://cdn.adnxs.com/img.png'
  //       },
  //       'link': {
  //         'url': 'https://www.appnexus.com',
  //         'fallback_url': '',
  //         'click_trackers': ['http://nym1-ib.adnxs.com/click']
  //       },
  //       'impression_trackers': ['http://example.com'],
  //     };

  //     let result = spec.interpretResponse(response1);
  //     expect(result[0].native.title).to.equal('Native Creative');
  //     expect(result[0].native.body).to.equal('Cool description great stuff');
  //     expect(result[0].native.cta).to.equal('Do it');
  //     expect(result[0].native.image).to.equal('http://cdn.adnxs.com/img.png');
  //   });
  // });
});
