const express = require('express');
const { MongoClient } = require('mongodb');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

// MongoDB connection
const client = new MongoClient('mongodb://localhost:27017', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

let db;
let usersCollection;

client.connect()
    .then(() => {
        db = client.db('myDB');
        usersCollection = db.collection('myCollection');
        console.log("MongoDB connected");
    })
    .catch(err => console.error(err));

// Route: Login Page
app.get('/', (req, res) => {
    res.render('login', { error: null });
});

// Route: Handle Login
app.post('/', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('login', { error: "Username and password are required!" });
    }

    try {
        const user = await usersCollection.findOne({ username, password });
        if (!user) {
            return res.render('login', { error: "Invalid username or password." });
        }

        req.session.user = user;
        res.redirect('/home');
    } catch (err) {
        console.error(err);
        res.render('login', { error: "An error occurred during login." });
    }
});

// Route: Home Page
app.get('/home', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    res.render('home', { user: req.session.user });
});

// Categories and Destinations
app.get('/hiking', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.render('hiking');
});

app.get('/islands', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.render('islands');
});

app.get('/cities', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.render('cities');
});

// Destinations
app.get('/annapurna', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.render('annapurna');
});

app.get('/bali', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.render('bali');
});

app.get('/inca', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.render('inca');
});

app.get('/paris', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.render('paris');
});

app.get('/rome', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.render('rome');
});

app.get('/santorini', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.render('santorini');
});

// Search Results
app.get('/searchresults', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.render('searchresults');
});

//
// Define the destinations manually
const destinations = [
    { name: "Rome" },
    { name: "Inca" },
    { name: "Santorini" },
    { name: "Annapurna" },
    { name: "Bali" },
    { name: "Paris" }
];

// Route to render search results
app.get('/search', (req, res) => {
    if (!req.session.user) return res.redirect('/');

    const searchQuery = req.query.q;
    if (!searchQuery) {
        return res.render('searchresults', { destinations: [], error: "Please enter a search term" });
    }

    const results = destinations.filter(destination =>
        destination.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    res.render('searchresults', { destinations: results, error: results.length === 0 ? "Destination not found" : null });
});

// Route to handle form POST for search
app.post('/search', (req, res) => {
    const searchQuery = req.body.Search.trim().toLowerCase();

    const results = destinations.filter(destination =>
        destination.name.toLowerCase().includes(searchQuery)
    );

    res.render('searchresults', { destinations: results, error: results.length === 0 ? "Destination not found" : null });
});

// Route: Registration Page
app.get('/registration', (req, res) => {
    res.render('registration', { error: null, success: null });
});

// Route: Handle Registration
app.post('/registration', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('registration', { error: "All fields are required!", success: null });
    }

    try {
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            return res.render('registration', { error: "Username already exists.", success: null });
        }

        await usersCollection.insertOne({ username, password, wantToGo: [] });
        res.render('registration', { error: null, success: "Registration successful! You can now log in." });
    } catch (err) {
        console.error(err);
        res.render('registration', { error: "Error registering user.", success: null });
    }
});



// Route: Add to Want-To-Go List
app.post("/addToWantToGo", async (req, res) => {
    const location = req.body.location;
    if (!location) {
        return res.status(400).send("Error: Location is required.");
    }

    const username = req.session.user?.username;
    if (!username) {
        return res.status(401).send("Error: User is not logged in.");
    }

    try {
        const result = await usersCollection.updateOne(
            { username },
            { $addToSet: { wantToGo: location } } // Add location if not already in the list
        );

        if (result.modifiedCount > 0) {
            res.status(200).send("Location added successfully.");
        } else {
            res.status(400).send("Location is already in the list.");
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Route: View Want-To-Go List
// Route: View Want-To-Go List
app.get("/wanttogo", async (req, res) => {
    const { username } = req.session.user;
  
    if (!username) {
      return res.redirect("/");  // Redirect to login if user is not logged in
    }
  
    try {
      const user = await usersCollection.findOne({ username });  // Fetch user data from DB
  
      if (!user) {
        return res.status(404).send("User not found.");
      }
  
      const wantToGo = user.wantToGo || [];  // Default to empty array if no destinations are saved
  
      res.render("wanttogo", { wantToGo });  // Pass wantToGo to the view
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
});


// Start the server
app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
