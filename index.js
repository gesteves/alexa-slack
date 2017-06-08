const Alexa = require('alexa-sdk');
const request = require('request-promise-native');
const moment = require('moment');

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
  'SlackAwayIntent': slackAwayIntentHandler,
  'SlackStatusIntent': slackStatusIntentHandler,
  'SlackClearStatusIntent': slackClearStatusIntentHandler,
  'SlackSnoozeIntent': slackSnoozeIntentHandler,
  'Unhandled': unhandledIntentHandler,
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
 * Handles an `SlackAwayIntent`, sent when the user requests their presence
 * to be set to away or active.
 */
function slackAwayIntentHandler() {
  let status = this.event.request.intent.slots.awaystatus.value;
  let access_token = this.event.session.user.accessToken;

  if (!access_token) {
    this.emit(':tellWithLinkAccountCard', 'Please connect your Slack account to Alexa using the Alexa app on your phone.');
  }

  if (!status) {
    this.emit(':elicitSlot', 'awaystatus', 'Would you like me to set you to away or active?', "I'm sorry, I didn't hear you. Could you say that again?");
  }

  setSlackPresence(status, access_token).
    then(() => { this.emit(':tell', `Okay, I'll set you to ${status}`); }).
    catch(error => { this.emit(':tell', `I'm sorry, I couldn't set your presence. Slack responded with the following error: ${error.message}`); });
}

/**
 * Handles an `SlackAwayIntent`, sent when the user requests their status
 * set.
 */
function slackStatusIntentHandler() {
  let status = this.event.request.intent.slots.status.value;
  let access_token = this.event.session.user.accessToken;

  if (!access_token) {
    this.emit(':tellWithLinkAccountCard', 'Please connect your Slack account to Alexa using the Alexa app on your phone.');
  }

  if (!status) {
    this.emit(':elicitSlot', 'status', 'What would you like your status to be?', "I'm sorry, I didn't hear you. Could you say that again?");
  }

  setSlackStatus(status, access_token).
    then(() => { this.emit(':tell', `Okay, I'll set your status to ${status}.`); }).
    catch(error => { this.emit(':tell', `I'm sorry, I couldn't set your status. Slack responded with the following error: ${error.message}`); });
}

/**
 * Handles an `SlackAwayIntent`, sent when the user requests their status
 * be cleared.
 */
function slackClearStatusIntentHandler() {
  let access_token = this.event.session.user.accessToken;

  if (!access_token) {
    this.emit(':tellWithLinkAccountCard', 'Please connect your Slack account to Alexa using the Alexa app on your phone.');
  }

  setSlackStatus('', access_token).
    then(() => { this.emit(':tell', "Okay, I'll clear your status."); }).
    catch(error => { this.emit(':tell', `I'm sorry, I couldn't clear your status. Slack responded with the following error: ${error.message}`); });
}

/**
 * Handles an `SlackSnoozeIntent`, sent when the user sets their DND setting.
 * @todo There's gotta be a better of dealing with timezones. Maybe grab the Echo's
 * address from the Alexa Address API and somehow use it to figure out the timezone.
 */
function slackSnoozeIntentHandler() {
  let access_token = this.event.session.user.accessToken;
  let minutes;
  let requested_time;
  // Apparently there's no way to know the user's timezone,
  // so I'm hardcoding it in an env variable ¯\_(ツ)_/¯
  let utc_offset = process.env.USER_TIMEZONE;
  let now = moment(this.event.request.timestamp).utcOffset(utc_offset);
  let duration;

  if (!access_token) {
    this.emit(':tellWithLinkAccountCard', 'Please connect your Slack account to Alexa using the Alexa app on your phone.');
  }

  if (this.event.request.intent.slots.duration.value) {
    duration = moment.duration(this.event.request.intent.slots.duration.value);
    if (duration.asHours() > 24) {
      this.emit(':ask', "I'm sorry, I can't snooze your notifications for more than a day. How long would you like to snooze your notifications for?", "I'm sorry, I didn't hear you. Could you say that again?");
    }
    minutes = duration.asMinutes();
  } else if (this.event.request.intent.slots.time.value) {
    requested_time = this.event.request.intent.slots.time.value;

    // Alexa can accept utterances like: "night", "morning", "afternoon", "evening".
    // Convert them into reasonable hours.
    switch(requested_time) {
      case 'MO':
        requested_time = '09:00';
        break;
      case 'AF':
        requested_time = '13:00';
        break;
      case 'EV':
        requested_time = '19:00';
        break;
      case 'NI':
        requested_time = '21:00';
        break;
    }

    requested_time = moment(`${requested_time}Z`, 'HH:mmZ').utcOffset(utc_offset, true);

    // If the requested time is earlier than the current time, add one day.
    if (now > requested_time) {
      requested_time.add(1, 'day');
    }

    // Get the difference in minutes between both times.
    minutes = requested_time.diff(now, 'minutes');
  } else {
    // If no time or duration given, assume one hour.
    minutes = 60;
  }

  setSlackDND(minutes, access_token).
    then(() => { this.emit(':tell', `Okay, I'll snooze your notifications for ${moment.duration(minutes, 'minutes').humanize()}.`); }).
    catch(error => { this.emit(':tell', `I'm sorry, I couldn't snooze your notifications. Slack responded with the following error: ${error.message}`); });
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
  text += "<p>To snooze your notifications, say: snooze, followed by the number of minutes you'd like to snooze your notifications for.</p>";
  this.emit(":ask", text, "I'm sorry, I didn't hear you. Could you say that again?");
}

function unhandledIntentHandler() {
  this.emit(':ask', "I didn't get that. What would you like to do?", "I'm sorry, I didn't hear you. Could you say that again?");
}

/**
 * Sets the Slack user's DND.
 * @param {int} minutes The number of minutes to snooze notifications.
 * @param {string} token Slack auth token.
 * @return {Promise} A promise that resolves if the request is successful;
 * or is rejected with an error if it fails.
 */
function setSlackDND(minutes, token) {

  let opts = {
    method: 'POST',
    url: `https://slack.com/api/dnd.setSnooze`,
    form: {
      num_minutes: minutes,
      token: token
    },
    json: true,
    simple: false,
    resolveWithFullResponse: true
  };
  return request(opts).then(response => {
    if (response.statusCode !== 200 || !response.body.ok) {
      return Promise.reject(new Error(response.body.error));
    }
  });
}

/**
 * Sets the Slack user's presence.
 * @param {string} presence The presence, can be away or active.
 * @param {string} token Slack auth token.
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
    if (response.statusCode !== 200 || !response.body.ok) {
      return Promise.reject(new Error(response.body.error));
    }
  });
}

/**
 * Sets the Slack user's status.
 * @param {string} status The user's requested status.
 * @param {string} token Slack auth token.
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
    if (response.statusCode !== 200 || !response.body.ok) {
      return Promise.reject(new Error(response.body.error));
    }
  });
}

/**
 * Returns the profile object the Slack API requires.
 * @param {string} status The user's requested status.
 * @return {Object} An object with the text and emoji for the given status.
 */
function emojifyStatus(status) {
  if (status === '') {
    profile = {
      status_text: '',
      status_emoji: ''
    };
  } else if (status.match(/lunch/)) {
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
  } else if (status.match(/call/)) {
    profile = {
      status_text: 'On a call',
      status_emoji: ':slack_call:'
    };
  } else if (status.match(/meeting/)) {
    profile = {
      status_text: 'In a meeting',
      status_emoji: ':calendar:'
    };
  } else if (status.match(/sick/)) {
    profile = {
      status_text: 'Out sick',
      status_emoji: ':face_with_thermometer:'
    };
  } else if (status.match(/commuting/)) {
    profile = {
      status_text: 'Commuting',
      status_emoji: ':bus:'
    };
  } else {
    profile = {
      status_text: status,
      status_emoji: ':speech_balloon:'
    };
  }
  return profile;
}
