// Import required modules
const express = require('express');                // Web framework for building APIs and web apps
const app = express();                             // Create an instance of Express
const bcrypt = require('bcrypt');                  // For securely hashing and comparing passwords
const userModel = require('./models/user');        // Mongoose model for users (assumed schema defined separately)
const postModel = require('./models/post');        // Mongoose model for posts (not used here but likely for future use)
const cookieParser = require('cookie-parser');     // Middleware to parse cookies from incoming requests
const jwt = require('jsonwebtoken');               // For creating and verifying JSON Web Tokens (JWTs)

// =========================================================================================

// Set EJS as the view engine for rendering templates (views/index.ejs, login.ejs, etc.)
app.set("view engine", "ejs");

// Middleware to parse JSON payloads from requests
app.use(express.json());

// Middleware to parse URL-encoded form data (e.g., from HTML form submissions)
app.use(express.urlencoded({ extended: true }));

// Middleware to parse cookies in the request header and populate req.cookies
app.use(cookieParser());

// ======================= ROUTES ==============================

// Home route – renders the "index.ejs" page
app.get('/', (req, res) => {
    res.render('index');
});

// Login page route – renders the "login.ejs" page
app.get("/login", (req, res) => {
    res.render('login');
});

// ==================== REGISTRATION LOGIC =====================

app.post("/register", async (req, res) => {
    // Destructure user details from the submitted form
    let { email, password, username, name, age } = req.body;

    try {
        // Check if a user with the same email already exists in the database
        let existingUser = await userModel.findOne({ email });
        if (existingUser) {
            // Send error if email already registered
            return res.status(500).send("User already registered");
        }

        // Generate a salt for password hashing
        const salt = await bcrypt.genSalt(10);

        // Hash the password with the salt
        const hash = await bcrypt.hash(password, salt);

        // Create a new user in the database with hashed password
        let user = await userModel.create({
            username,
            name,
            age,
            email,
            password: hash, // Don't store plain text passwords!
        });

        // Create a JWT token containing user info
        let token = jwt.sign({ email: email, userId: user._id }, "shhhh");

        // Store token in user's browser as a cookie
        res.cookie("token", token);

        // Send success message
        res.send("Registered successfully");

    } catch (error) {
        // If something fails, log the error and send error response
        console.error("Registration error:", error);
        res.status(500).send("Error during registration");
    }
});

// ==================== LOGIN LOGIC ============================

app.post("/login", async (req, res) => {
    // Extract email and password from submitted form
    let { email, password } = req.body;

    try {
        // Look up user by email
        let existingUser = await userModel.findOne({ email });
        if (!existingUser) {
            // If no user found, return 401 Unauthorized
            return res.status(401).send("User not found");
        }

        // Compare entered password with hashed password in DB
        const isMatch = await bcrypt.compare(password, existingUser.password);
        if (!isMatch) {
            // If password doesn't match, send unauthorized error
            return res.status(401).send("Invalid credentials");
        }

        // Password matched — create a JWT token
        let token = jwt.sign({ email: email, userId: existingUser._id }, "shhhh");

        // Store token in user's browser as a cookie
        res.cookie("token", token);

        // Send success response
        return res.status(200).send("Login successful");

    } catch (err) {
        // Handle unexpected errors
        console.error("Login error:", err);
        return res.status(500).send("Internal Server Error");
    }
});

// =============== PROTECTED PROFILE ROUTE =====================

app.get("/profile", isLoggedIn, (req, res) => {
    // Only reaches here if `isLoggedIn` middleware passes
    if (!req.user) {
        // If no user found in request, redirect to login
        return res.redirect('/login');
    }

    console.log("Logged in user:", req.user); // Debug info

    // Render the profile page (views/profile.ejs)
    res.render("profile");
});

// =============== LOGOUT ROUTE ================================

app.get("/logout", (req, res) => {
    // Clear the authentication token by setting it to empty
    res.cookie("token", "");

    // Redirect user to login page
    res.redirect("/login");
});

// =============== MIDDLEWARE TO CHECK AUTH ====================

// Middleware that protects routes by checking if user is logged in
function isLoggedIn(req, res, next) {
    const token = req.cookies.token; // Retrieve JWT from cookies

    if (!token) {
        // No token means not logged in — redirect to login
        return res.redirect("/login");
    }

    try {
        // Verify the token using the secret key
        const data = jwt.verify(token, "shhhh");

        // Attach user data to the request for downstream use
        req.user = data;

        // Pass control to the next middleware/route
        next();
    } catch (err) {
        // If token is invalid or expired, log error and redirect to login
        console.error("JWT Error:", err);
        return res.redirect("/login");
    }
}

// ==================== START SERVER ===========================

// Start the server on port 3000
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
