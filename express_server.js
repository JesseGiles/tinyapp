const express = require("express");
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs"); //set embedded js as template viewer

const urlDatabase = { //object storing data for templates
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

function generateRandomString() {}

app.use(express.urlencoded({ extended: true })); 
//this is a built-in middleware function in exprses. parses incoming requests created by a form submission (urls_new) so you can access data submitted using the req body (converts url encoded data to strings, otherwise body may show as undefined)
//So using our urls_new form as an example, the data in the input field will be avaialbe to us in the req.body.longURL variable, which we can store in our urlDatabase object. 

app.post("/urls", (req, res) => { //this function actions when form submitted
  console.log(req.body); // Log the POST request body to the console
  res.send("Ok"); // Respond with 'Ok' (we will replace this)
});

app.get("/", (req, res) => { //get "/" is main url, displays hello msg
  res.send("Hello!");
});

app.get("/urls", (req, res) => { //adds "/urls" route to main url
  const templateVars = { urls: urlDatabase }; //give key to obj for use in urls_index
  res.render("urls_index", templateVars); //render html found on urls_index.ejs file, pass along templateVars object for use in that file
});

app.get("/urls/new", (req, res) => { //adds "urls/new" route
  res.render("urls_new"); //utlizing urls_new.js
})

app.get("/urls/:id", (req, res) => { //adds "urls/(x)"" x param can be any value entered at url but we are storing specifics in urlDatabase
  const templateVars = { id: req.params.id, longURL: urlDatabase[req.params.id] }; //obj storing the entered url param(anything after ":" and associated longURL if param matches databse)
  res.render("urls_show", templateVars); //render page, send obj to file
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