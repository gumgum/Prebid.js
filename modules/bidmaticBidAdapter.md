# Overview

```
Module Name:  Bidmatic Bid Adapter
Module Type:  Bidder Adapter
Maintainer: mg@bidmatic.io
```

# Description

Adds access to Bidmatic SSP oRTB service. 

# Sample Ad Unit: For Publishers
```
var adUnits = [{
    code: 'bg-test-rectangle',    
    sizes: [[300, 250]],     
    bids: [{
        bidder: 'bidmatic',
        params: {
            source: 886409,
            bidfloor: 0.1
        }
    }]
}]
```


# Testing 
```gulp test-only --file=./test/spec/modules/bidmaticBidAdapter_spec.js```
```gulp test-coverage --file=./test/spec/modules/bidmaticBidAdapter_spec.js```
```gulp view-coverage```
