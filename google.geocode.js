/**
 * Created by dhkim2 on 2017-11-10.
 */

const request = require('request');

class GeoCode {
    constructor() {
    }

    _request(url, callback) {
        console.log(url);
        request(url, {json:true, timeout: 3000}, function (err, response, body) {
            if (err) {
                return callback(err);
            }
            let results;
            try {
               results = body.results;
            }
            catch (e) {
                return callback(e);
            }
            callback(null, results);
        });
    }

    _findCountryShortName(address_components) {
        var compontent = address_components.find(function (component) {
           if (component.types[0] === 'country' && component.short_name.length == 2)  {
               return true;
           }
           return false;
        });

        return compontent.short_name
    }

    getGeoInfoByName(cityName, lang, callback) {
        let self = this;
        let url = 'https://maps.googleapis.com/maps/api/geocode/json?address='+encodeURIComponent(cityName);
        if (lang) {
            url += '&language='+lang;
        }

        this._request(url, function (err, results) {
            let geoInfoList;
            try {
                if (!Array.isArray(results) || results.length == 0) {
                    throw new Error("Fail to find location name="+cityName);
                }
                geoInfoList = results.map(function (result) {
                    return {
                        address: result.formatted_address,
                        location: result.geometry.location,
                        country: self._findCountryShortName(result.address_components)
                    };
                });
            }
            catch (e) {
                return callback(e);
            }
            callback(null, geoInfoList);
        });
    }
}

module.exports = GeoCode;

