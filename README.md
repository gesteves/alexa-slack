# Alexa Slack

Alexa skill to set presence and status in Slack, built in Node and hosted on AWS Lambda.

## Supported commands

* "Alexa, tell Slack to set me to away", sets your presence to "away".
* "Alexa, tell Slack to set me to active", sets your presence back to "active".
* "Alexa, tell Slack to set my status to `status`", sets your status message to the uttered one. Currently only allows a few commonly used, predefined statuses, which are: `lunch`, `coffee`, `busy`, `errand`, `doctor`, `away`, `call`, `meeting`, `sick`, and `commuting`. Setting it to an arbitrary status is not supported at the moment.
* "Alexa, tell Slack to clear my status", clears the status message.
* "Alexa, tell Slack to snooze my notifications for `duration`", mutes Slack notifications for the spoken duration (e.g. 5 minutes, 2 and a half hours, etc.), up to 24 hours. Notifications are re-enabled after that time.
* "Alexa, tell Slack to snooze my notifications until `time`", mutes Slack notifications until the spoken time (e.g. 3:15 pm, this afternoon, etc.) Notifications are re-enabled at the specified time.
* "Alexa, tell Slack I'm `status` until `time`", sets the status message to the spoken status _and_ mutes Slack notifications until the spoken time (e.g. 3:15 pm, this afternoon, etc.) Super useful for meetings! For example, "tell Slack I'm in a call until 5:00 pm".

## Installation

I can't release this on the Alexa Skills store because I don't have the right to use "Slack" as the invocation name for a public skill, but feel free to fork this repo and set it up as your own skill in development mode for private use. It'll take a bit of work, but you'll have to:

* Set up a new [Slack app](https://api.slack.com/apps), with the `dnd:write`, `users.profile:write`, and `users:write` permission scopes.
* Set up an [Alexa Skills Kit skill](https://developer.amazon.com/edw/home.html#/skills). Use the code in `interaction_model.json` for the skill's interaction model.
* Set up a project in the [Google Developer Console](https://console.developers.google.com). Enable the Google Maps Geocoding API and the Google Maps Time Zone API, and get an API key. (This is how we determine the user's time zone: get the postal code of the Echo, geocode it to a lat/long pair, then get the timezone offset of those coordinates. I wish Amazon made this easier.)
* In the configuration tab, set up [account linking](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/linking-an-alexa-user-with-a-user-in-your-system) using your Slack app's OAuth information. (Pro tip: the "Client Authentication Scheme" option should be "Credentials in request body").
* Also in the configuration tab, check the option to request permission to use "Device Address", specifically the device's postal code & country.
* Set up an [AWS Lambda function](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/developing-an-alexa-skill-as-a-lambda-function) for your Alexa skill. You'll need to set up an `ALEXA_APP_ID` environment variable with your skill's ID; and a `MAPS_API_KEY` env variable with the Google Maps API key you got earlier.
* Clone/fork this repo, run `npm install`, then zip up `index.js`, `package.json`, and the `node_modules` folder, and upload to your Lambda function.
* Enable your skill for testing, then enable it in your Alexa app in your phone. Make sure your Echo has an address set up, and give the skill permission to access it. It should prompt you to sign in with Slack to link your account. If it successfully links your account, you're set!
