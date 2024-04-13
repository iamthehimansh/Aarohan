const { Case_schema, Lawyer_schema, Judge_schema, chatSchema, Witness_schema, Proof_schema, LawyerDetails_schema, JudgeDetails_schema } = require("./model");
const express = require("express");
const bodyParser = require("body-parser");
require('dotenv').config();
const ejs = require("ejs");
const _ = require("lodash");
const { Configuration, OpenAIApi } = require("openai");
const mongoose = require("mongoose");
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static("assets"));

//mongodb connection setup
const url = process.env.url;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 
const LOCALHOST = 3000;
main().catch(err => { console.log(err) });

async function main() {
  try {
    await mongoose.connect(url);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.log("Error connecting to MongoDB:", error);
  }
}

app.use(session({
  secret: 'your secret here',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
  store: new MongoStore({ client: mongoose.connection.getClient() })
}));


//openai setup
const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

let result = "";
let statements = [];

function generateRandomId(length) {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters[Math.floor(Math.random() * characters.length)];
  }
  return result;
}

app.get("/", (req, res) => {
  res.render("index");
});


app.get("/signin", (req, res) => {
  res.render("signin", {emailInvalid: false, passInvalid: false});
});

app.post('/signin', async (req, res) => {
  const credential = req.body;
  console.log('Received credentials:', credential);
  try {
    const foundlist = await LawyerDetails_schema.findOne({ email: credential.email });
    if (!foundlist) {
      console.log('Email not found:', credential.email);
      res.render("signin", { emailInvalid: true, passInvalid: false });
    } else {
      if (foundlist.password === credential.password) {
        console.log('User signed in:', foundlist);
        //session saving details
        request_creds(req, credential);

        res.render("lawyerpage", { user_name: `${foundlist.name} ${foundlist["last-name"]}`, emailInvalid: false });
      } else {
        console.log('Incorrect password entered');
        res.render("signin", { emailInvalid: false, passInvalid: true });
      }
    }
  } catch (err) {
    console.log('Error occurred:', err);
  }
});


app.get("/signout", (req, res)=>{
  res.redirect("/");
})

app.get("/signup", (req, res) => {
  res.render("signup", {emailInvalid: false});
});

let lawyerData;
app.post("/signup", async (req, res) => {
  try {
    
    lawyerData = req.body;
    const foundlist = await LawyerDetails_schema.findOne({ email: lawyerData.email });
    if (foundlist) {
      res.render("signup", { emailInvalid: true });
    } else {
  
      const lawyer_details = new LawyerDetails_schema(lawyerData);
      await lawyer_details.save();
      console.log("Lawyer created successfully!");
      mongoose.connection.close();
      res.render("lawyerpage", { user_name: `${lawyerData.name} ${lawyerData["last-name"]}`, emailInvalid: false });
    }
  } catch (err) {
    console.error(err);
  
    res.status(500).send("An error occurred while creating the lawyer account.");
  }  
});

app.post("/lawyerpage", async (req, res) => {
  try {

    console.log('Email retrieved from session:', req.session.email);
    const case_details = req.body
    case_details.caseId = new mongoose.Types.ObjectId(generateRandomId(12));

    req.session.caseId = case_details.caseId;

    const case_file = new Case_schema(case_details);

    const oppositionLawyerExists = await LawyerDetails_schema.findOne({ email: case_details.email });

    if (oppositionLawyerExists) {

      const opposition_lawyer = new Lawyer_schema(case_details);
      const user = await LawyerDetails_schema.findOne({email: req.session.email });

      const user_detail = new Lawyer_schema({
        ...user.toObject(),
        _id: case_details.caseId,
        caseId: case_details.caseId
      });

      console.log(user)

      case_file.save()
      .then(() => {

        return opposition_lawyer.save();
      })
      .then(() => {
        return user_detail.save()
      })
      .then(() => {
        console.log(`Case filed with id :${case_file._id}`);
        mongoose.connection.close();
        res.redirect("/court");
      })
    } else {
      res.render("lawyerpage", { user_name: `${req.session.name} ${req.session.last_name}`, emailInvalid: true } );
    }

  } catch (err) {
    console.log(err);
    res.status(500).send("Unable to file case.");
  }
    

});

app.get("/pending", async (req, res) => {
  const lawyeremail = req.session.email;
  console.log(`This is session's lawyer email: ${lawyeremail}`)
  const lawyerdata = await Lawyer_schema.findOne({email: lawyeremail})
  const cases = await Case_schema.find({ caseId: lawyerdata.caseId });

  res.render('pending', { cases: cases, user_name: lawyerdata.name });
});


app.get("/court", async (req, res) => {
  const caseDetails = await Case_schema.findOne({ caseId: req.session.caseId });
  const chat = await chatSchema.findOne({ caseId: caseId});
  const lawyer = await Lawyer_schema.findOne({ caseId: caseId, name: { $ne: req.session.name } });
  res.render('court', { chat: chat, lawyer: lawyer, caseDetails: caseDetails ,user_name: req.session.name});
});


// app.post("/court", async (req, res) => {
//   const caseId = req.session.caseId;
//   const caseDetails = await Case_schema.findOne({ caseId: caseId });
//   let chat = await chatSchema.findOne({ caseId: caseId });

//   // Create new chat document if it doesn't exist
//   if (!chat) {
//       chat = new chatSchema({
//           caseId: caseId,
//           message: []
//       });
//       await chat.save();
//   }

//   // Save user's message in chat document
//   const newMessage = {};
//   newMessage[req.session.name] = req.body.text;
//   await chatSchema.findOneAndUpdate(
//       { caseId: caseId },
//       { $push: { message: newMessage } }
//   );

//   // Retrieve updated chat document
//   chat = await chatSchema.findOne({ caseId: caseId });
//   const lawyer = await Lawyer_schema.findOne({ caseId: caseId, name: { $ne: req.session.name } });

//   res.render('court', { chat: chat, lawyer: lawyer, caseDetails: caseDetails ,user_name: req.session.name});

// });

app.post("/court", async (req, res) => {
  const email = req.cookies.userEmail;
  const lawyerdata = await Lawyer_schema.findOne({email: email});
  const caseId = lawyerdata.caseId;
  
  const caseDetails = await Case_schema.findOne({ caseId: caseId });
  let chat = await chatSchema.findOne({ caseId: caseId });

  if (!chat) {
      chat = new chatSchema({
          caseId: caseId,
          message: []
      });
      await chat.save();
  }

  const newMessage = {};
  newMessage[lawyerdata.name] = req.body.text;
  await chatSchema.findOneAndUpdate(
      { caseId: caseId },
      { $push: { message: newMessage } }
  );

  chat = await chatSchema.findOne({ caseId: caseId });
  const oppositionLawyer = await Lawyer_schema.findOne({ caseId: caseId, name: { $ne: lawyerdata.name } });

  // Fetch messages from MongoDB and push them to a list
  const messages = [];
  for (let message of chat.message) {
    for (let [name, text] of Object.entries(message)) {
      messages.push({ role: name === lawyerdata.name ? "user" : "oppositionLawyer", content: text });
    }
  }

  let gptResponse = "";
  // If there are more than 6 messages, pass them to the GPT-3 model
  if (messages.length > 6) {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messages.slice(-6),  // Pass only the last 6 messages
    });

    gptResponse = completion.data.choices[0].message.content;
  }

  res.render('court', { chat: chat, lawyer: oppositionLawyer, caseDetails: caseDetails ,user_name: lawyerdata.name, gptResponse: gptResponse});
});


app.listen(LOCALHOST, () => {
  console.log(`Server is running on port ${LOCALHOST}`);
});

function request_creds(req, credential) {
  req.session.email = credential.email;
  req.session.name = credential.name;
  req.session.last_name = credential["last-name"];
  console.log('Email set in session:', req.session.email);
}

 // const message = req.body;
  // statements.push(message);
  // console.log(statements);

  // const formattedStatements = statements.map(statement => JSON.stringify(statement));
  // const joinedStatements = formattedStatements.join('\n');

  // async function main() {
  //   try {
  //     const completion = await openai.createChatCompletion({
  //       model: "gpt-3.5-turbo",
  //       messages: [
  //         { role: "assistant", content: "Read the lawyer 1 and lawyer 2 statements and pass judgment." },
  //         { role: "user", content: joinedStatements },
  //       ],
  //     });

  //     result = completion.data.choices[0].message.content;
  //     res.render("court", { responseData: result, statements: statements });
  //   } catch (error) {
  //     let errorMessage = "Error occurred.";

  //     if (error.responseData && error.responseData.data && error.responseData.data.error) {
  //       errorMessage = error.responseData.data.error.message;
  //     }

  //     console.error("Error:", errorMessage);
  //     res.status(500).send(errorMessage);
  //   }
  // }

  // if (statements.length > 5) {
  //   main();
  // } else {
  //   res.render("court", { responseData: result, statements: statements });
  // }