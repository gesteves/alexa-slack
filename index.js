const Alexa = require('alexa-sdk');
const request = require('request-promise-native');

exports.handler = function(event, context, callback) {
  const alexa = Alexa.handler(event, context);
  alexa.appId = process.env.ALEXA_APP_ID;
  alexa.registerHandlers(handlers);
  alexa.execute();
};

const handlers = {
  'LaunchRequest': launchRequestHandler,
  'AMAZON.StopIntent': stopIntentHandler,
  'AMAZON.CancelIntent': cancelIntentHandler,
  'AMAZON.HelpIntent': helpIntentHandler,
  'Unhandled': unhandledIntentHandler,
  'SlackAwayIntent': slackAwayIntentHandler,
  'SlackStatusIntent': slackStatusIntentHandler,
  'SlackClearStatusIntent': slackClearStatusIntentHandler
};

/**
 * Handles launch requests, i.e. "Alexa, open [app name]".
 */
function launchRequestHandler() {
  let access_token = this.event.session.user.accessToken;
  if (access_token) {
    this.emit(':ask', 'What would you like to do?', "I'm sorry, I didn't hear you. Could you say that again?");
  } else {
    this.emit(':tellWithLinkAccountCard', "Please connect your Slack account to Alexa using the Alexa app.");
  }
}

/**
 * Handles an `SlackAwayIntent`, which is when the user requests their presence
 * to be set to away or active.
 */
function slackAwayIntentHandler() {
  let status = this.event.request.intent.slots.awaystatus.value;
  let access_token = this.event.session.user.accessToken;

  if (access_token) {
    setSlackPresence(status, access_token).
      then(() => { this.emit(':tell', `Okay, I've set your presence to ${status}`); }).
      catch(error => { this.emit(':tell', error.message); });
  } else {
    this.emit(':tellWithLinkAccountCard', "Please connect your Slack account to Alexa using the Alexa app.");
  }
}

/**
 * Handles an `SlackAwayIntent`, which is when the user requests their status
 * set.
 */
function slackStatusIntentHandler() {
  let status = this.event.request.intent.slots.status.value;
  let access_token = this.event.session.user.accessToken;

  if (access_token) {
    setSlackStatus(status, access_token).
      then(() => { this.emit(':tell', `Okay, I've set your status to: ${status}`); }).
      catch(error => { this.emit(':tell', error.message); });
  } else {
    this.emit(':tellWithLinkAccountCard', "Please connect your Slack account to Alexa using the Alexa app.");
  }
}

/**
 * Handles an `SlackAwayIntent`, which is when the user requests their status
 * be cleared.
 */
function slackClearStatusIntentHandler() {
  let intent = this.event.request.intent;
  let access_token = this.event.session.user.accessToken;

  if (access_token) {
    setSlackStatus('', access_token).
      then(() => { this.emit(':tell', "Okay, I've cleared your status."); }).
      catch(error => { this.emit(':tell', error.message); });
  } else {
    this.emit(':tellWithLinkAccountCard', "Please connect your Slack account to Alexa using the Alexa app.");
  }
}

function stopIntentHandler() {
  this.emit(':tell', "Okay");
}

function cancelIntentHandler() {
  this.emit(':tell', "Okay");
}

function helpIntentHandler() {
  let text = "<p>Here are a few things you can do:</p>";
  text += "<p>To set yourself to away, say: set me to away.</p>";
  text += "<p>To set yourself to active, say: set me to active.</p>";
  text += "<p>To set your status, say: set my status to, followed by whatever you want your status to be.</p>";
  text += "<p>To clear your status, say: clear my status.</p>";
  this.emit(":ask", text, "I'm sorry, I didn't hear you. Could you say that again?");
}

function unhandledIntentHandler() {
  this.emit(':ask', "I didn't get that. What would you like to do?", "I'm sorry, I didn't hear you. Could you say that again?");
}

/**
 * Sets the Slack user's presence.
 * @param {string} presence The presence, can be away or active.
 * @return {Promise} A promise that resolves if the request is successful;
 * or is rejected with an error if it fails.
 */
function setSlackPresence(presence, token) {
  if (presence === 'active') {
    presence = 'auto';
  }

  let opts = {
    method: 'POST',
    url: `https://slack.com/api/users.setPresence`,
    form: {
      presence: presence,
      token: token
    },
    json: true,
    simple: false,
    resolveWithFullResponse: true
  };
  return request(opts).then(response => {
    if (response.statusCode === 200 && response.body.ok) {
      return;
    } else {
      console.log(response.body);
      return Promise.reject(new Error("I'm sorry, I couldn't set your presence. Please try again."));
    }
  });
}

/**
 * Sets the Slack user's status.
 * @param {string} status The user's requested status.
 * @return {Promise} A promise that resolves if the request is successful;
 * or is rejected with an error if it fails.
 */
function setSlackStatus(status, token) {
  let profile = emojifyStatus(status);

  let opts = {
    method: 'POST',
    url: `https://slack.com/api/users.profile.set`,
    form: {
      profile: JSON.stringify(profile),
      token: token
    },
    json: true,
    simple: false,
    resolveWithFullResponse: true
  };
  return request(opts).then(response => {
    if (response.statusCode === 200 && response.body.ok) {
      return;
    } else {
      console.log(response.body);
      return Promise.reject(new Error("I'm sorry, I couldn't set your status. Please try again."));
    }
  });
}

function emojifyStatus(status) {
  if (status.match(/lunch/)) {
    profile = {
      status_text: 'Out for lunch',
      status_emoji: ':taco:'
    };
  } else if (status.match(/coffee/)) {
    profile = {
      status_text: 'Out for coffee',
      status_emoji: ':coffee:'
    };
  } else if (status.match(/busy/)) {
    profile = {
      status_text: 'Do not disturb',
      status_emoji: ':no_entry_sign:'
    };
  } else if (status.match(/errand/)) {
    profile = {
      status_text: 'Running an errand',
      status_emoji: ':running:'
    };
  } else if (status.match(/doctor/)) {
    profile = {
      status_text: 'Doctor\'s appointment',
      status_emoji: ':face_with_thermometer:'
    };
  } else if (status.match(/away/)) {
    profile = {
      status_text: 'AFK',
      status_emoji: ':no_entry_sign:'
    };
  } else if (status === '') {
    profile = {
      status_text: '',
      status_emoji: ''
    };
  } else {
    profile = {
      status_text: status,
      status_emoji: ':speech_balloon:'
    };
  }
  return profile;
}
