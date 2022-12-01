const express = require("express");
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs"); //set embedded js as template viewer

//database of key/value pairs storing tinyurl and longurl 
const urlDatabase = { 
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW",
  },
};

//database of user registered to tinyapp
const users = {
  userRandomID: {
    id: "userRandomID",
    email: "rockybalboa@italianstallion.yo",
    password: "yo-adrian",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "ivandrago@sovietunion.ussr",
    password: "i-must-break-you",
  }
};

//function to check user database for a webform submitted email
const getUserByEmail = function(email) { 
  console.log('Verifying if this is an existing email: ', email);
  for (const userID in users) {
    if (email === users[userID].email) {
      return users[userID];
    }
  }
  return null;
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
//this is a built-in middleware function in exprses. parses incoming requests created by a form submission (urls_new) so you can access data submitted using the req.body (converts url encoded data to strings, otherwise body may show as undefined)


//when user clicks submit on urls/new
app.post("/urls", (req, res) => { 
  const userId = req.cookies.user_id;
  newLongURL = req.body.longURL;

  //if user isnt logged in, return HTML message why they cannot shorten URLs
  if (userId === undefined) { 
    console.log(urlDatabase)
    return res.status(400).send('Error 401: You must be logged in to create new TinyURLs.');
  };

  let newTinyURL = makeTinyString(); // generate random tinyURL

  //random tinyURL generates a new object inside urlDatabase object, stores a longURL key/value and a userID key/value
  urlDatabase[newTinyURL] = {
    longURL: newLongURL,
    userID: req.cookies.user_id
  }

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
  const newlongURL = req.body.longURL; //get new longURL submitted on form

  urlDatabase[urlID].longURL = newlongURL; //update database record of tinyURL (urlID) with new longURL from form submission
  console.log(urlDatabase); //log to see changes reflected
  res.redirect('/urls/');
});

//when user submits login form in header
app.post('/login', (req, res) => { //after login form submitted
  const loginEmail =  req.body.email;
  const loginPassword = req.body.password;

  const validateUser = getUserByEmail(loginEmail); //validate email entered on login with database

  if (!validateUser) { //if email not found
    return res.status(403).send('Error 403: This email is not registered to TinyApp.');
  }

  if (validateUser.password !== loginPassword) { //if pw doesnt match records
    return res.status(403).send('Error 403: Email/password do not match.');
  }

  res.cookie('user_id', validateUser.id); //set cookie set to existing users id
  console.log(`Existing user login for ${loginEmail}! Cookie set to userID:`, validateUser.id);
  res.redirect('/urls');
});

//when user presses logout button in header
app.post('/logout', (req, res) => {
  res.clearCookie('user_id'); //clear cookie so login form repopulates
  res.redirect('/login');
});

//when user submits registration form with email/password
app.post('/register', (req, res) => {

  const submittedEmail = req.body.email;
  const submittedPW = req.body.password;

  const validateUser = getUserByEmail(req.body.email); //check if email already registered in database

  if (validateUser) { //if matching record found
    return res.status(400).send('Error 400: This email is already registered to another user.');
  }

  if (submittedEmail === '' || submittedPW === '') { //if form fields were empty
    return res.status(400).send('Please enter a username and password');
  }
  
  let newUserID = makeTinyString(); //generate random string for userID
  users[newUserID] = { // add new userid/email/pw to user database
    id: newUserID,
    email: req.body.email,
    password: req.body.password,
  };

  res.cookie('user_id', newUserID); //create cookie set to randomgen userID
  console.log('Valid new user! Cookie created for userID:', newUserID);
  console.log('test log users db after new registration:', users);
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

  //if user isnt logged in, redirect to login page instead of allowing access to create tiny urls
  if (userId === undefined) { 
    res.redirect('/login');
  };

  const user = users[userId];
  const templateVars = { urls: urlDatabase, user: user };

  res.render("urls_new", templateVars); //utlizing urls_new.js
});

//page for logging into a user account
app.get("/login", (req, res) => {
  const userId = req.cookies.user_id;

  //if user is logged in, redirect attempts to go to /login
  if (userId !== undefined) {
    res.redirect('/urls');
  };
  
  const user = users[userId];
  const templateVars = { urls: urlDatabase, user: user };
  res.render('urls_login', templateVars);
});

//page for registering an email/password for tinyapp
app.get("/register", (req, res) => {
  const userId = req.cookies.user_id;

  //if user is logged in, redirect attempts to go to /register
  if (userId !== undefined) { 
    res.redirect('/urls');
  };

  const user = users[userId];
  const templateVars = { urls: urlDatabase, user: user };
  res.render("urls_registration", templateVars);
});

app.get("/urls/:id", (req, res) => { //adds "urls/(x)"" x param can be any value entered at url but we are storing specifics in urlDatabase

  const verifyURL = req.params.id;
  let wasVerified = false;

  //compare url entered in searchbar with tinyurls in database
  for (urls in urlDatabase) {
    if (verifyURL === urls) {
      wasVerified = true;
    }
  };

  //if matching tinyurl not found in db, error
  if (wasVerified !== true) {
    return res.status(404).send('Error 404: Tiny URL not found in records');
  }

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