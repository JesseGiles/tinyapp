const express = require("express");
const cookieSession = require('cookie-session');
const morgan = require('morgan');
const bcrypt = require("bcryptjs");
const app = express();
const PORT = 8080;

const { getUserByEmail } = require('./helpers.js');

app.set("view engine", "ejs"); //set embedded js as template viewer
app.use(morgan('tiny'));

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

//function to filter /urls to only show what current user has created
const urlsForUser = function(user) {
  let currentUsersURLs = {};
    
  for (const tinyURL in urlDatabase) {
    if (urlDatabase[tinyURL].userID === user) {
      currentUsersURLs[tinyURL] = urlDatabase[tinyURL];
    }
  }

  return (currentUsersURLs);
};

//generate random string for use as tinyURL id
const makeTinyString = function() {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

//external npm middleware function to parse cookies data as req.cookies from the header of a request and encode them
app.use(cookieSession({
  name: 'session',
  keys: ['superTopSecretKey1', 'evenMoreTopSecretKey2', 'myMostSecretKeyEver3', 'isThisKeyEvenSecure4?', 'okThatsEnoughKeysForToday5'],
  maxAge: 24 * 60 * 60 * 1000 //24hr timer on storing cookie
}));

//express middleware. parses incoming req.body requests created by a form submission (ie. urls_new) so you can access data submitted using req.bod (converts url encoded data to strings, otherwise body may show as undefined)
app.use(express.urlencoded({ extended: true }));


//when user clicks submit on urls/new
app.post("/urls", (req, res) => {
  let newLongURL = req.body.longURL;
  const userId = req.session.user_id; //for verifying is a user is logged in

  if (userId === undefined) {
    return res.status(400).send('Error 401: You must be logged in to create new TinyURLs.');
  }

  //if user did not prefix address with http:// we will add it for functionality
  if (newLongURL.substring(0,4) !== 'http') {
    newLongURL = 'http://' + newLongURL;
  }

  let newTinyURL = makeTinyString(); // generate random tinyURL

  //random tinyURL generates a new object inside urlDatabase object, stores a longURL key/value and a userID key/value
  urlDatabase[newTinyURL] = {
    longURL: newLongURL,
    userID: userId
  };

  console.log(`verifying new record added`, urlDatabase);
  res.redirect(`/urls/${newTinyURL}`); //redirect to newly made tinyURL page
});

//when user clicks delete button on /urls
app.post(`/urls/:id/delete`, (req, res) => {
  const deleteRecord = req.params.id; //store id of tinyURL being deleted
  const userId = req.session.user_id; //for verifying is a user is logged in
  
  if (userId === undefined) {
    return res.status(401).send('Error 401: Please log in to access this page.');
  }

  let wasVerified = false;

  //compare url entered in searchbar with tinyurls in database
  for (const currentURL in urlDatabase) {
    if (deleteRecord === currentURL) {
      wasVerified = true;
    }
  }

  //if matching tinyurl not found in db, error
  if (wasVerified !== true) {
    return res.status(404).send('Error 404: Tiny URL not found in records.');
  }

  //if tinyurl exists but is not owned by current user, error
  if (wasVerified === true && urlDatabase[deleteRecord].userID !== userId) {
    return res.status(401).send('Error 401: You do not have permission to delete this Tiny URL.');
  }
  
  delete urlDatabase[deleteRecord]; 
  console.log(`verifying deleted record: `, urlDatabase);
  res.redirect('/urls'); //reload /urls after deleting to see changes
});

//when user submits edit on urls/:id
app.post('/urls/:id', (req, res) => {
  const editedURL = req.params.id; //take shortURL entered in browser
  let newLongURL = req.body.longURL; //get new longURL submitted on form

  //if user did not prefix address with http:// we will add it for functionality
  if (newLongURL.substring(0,4) !== 'http') {
    newLongURL = 'http://' + newLongURL;
  }

  const userId = req.session.user_id; //for verifying is a user is logged in
 
  if (userId === undefined) {
    return res.status(401).send('Error 401: Please log in to access this page.');
  }

  let wasVerified = false;

  //compare url entered in searchbar with tinyurls in database
  for (const currentURL in urlDatabase) {
    if (editedURL === currentURL) {
      wasVerified = true;
    }
  }

  //if matching tinyurl not found in db, error
  if (wasVerified !== true) {
    return res.status(404).send('Error 404: Tiny URL not found in records.');
  }

  //if edited tinyurl exists in database but is not owned by current user
  if (wasVerified === true && urlDatabase[editedURL].userID !== userId) {
    return res.status(401).send('Error 401: You do not have permission to edit this Tiny URL.');
  }

  urlDatabase[editedURL].longURL = newLongURL; //update database record of tinyURL (urlID) with new longURL from form submission
  console.log(urlDatabase); //log to see changes reflected
  res.redirect('/urls/');
});

//when user submits login form in header
app.post('/login', (req, res) => {
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
  req.session = null; //clear all session cookies
  res.redirect('/login');
});

//when user submits registration form with email/password
app.post('/register', (req, res) => {
  const submittedEmail = req.body.email;
  const submittedPW = req.body.password;
  const hashedPassword = bcrypt.hashSync(submittedPW, 10); //hash PW via bcrypt

  const checkIfAlreadyRegistered = getUserByEmail(submittedEmail, users); //check if email already registered in database

  if (checkIfAlreadyRegistered) { //if matching record found
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
  console.log('Logging updated users database after new registration:', users);
  res.redirect('/urls');
});

app.get("/", (req, res) => {
  res.send("Congratulations! You found the hidden content. It's actually a complete lack of content. Please try adding something more meaningful in the search bar, maybe.. /register ?");
});

app.get("/urls", (req, res) => {
  const userId = req.session.user_id; //for verifying is a user is logged in
  const user = users[userId]; //for populating header with user email

  //is user is not logged in
  if (userId === undefined) {
    return res.status(401).send('Error 401: Please log in to access this page.');
  }

  //call function to check URL database for records that exist for this userID and return only matching results to be displayed
  let confirmedURLs = urlsForUser(userId);
  
  const templateVars = { urls: confirmedURLs, user: user };
  res.render("urls_index", templateVars); //render html found on urls_index.ejs file, pass along templateVars object for use in that file
});

app.get("/urls/new", (req, res) => {
  const userId = req.session.user_id; //for verifying is a user is logged in
  const user = users[userId]; //for populating header with user email

  //if user isnt logged in, redirect to login page instead
  if (userId === undefined) {
    return res.redirect('/login');
  }

  const templateVars = { urls: urlDatabase, user: user };

  res.render("urls_new", templateVars); //utlizing urls_new.js
});

//page for logging into a user account
app.get("/login", (req, res) => {
  const userId = req.session.user_id; //for verifying is a user is logged in
  const user = users[userId]; //for populating header with user email

  //if user is logged in, redirect attempts to go to /login
  if (userId !== undefined) {
    res.redirect('/urls');
  }
  
  const templateVars = { urls: urlDatabase, user: user };
  res.render('urls_login', templateVars);
});

//page for registering an email/password for tinyapp
app.get("/register", (req, res) => {
  const userId = req.session.user_id; //for verifying is a user is logged in
  const user = users[userId]; //for populating header with user email

  //if user is logged in, redirect attempts to go to /register
  if (userId !== undefined) {
    res.redirect('/urls');
  }

  const templateVars = { urls: urlDatabase, user: user };
  res.render("urls_registration", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const userId = req.session.user_id; //for verifying is a user is logged in
  const user = users[userId]; //for populating header with user email

  if (userId === undefined) {
    return res.status(401).send('Error 401: Please log in to access this page.');
  }

  const verifyShortURL = req.params.id; //store value of tinyURL used in browser
  let wasVerified = false;

  //compare url entered in searchbar with tinyurls in database
  for (const currentURL in urlDatabase) {
    if (verifyShortURL === currentURL) {
      wasVerified = true;
    }
  }

  //if matching tinyurl not found in db, error
  if (wasVerified !== true) {
    return res.status(404).send('Error 404: Tiny URL not found in records.');
  }

  //if matching tinyurl found but not owned by current user
  if (wasVerified === true && urlDatabase[verifyShortURL].userID !== userId) {
    return res.status(401).send('Error 401: You do not have permission to view this Tiny URL.');
  }

  const templateVars = { id: verifyShortURL, longURL: urlDatabase[req.params.id].longURL, user: user}; //obj storing the entered url param(anything after ":" and associated longURL if param matches databse)
  res.render("urls_show", templateVars); //render page, send obj to file
});

app.get("/u/:id", (req, res) => {
 
  res.redirect(`${urlDatabase[req.params.id].longURL}`); //redirect to matching longURL of tinyURL entered
  
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase); //shows contents of urlDatabase obj in browser
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});