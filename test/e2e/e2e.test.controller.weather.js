/**
 * Created by aleckim on 2017-11-27.
 */

'use strict';

const expect = require('chai').expect;

const ControllerWeather = require('../../controller.weather');

describe('controller weather', function () {
    it ('test weather', function (done) {
        this.timeout(10*1000);
        let weather = new ControllerWeather();
        let geoInfo = {
            location: {lat: 35.829, lng: 128.553},
            country: "KR",
            address: "대한민국 대구광역시 달서구 송현1동"
        };

        weather.getWeatherByGeoInfo(geoInfo, function (err, result) {
            if (err) {
               console.error(err);
            }
            else {
               //console.info(result) ;
            }
            done();
        });
    });
});
