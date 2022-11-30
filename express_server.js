const express = require("express");
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs"); //set embedded js as template viewer

const urlDatabase = { //object storing data for templates
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "rockybalboa@italianstallian.yo",
    password: "yo-adrian",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "ivandrago@sovietunion.ussr",
    password: "i-must-break-you",
  }
};

//generate random string for use as tinyURL
const makeTinyString = function() {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
app.use(cookieParser());
//external npm middleware function to parse cookies data as req.cookies from the header of a request

app.use(express.urlencoded({ extended: true }));
//this is a built-in middleware function in exprses. parses incoming requests created by a form submission (urls_new) so you can access data submitted using the req body (converts url encoded data to strings, otherwise body may show as undefined)
//So using our urls_new form as an example, the data in the input field will be avaialbe to us in the req.body.longURL variable, which we can store in our urlDatabase object.

//when user clicks submit on urls/new
app.post("/urls", (req, res) => { // this function actions when form submitted
  let newTinyURL = makeTinyString(); // generate random tinyURL
  urlDatabase[newTinyURL] = req.body.longURL; // add tiny/long URL pair to DB
  console.log(req.body); // Log the POST request body to the console
  console.log(`verifying new record added`, urlDatabase);
  res.redirect(`/urls/${newTinyURL}`); //redirect to new tinyURL page
});

//when user clicks delete button on /urls
app.post(`/urls/:id/delete`, (req, res) => { // this function actions when form submitted
  let deleteRecord = req.params.id; //store id value of tinyURL delete clicked
  delete urlDatabase[deleteRecord]; //remove this id from database obj
  console.log(`verifying deleted record: `, urlDatabase);
  res.redirect('/urls'); //reload /urls after deleting to see changes
});

//when user submits edit on urls/:id
app.post('/urls/:id', (req, res) => {
  const urlID = req.params.id; //take shortURL from browser url
  const longURL = req.body.longURL; //get new longURL submitted on form

  urlDatabase[urlID] = longURL; //update database record of tinyURL (urlID) with new longURL from form submission
  console.log(urlDatabase); //log to see changes reflected
  res.redirect('/urls/');
});

//when user submits login form in header
app.post('/login', (req, res) => { //after login form submitted
  console.log(`login req.body: `, req.body);
  res.cookie('user_id', req.body.user_id); //set cookie username: value on form
  console.log(`cookie created for: `, req.body.user_id); //log to confirm
  res.redirect('/urls');
});

//when user presses logout button in header
app.post('/logout', (req, res) => {
  res.clearCookie('user_id'); //clear cookie so login form repopulates
  res.redirect('/urls');
});

//when user submits registration form with email/password
app.post('/register', (req, res) => {
  let newUserID = makeTinyString(); //generate random string for userID
  users[newUserID] = { // add new userid/email/pw to user database
    id: newUserID,
    email: req.body.email,
    password: req.body.password,
  };
  res.cookie('user_id', newUserID); //create cookie set to randomgen userID
  console.log('New cookie created for userID:', newUserID);
  res.redirect('/urls');
});

app.get("/", (req, res) => { //get "/" is main url, displays hello msg
  res.send("Hello!");
});

app.get("/urls", (req, res) => { //adds "/urls" route to main url
  const userId = req.cookies.user_id;
  const user = users[userId];
  const templateVars = { urls: urlDatabase, user: user };
  res.render("urls_index", templateVars); //render html found on urls_index.ejs file, pass along templateVars object for use in that file
});

app.get("/urls/new", (req, res) => { //adds "urls/new" route
  const userId = req.cookies.user_id;
  const user = users[userId];
  const templateVars = { urls: urlDatabase, user: user };

  res.render("urls_new", templateVars); //utlizing urls_new.js
});

//page for registering an email/password for tinyapp
app.get("/register", (req, res) => {
  const userId = req.cookies.user_id;
  const user = users[userId];
  const templateVars = { urls: urlDatabase, user: user };
  res.render("urls_registration", templateVars);
});

app.get("/urls/:id", (req, res) => { //adds "urls/(x)"" x param can be any value entered at url but we are storing specifics in urlDatabase
  const userId = req.cookies.user_id;
  const user = users[userId];
  const templateVars = { id: req.params.id, longURL: urlDatabase[req.params.id], user: user}; //obj storing the entered url param(anything after ":" and associated longURL if param matches databse)
  res.render("urls_show", templateVars); //render page, send obj to file
});

app.get("/u/:id", (req, res) => {
  res.redirect(`${urlDatabase[req.params.id]}`); //redirect to matching longURL of tinyURL entered
  
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase); //shows contents of urlDatabase obj in browser
});

app.get("/hello", (req, res) => { //adds "/hello" url and some basic html
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});