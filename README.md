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
