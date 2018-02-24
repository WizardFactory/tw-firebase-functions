/**
 * Created by dhkim2 on 2017-11-16.
 */

'use strict';

const expect = require('chai').expect;

const GoogleResponse = require('../controller.google.response');

describe('google response', function () {
    it ('test response', function (done) {
        this.timeout(10*1000);
        let requestBody = {
            lang: "ko",
            result: {
                parameters: {
                    any:"서울",
                    date:""
                },
                fulfillment: {
                    speech: "XXXXX"
                }
            }
        };

        let googleResponse = new GoogleResponse(requestBody);
        let app = {
            ask: function (msg) {
                console.info(msg);
                done();
            }
        };

        googleResponse.send(app);
    });
});

