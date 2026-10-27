require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const csrf = require("csurf");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const expressLayouts = require("express-ejs-layouts");

const db = require("./database/database");
const locals = require("./middleware/locals");

const app = express();

/* -----------------------------
   App Configuration
------------------------------ */

app.locals.db = db;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layout");

app.disable("x-powered-by");

/* -----------------------------
   View Layouts
------------------------------ */

app.use(expressLayouts);

/* -----------------------------
   Security
------------------------------ */

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                imgSrc: ["'self'", "https:", "data:"],
                styleSrc: [
                    "'self'",
                    "https://cdn.jsdelivr.net"
                ],
                scriptSrc: [
                    "'self'",
                    "https://cdn.jsdelivr.net"
                ],
                fontSrc: [
                    "'self'",
                    "https://cdn.jsdelivr.net"
                ]
            }
        }
    })
);

/* -----------------------------
   Logging
------------------------------ */

app.use(morgan("combined"));

/* -----------------------------
   Rate Limiter
------------------------------ */

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false
    })
);

/* -----------------------------
   Body Parser
------------------------------ */

app.use(
    express.urlencoded({
        extended: false,
        limit: "20kb"
    })
);

app.use(
    express.json({
        limit: "20kb"
    })
);

/* -----------------------------
   Cookies & Session
------------------------------ */

app.use(cookieParser());

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "change-this-secret",
        resave: false,
        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

/* -----------------------------
   Static Files
------------------------------ */

app.use(express.static(path.join(__dirname, "public")));

app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"), {
        fallthrough: false
    })
);

/* -----------------------------
   CSRF Protection
------------------------------ */

app.use(csrf());

app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

/* -----------------------------
   Template Locals
------------------------------ */

app.use(locals);

/* -----------------------------
   Routes
------------------------------ */

app.use("/api", require("./routes/api"));
app.use("/", require("./routes/auth"));
app.use("/", require("./routes/shop"));

/* -----------------------------
   404
------------------------------ */

app.use((req, res) => {
    res.status(404).render("error", {
        title: "404 - Not Found",
        message: "The page you requested could not be found."
    });
});

/* -----------------------------
   Error Handler
------------------------------ */

app.use((err, req, res, next) => {

    if (err.code === "EBADCSRFTOKEN") {
        return res.status(403).render("error", {
            title: "CSRF Error",
            message:
                "Your session expired. Please refresh the page and try again."
        });
    }

    console.error(err.stack || err);

    res.status(500).render("error", {
        title: "Server Error",
        message:
            process.env.NODE_ENV === "production"
                ? "An unexpected error occurred."
                : err.message
    });
});

/* -----------------------------
   Start Server
------------------------------ */

const PORT = Number(process.env.PORT) || 3000;

if (require.main === module) {

    app.listen(PORT, "0.0.0.0", () => {

        console.log("================================");
        console.log(" SecureCart Server Started");
        console.log("================================");
        console.log(`Environment : ${process.env.NODE_ENV}`);
        console.log(`Listening on: ${PORT}`);
        console.log("================================");

    });

}

module.exports = app;