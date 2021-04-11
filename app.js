const fs = require("fs");
const { resolve } = require("path");
const express = require("express");
var bodyParser = require("body-parser");
const OAuth2Data = require("./credentials.json");

const { google } = require("googleapis");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);
var authed = false;

// If modifying these scopes, delete token.json.
const SCOPES =
  "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile";

app.set("view engine", "ejs");

const textFile = resolve("./textinput.txt");
let textInput = "The input text is ";

try {
  textInput = require(textFile);
} catch (e) {
  saveEntries(textInput, textFile);
  console.log(`Created '${textFile}'  file .`);
}

function saveEntries(entries, file) {
  // const stringifiedEntries = JSON.stringify(entries, null, 2);
  fs.writeFileSync(file, entries);
}

app.get("/", (req, res) => {
  if (!authed) {
    // Generate an OAuth URL and redirect there
    var url = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    // console.log(url);
    res.render("index", { url: url });
  } else {
    res.render("success", {
      success: false,
    });
  }
});

app.post("/upload", (req, respond) => {
  const input = req.body.text;
  // console.log(input);
  textInput = textInput + input + ".";
  saveEntries(textInput, textFile);
  const drive = google.drive({ version: "v3", auth: oAuth2Client });
  const fileMetadata = {
    // name: req.file.filename,
    name: "textinput.txt",
  };
  const media = {
    // mimeType: req.file.mimetype,
    // body: fs.createReadStream(req.file.path),
    mimeType: "text/plain",
    body: fs.createReadStream("textinput.txt"),
  };
  drive.files.create(
    {
      resource: fileMetadata,
      media: media,
      fields: "id",
    },
    (err, res) => {
      if (err) {
        // Handle error
        console.error(err);
      } else {
        // fs.unlinkSync(req.file.path);
        // console.log(res);
        respond.render("success", {
          success: true,
        });
      }
    }
  );
});

app.get("/logout", (req, res) => {
  authed = false;
  res.redirect("/");
});

app.get("/google/callback", function (req, res) {
  const code = req.query.code;
  if (code) {
    // Get an access token based on our OAuth code
    oAuth2Client.getToken(code, function (err, tokens) {
      if (err) {
        console.log("Error authenticating");
        console.log(err);
      } else {
        console.log("Successfully authenticated");
        oAuth2Client.setCredentials(tokens);
        authed = true;
        res.redirect("/");
      }
    });
  }
});

app.listen(3000, () => {
  console.log("App is listening on Port 3000");
});
