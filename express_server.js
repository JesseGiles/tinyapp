const express = require("express");
const cookieSession = require('cookie-session');
const bcrypt = require("bcryptjs");
const app = express();
const PORT = 8080; // default port 8080

const getUserByEmail = require('./helpers');

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
    password: "yoadrian",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "ivandrago@sovietunion.ussr",
    password: "i-must-break-you",
  }
};

//function to filter /urls to only show what current user has created
const urlsForUser = function(user) {
  let currentUsersURLs = {};
    
  for (let tinyURL in urlDatabase) {
    if (urlDatabase[tinyURL].userID === user) {
      currentUsersURLs[tinyURL] = urlDatabase[tinyURL];
    }
  }

  return (currentUsersURLs);
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

app.use(cookieSession({
  name: 'session',
  keys: ['superTopSecretKey1', 'evenMoreTopSecretKey2'],
  maxAge: 24 * 60 * 60 * 1000 //24hr 
}));
//external npm middleware function to parse cookies data as req.cookies from the header of a request and encode them

app.use(express.urlencoded({ extended: true }));
//this is a built-in middleware function in exprses. parses incoming requests created by a form submission (urls_new) so you can access data submitted using the req.body (converts url encoded data to strings, otherwise body may show as undefined)


//when user clicks submit on urls/new
app.post("/urls", (req, res) => {
  const userId = req.session.user_id;
  const newLongURL = req.body.longURL;

  //if user isnt logged in, return HTML message why they cannot shorten URLs
  if (userId === undefined) {
    console.log(urlDatabase);
    return res.status(400).send('Error 401: You must be logged in to create new TinyURLs.');
  }

  let newTinyURL = makeTinyString(); // generate random tinyURL

  //random tinyURL generates a new object inside urlDatabase object, stores a longURL key/value and a userID key/value
  urlDatabase[newTinyURL] = {
    longURL: newLongURL,
    userID: req.session.user_id
  };

  console.log(req.body); // Log the POST request body to the console
  console.log(`verifying new record added`, urlDatabase);
  res.redirect(`/urls/${newTinyURL}`); //redirect to new tinyURL page
});

//when user clicks delete button on /urls
app.post(`/urls/:id/delete`, (req, res) => {
  let deleteRecord = req.params.id; //store id value of tinyURL delete clicked

  const userId = req.session.user_id;
  
  if (userId === undefined) {
    return res.status(401).send('Error 401: Please log in to access this page.');
  }

  const verifyShortURL = deleteRecord; //store value of tinyURL used in browser
  let wasVerified = false;

  //compare url entered in searchbar with tinyurls in database
  for (let urls in urlDatabase) {
    if (verifyShortURL === urls) {
      wasVerified = true;
    }
  }

  //if matching tinyurl not found in db, error
  if (wasVerified !== true) {
    return res.status(404).send('Error 404: Tiny URL not found in records.');
  }

  if (wasVerified === true && urlDatabase[verifyShortURL].userID !== userId) {
    return res.status(401).send('Error 401: You do not have permission to delete this Tiny URL.');
  }
  
  delete urlDatabase[deleteRecord]; //remove this id from database obj
  console.log(`verifying deleted record: `, urlDatabase);
  res.redirect('/urls'); //reload /urls after deleting to see changes
});

//when user submits edit on urls/:id
app.post('/urls/:id', (req, res) => {
  const urlID = req.params.id; //take shortURL from browser url
  const newlongURL = req.body.longURL; //get new longURL submitted on form

  const userId = req.session.user_id; //for verifying is a user is logged in
 
  if (userId === undefined) {
    return res.status(401).send('Error 401: Please log in to access this page.');
  }

  const verifyShortURL = urlID; //store value of tinyURL used in browser
  let wasVerified = false;

  //compare url entered in searchbar with tinyurls in database
  for (let urls in urlDatabase) {
    if (verifyShortURL === urls) {
      wasVerified = true;
    }
  }

  //if matching tinyurl not found in db, error
  if (wasVerified !== true) {
    return res.status(404).send('Error 404: Tiny URL not found in records.');
  }

  if (wasVerified === true && urlDatabase[verifyShortURL].userID !== userId) {
    return res.status(401).send('Error 401: You do not have permission to edit this Tiny URL.');
  }

  ///////////////

  urlDatabase[urlID].longURL = newlongURL; //update database record of tinyURL (urlID) with new longURL from form submission
  console.log(urlDatabase); //log to see changes reflected
  res.redirect('/urls/');
});

//when user submits login form in header
app.post('/login', (req, res) => { //after login form submitted
  const loginEmail =  req.body.email;
  const loginPassword = req.body.password;

  const validateUser = getUserByEmail(loginEmail, users); //validate email entered on login with database

  if (!validateUser) { //if email not found
    return res.status(403).send('Error 403: This email is not registered to TinyApp.');
  }

  //compare login pw with hashed pw from database via bcyrpt
  if (bcrypt.compareSync(loginPassword, validateUser.password) === false) { 
    return res.status(403).send('Error 403: Email/password do not match.');
  }

  req.session.user_id = validateUser.id; //set cookie set to existing users id
  console.log(`Existing user login for ${loginEmail}! Cookie set to userID:`, validateUser.id);
  res.redirect('/urls');
});

//when user presses logout button in header
app.post('/logout', (req, res) => {
  req.session = null;
  //res.clearCookie('user_id'); //clear cookie so login form repopulates
  res.redirect('/login');
});

//when user submits registration form with email/password
app.post('/register', (req, res) => {

  const submittedEmail = req.body.email;
  const submittedPW = req.body.password;
  const hashedPassword = bcrypt.hashSync(submittedPW, 10); //hash PW via bcrypt

  const validateUser = getUserByEmail(submittedEmail, users); //check if email already registered in database

  if (validateUser) { //if matching record found
    return res.status(400).send('Error 400: This email is already registered to another user.');
  }

  if (submittedEmail === '' || submittedPW === '') { //if form fields were empty
    return res.status(400).send('Please enter a username and password');
  }
  
  let newUserID = makeTinyString(); //generate random string for userID
  users[newUserID] = { // add new userid/email/pw to user database
    id: newUserID,
    email: submittedEmail,
    password: hashedPassword,
  };

  req.session.user_id = newUserID; //create cookie set to randomgen userID
  console.log('Valid new user! Cookie created for userID:', newUserID);
  console.log('test log users db after new registration:', users);
  res.redirect('/urls');
});

app.get("/", (req, res) => { //get "/" is main url, displays hello msg
  res.send("Hello!");
});

app.get("/urls", (req, res) => { //adds "/urls" route to main url
  const userId = req.session.user_id;
  const user = users[userId];

  //is user is not logged in
  if (userId === undefined) {
    return res.status(401).send('Error 401: Please log in to access this page.');
  }

  //call function to check URL database for records that exist for this userID and return only matching results to be displayed
  let confirmedURLs = urlsForUser(userId);
  
  const templateVars = { urls: confirmedURLs, user: user };
  res.render("urls_index", templateVars); //render html found on urls_index.ejs file, pass along templateVars object for use in that file
});

app.get("/urls/new", (req, res) => { //adds "urls/new" route
  const userId = req.session.user_id;

  //if user isnt logged in, redirect to login page instead of allowing access to create tiny urls
  if (userId === undefined) {
    res.redirect('/login');
  }

  const user = users[userId];
  const templateVars = { urls: urlDatabase, user: user };

  res.render("urls_new", templateVars); //utlizing urls_new.js
});

//page for logging into a user account
app.get("/login", (req, res) => {
  const userId = req.session.user_id;

  //if user is logged in, redirect attempts to go to /login
  if (userId !== undefined) {
    res.redirect('/urls');
  }
  
  const user = users[userId];
  const templateVars = { urls: urlDatabase, user: user };
  res.render('urls_login', templateVars);
});

//page for registering an email/password for tinyapp
app.get("/register", (req, res) => {
  const userId = req.session.user_id;

  //if user is logged in, redirect attempts to go to /register
  if (userId !== undefined) {
    res.redirect('/urls');
  }

  const user = users[userId];
  const templateVars = { urls: urlDatabase, user: user };
  res.render("urls_registration", templateVars);
});

app.get("/urls/:id", (req, res) => { //adds "urls/(x)"" x param can be any value entered at url but we are storing specifics in urlDatabase
  const userId = req.session.user_id;
  const user = users[userId];

  if (userId === undefined) {
    return res.status(401).send('Error 401: Please log in to access this page.');
  }

  const verifyShortURL = req.params.id; //store value of tinyURL used in browser
  let wasVerified = false;

  //compare url entered in searchbar with tinyurls in database
  for (let urls in urlDatabase) {
    if (verifyShortURL === urls) {
      wasVerified = true;
    }
  }

  //if matching tinyurl not found in db, error
  if (wasVerified !== true) {
    return res.status(404).send('Error 404: Tiny URL not found in records.');
  }

  if (wasVerified === true && urlDatabase[verifyShortURL].userID !== userId) {
    return res.status(401).send('Error 401: You do not have permission to view this Tiny URL.');
  }

  const templateVars = { id: req.params.id, longURL: urlDatabase[req.params.id].longURL, user: user}; //obj storing the entered url param(anything after ":" and associated longURL if param matches databse)
  res.render("urls_show", templateVars); //render page, send obj to file
});

app.get("/u/:id", (req, res) => {
  const userId = req.session.user_id;

  if (userId === undefined) {
    return res.status(401).send('Error 401: Please log in to access this page.');
  }

  res.redirect(`${urlDatabase[req.params.id].longURL}`); //redirect to matching longURL of tinyURL entered
  
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