/**
 * Created by dhkim2 on 2017-11-14.
 */

const ControllerReponse = require('./controller.response');

class ControllerGoogleResponse extends ControllerReponse {

    /**
     *
     * @param responseToUser
     * @param app
     * @returns {Object|null|*|Object}
     * @private
     */
    _sendResponse(responseToUser, app) {
        console.info(responseToUser);
        if (!responseToUser) {
            return app.ask(this.errorFulfillment);
        }
        if (typeof responseToUser === 'string') {
            return app.ask(responseToUser); // Google Assistant response
        }

        let googleResponse;

        if (responseToUser.googleRichResponse) {
            googleResponse = responseToUser.googleRichResponse;
        }
        else {
            // If speech or displayText is defined use it to respond
            googleResponse = app.buildRichResponse().addSimpleResponse({
                speech: responseToUser.speech || responseToUser.displayText,
                displayText: responseToUser.displayText || responseToUser.speech
            });
        }

        // Optional: add contexts (https://dialogflow.com/docs/contexts)
        if (responseToUser.googleOutputContexts) {
            app.setContext(...responseToUser.googleOutputContexts);
        }

        app.ask(googleResponse); // Send response to Dialogflow and Google Assistant
    }

    //send(app)
}

module.exports = ControllerGoogleResponse;

