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

const cookieParser = require('cookie-parser');
const { default: fetch } = require("node-fetch");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static("assets"));
app.use(cookieParser());
//mongodb connection setup
const url = process.env.url;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 
console.log(OPENAI_API_KEY)
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

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  store: new MongoStore({ 
    mongooseConnection: mongoose.connection,
    mongoUrl: process.env.url 
  }),
  cookie: { secure: false } 
}));


function generateRandomId(length) {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters[Math.floor(Math.random() * characters.length)];
  }
  return result;
}
app.get("/cons",(req,res)=>{
  res.sendFile("/Users/iamthehimansh/Downloads/law-firm-main/data-constitution.txt")
})

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
        req.session.userEmail = credential.email;
        res.cookie('userEmail', credential.email); 
        console.log(req.cookies.userEmail); //
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
      req.session.userEmail = lawyerData.email; 
      res.cookie('userEmail', lawyerData.email); 
      res.render("lawyerpage", { user_name: `${lawyerData.name} ${lawyerData["last-name"]}`, emailInvalid: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while creating the lawyer account.");
  }  
});

app.post("/lawyerpage", async (req, res) => {
  try {
    console.log('Email retrieved from cookie:', req.cookies.userEmail);
    const case_details = req.body;
    case_details.caseId = new mongoose.Types.ObjectId(generateRandomId(12));

    const case_file = new Case_schema(case_details);

    const oppositionLawyerExists = await LawyerDetails_schema.findOne({ email: case_details.email });

    if (oppositionLawyerExists) {
      const opposition_lawyer = new Lawyer_schema(case_details);
      const user = await LawyerDetails_schema.findOne({email: req.cookies.userEmail });

      const user_detail = new Lawyer_schema({
        ...user.toObject(),
        _id: case_details.caseId,
        caseId: case_details.caseId
      });

      console.log(user);

      case_file.save()
      .then(() => {
        return opposition_lawyer.save();
      })
      .then(() => {
        return user_detail.save();
      })
      .then(() => {
        console.log(`Case filed with id :${case_file._id}`);
        res.redirect("/court");
      });
    } else {
      res.render("lawyerpage", { user_name: `${user.name} ${user["last-name"]}`, emailInvalid: true });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Unable to file case.");
  }
});

app.get("/pending", async (req, res) => {
  const lawyeremail = req.cookies.userEmail;
  console.log(`This is session's lawyer email: ${lawyeremail}`)
  const lawyerdata = await Lawyer_schema.findOne({email: lawyeremail});
  const caseId = lawyerdata.caseId;
  
  const caseDetails = await Case_schema.findOne({ caseId: caseId });
  console.log(caseDetails);
  res.render('pending', { cases: caseDetails, user_name: lawyerdata.name });
});

app.get("/court", async (req, res) => {
  const email = req.cookies.userEmail;
  console.log(`email in cookie: ${email}`)
  const lawyerdata = await Lawyer_schema.findOne({email: email});
  const caseId = lawyerdata.caseId;
  const caseDetails = await Case_schema.findOne({ caseId: caseId });
  let chat = await chatSchema.findOne({ caseId: caseId });

  if (!chat) {
      chat = new chatSchema({
          caseId: caseId,
          message: [],
          gptResponse: "",
          // gptContext:[]
      });
      await chat.save();
  }

  const lawyer = await Lawyer_schema.findOne({ caseId: caseId, name: { $ne: lawyerdata.name } });
  
  res.render('court', { chat: chat, lawyer: lawyer, caseDetails: caseDetails , user: lawyerdata.name,  gptResponse: chat.gptResponse,gptContext:""});
});


app.post("/court", async (req, res) => {
  const email = req.cookies.userEmail;
  const lawyerdata = await Lawyer_schema.findOne({email: email});
  if (lawyerdata==null){
    res.status(404).send()
  }
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
  console.log(messages);

  let gptResponse = "";


  const formattedStatements = messages.map(statement => JSON.stringify(statement));
  const joinedStatements = formattedStatements.join('\n');

  async function main() {
    try {
      // const completion = await openai.createChatCompletion({
      //     model: "gpt-3.5-turbo",
      //     messages: [
      //         {role: "system", content: "Read the lawyer 1 and lawyer 2 statements and pass judgment."},
      //         {role: "user", content: joinedStatements}
      //     ],
          
      // });

      let bodyContent = JSON.stringify({
        "mess":joinedStatements
      });
      
      let response = await fetch("http://127.0.0.1:5000/chat", { 
        method: "POST",
        body: bodyContent,
        headers:{"Content-Type": "application/json"}
      });
      
      let data = await response.json();

      console.log("Guuuuu")
      // gptResponse = completion.data.choices[0].message.content;
      gptResponse=data["response"]
      gptContext=data["context"]
      console.log(gptResponse);
      console.log(gptContext)
      // Update the gptResponse in the database
      // let old_chat= await chatSchema.findOne({ caseId: caseId })
      // gptContext:{
      //   ...old_chat.gptContext,
      // } 
      gptResponse=gptResponse.replaceAll("\n","<br>")
      await chatSchema.findOneAndUpdate(
          { caseId: caseId },
          { gptResponse: gptResponse,}
      );
      res.render('court', { chat: chat, lawyer: oppositionLawyer, caseDetails: caseDetails ,user: lawyerdata.name, gptResponse: gptResponse,gptContext:JSON.stringify(gptContext)});
      console.log("response main function")
    } catch (error) {
      console.log(error)
      let errorMessage = "Error occurred.";
      if (error.responseData && error.responseData.data && error.responseData.data.error) {
        errorMessage = error.responseData.data.error.message;
      }

      console.error("Error:", errorMessage);
      // throw error;
      res.status(500).send(errorMessage);
    }
  }

  if (true) {
    //messages.length > 5
    main().catch(console.error);
  } else {
    console.log("else block")
    res.render('court', { chat: chat, lawyer: oppositionLawyer, caseDetails: caseDetails ,user: lawyerdata.name, gptResponse: gptResponse});
    console.log(gptResponse);
  }
});


app.listen(LOCALHOST, () => {
  console.log(`Server is running on port ${LOCALHOST}`);
});

// app.post("/court", async (req, res) => {
//   const email = req.cookies.userEmail;
//   const lawyerdata = await Lawyer_schema.findOne({email: email});
//   const caseId = lawyerdata.caseId;
  
//   const caseDetails = await Case_schema.findOne({ caseId: caseId });
//   let chat = await chatSchema.findOne({ caseId: caseId });

//   if (!chat) {
//       chat = new chatSchema({
//           caseId: caseId,
//           message: []
//       });
//       await chat.save();
//   }

//   const newMessage = {};
//   newMessage[lawyerdata.name] = req.body.text;
//   await chatSchema.findOneAndUpdate(
//       { caseId: caseId },
//       { $push: { message: newMessage } }
//   );

//   chat = await chatSchema.findOne({ caseId: caseId });
//   const lawyer = await Lawyer_schema.findOne({ caseId: caseId, name: { $ne: lawyerdata.name } });

//   res.render('court', { chat: chat, lawyer: lawyer, caseDetails: caseDetails ,user_name: lawyerdata.name});
// });