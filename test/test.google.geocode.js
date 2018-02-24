/**
 * Created by dhkim2 on 2017-11-10.
 */

'use strict';

const expect = require('chai').expect;

const GeoCode = require('../google.geocode');

describe('google geocode', function () {
    it ('test geocode', function (done) {
        this.timeout(10*1000);
       let geoCode = new GeoCode();
       geoCode.getGeoInfoByName('중구', 'ko', function (err, addresses) {
          expect(err).to.be.null;
          console.info(addresses);
          done();
       });
    });
});

