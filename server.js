// server.js
//
// Use this sample code to handle webhook events
// 1) Paste this code into a new file (server.js)
//
// 2) npm init
//
// 3) Install dependencies
//   npm install --save express
//   npm install --save crypto
//
// 4) Run the server on http://localhost:8008
//   npm start (start script in package.json must point to server.js)

require("dotenv").config({
  path: `.env.${process.env.ENVIRONMENT || "development"}.local`,
});

const express = require("express");
const crypto = require("crypto");
const app = express();

const { Mailchain } = require("@mailchain/sdk");
const mailchain = Mailchain.fromSecretRecoveryPhrase(
  process.env.SECRET_RECOVERY_PHRASE
);

// replace this with key taken from dashboard for specific webhook
// if you are testing webhook before creation set it on empty string
const signingKey = "xndH453oZnASnn2BnCRGZntWpUXqjBHB";

app.get("/webhook", (req, res) => {
  res.send("success");
});

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    const signature = request.headers["x-tenderly-signature"];
    const timestamp = request.headers["date"];

    if (!isValidSignature(signature, request.body, timestamp)) {
      response.status(400).send("Webhook signature not valid");
      return;
    }

    let body;
    try {
      body = JSON.parse(request.body.toString());
    } catch (e) {
      response.status(400).send("Webhook error: ", e);
      return;
    }
    const eventType = body.event_type;

    switch (eventType) {
      case "TEST":
        // Then define and call a function to handle the test event
        const { data, error } = await mailchain.sendMail({
          from: "0x34a11016349340cb3eb7d40c473f99e077a9e70d@ethereum.mailchain.com",
          to: "0x34a11016349340cb3eb7d40c473f99e077a9e70d@ethereum.mailchain.com",
          subject: "Webhook Test",
          content: {
            text: `The webhook body:\n${JSON.stringify(body, null, 2)}`,
            html: `<p>The webhook body:</p><pre>${JSON.stringify(
              body,
              null,
              2
            )}</pre>`,
          },
        });
        if (error) {
          throw new Error("Mailchain error", { cause: error });
        }
        break;
      case "ALERT":
        // Then define and call a function to handle the alert event
        break;
      // ... handle other event types
      default:
        console.log("Unhandled event type ", eventType);
    }

    // Return a 200 response
    response.send();
  }
);

const port = 8008;
app.listen(port, () => console.log("Running on port ", port));

function isValidSignature(signature, body, timestamp) {
  const hmac = crypto.createHmac("sha256", signingKey); // Create a HMAC SHA256 hash using the signing key
  hmac.update(body.toString(), "utf8"); // Update the hash with the request body using utf8
  hmac.update(timestamp); // Update the hash with the request timestamp
  const digest = hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
