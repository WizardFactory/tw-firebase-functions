/**
 * Created by dhkim2 on 2017-11-17.
 */

const Weather = require('./controller.weather');
const Geocode = require('./google.geocode');

const async = require('async');

class ControllerResponse {
    constructor(requestBody) {
        this.requestBody = requestBody;
        this.action = requestBody.result.action;
        this.parameters = requestBody.result.parameters;
        this.lang = requestBody.lang;
    }

    _getCode(callback) {
        console.info('try to get geo code');
        let geocode = new Geocode();
        console.log(this);
        if (!this.parameters.any) {
            console.error("location(any) information is null");
        }
        if (!this.lang) {
            console.error("language information is null");
        }
        geocode.getGeoInfoByName(this.parameters.any, this.lang, function (err, geoInfoList) {
            if (err) {
                return callback(err);
            }
            callback(null, geoInfoList);
        });
    }

    _getWeather(geoInfo, callback) {
        console.info(geoInfo);
        this.weather = new Weather(this.lang);
        this.weather.getWeatherByGeoInfo(geoInfo, function (err, result) {
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    }

  _makeResponse(weatherInfo, callback) {
    //console.info(weatherInfo);
    //send prompt(dialog)

    //send fulfiiment
    this.errorFulfillment = this.requestBody.result.fulfillment.speech;
    let msg;
    if (this.action === 'weather') {
        if (this.parameters.date.length > 0) {
            msg = this.weather.getSpecificDayWeather(this.parameters, weatherInfo);
        }
        else if (this.parameters['date-period'].length > 0) {
            msg = this.weather.getSpecificWeekEndWeather(this.parameters, weatherInfo);
        }
        else {
            msg = this.weather.getCurrentWeather(this.parameters, weatherInfo);
        }
    }
    else if (this.action === 'aqi') {
        if (this.parameters.date.length > 0) {
            msg = this.weather.getSpecificDayAQI(this.parameters, weatherInfo);
        }
        else if (this.parameters['date-period'].length > 0) {
            msg = this.weather.getSpecificWeekEndAQI(this.parameters, weatherInfo);
        }
        else {
            msg = this.weather.getCurrentAQI(this.parameters, weatherInfo);
        }
    }
    if (!msg) {
      msg = this.errorFulfillment;
    }

    callback(null, msg);
  }

    _sendResponse(responseToUser, response) {
        console.info(responseToUser);
        if (!responseToUser) {
            responseToUser = this.errorFulfillment;
        }

        let responseJson = {};

        if (typeof responseToUser === 'string') {
            responseJson.speech = responseToUser; // spoken response
            responseJson.displayText = responseToUser; // displayed response
        } else {
            // If the response to the user includes rich responses or contexts send them to Dialogflow
            // If speech or displayText is defined, use it to respond (if one isn't defined use the other's value)
            responseJson.speech = responseToUser.speech || responseToUser.displayText;
            responseJson.displayText = responseToUser.displayText || responseToUser.speech;

            // Optional: add rich messages for integrations (https://dialogflow.com/docs/rich-messages)
            responseJson.data = responseToUser.richResponses;

            // Optional: add contexts (https://dialogflow.com/docs/contexts)
            responseJson.contextOut = responseToUser.outputContexts;
        }
        console.info(responseJson);
        response.json(responseJson); // Send response to Dialogflow
    }

    send(response) {
        let self = this;
        if (!this.parameters) {
            console.error("Parameters is null");
        }

        async.waterfall([
                function (callback) {
                    self._getCode(callback);
                },
                function (geoInfoList, callback) {
                    if (geoInfoList.length == 1) {
                        self._getWeather(geoInfoList[0], callback);
                    }
                    else {
                       //try dialog for select city
                    }
                },
                function (weatherInfo, callback) {
                    self._makeResponse(weatherInfo, callback);
                }],
            function (err, responseToUser) {
                if (err) {
                    console.error(err);
                }
                self._sendResponse(responseToUser, response);
            });
    }
}

module.exports = ControllerResponse;

