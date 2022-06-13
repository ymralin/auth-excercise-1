require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const { compare } = require("bcrypt");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-find-or-create");

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: "Twoja stara sra do gara.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

main().catch(err => console.log(err));

async function main(){
    

    mongoose.connect("mongodb://localhost:27017/userDB");

    const userSchema = new mongoose.Schema ({
        email: String,
        password: String,
        googleId: String
    });

    userSchema.plugin(passportLocalMongoose);
    userSchema.plugin(findOrCreate);

    const User = new mongoose.model("User", userSchema);

    passport.use(User.createStrategy());

    passport.serializeUser(function(user, done){
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done){
        User.findById(id, function(err, user){
            done(err, user);
        });
    });

    // passport.serializeUser(User.serializeUser());
    // passport.deserializeUser(User.deserializeUser());

    passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets"
        },
        function(accessToken, refreshToken, profile, cb) {
            console.log(profile);
            User.findOrCreate({googleId: profile.id}, function(err, user){
                return cb(err, user);
            });
        }
    ));


    app.get("/", function(req, res){
        res.render("home");
    });

    app.get("/auth/google", passport.authenticate("google", {scope: ["profile"]})
    );

    app.get("/auth/google/secrets",
    passport.authenticate("google", {failureRedirect: "login"}),
    function(req, res){
        res.redirect("/secrets")
    }
    );
    
    app.get("/login", function(req, res){
        res.render("login");
    });
    
    app.get("/register", function(req, res){
        res.render("register");
    });

    app.get("/secrets", function(req, res){
        if (req.isAuthenticated()){
            res.render("secrets");
        } else {
            console.log("Not authenticated")
            res.redirect("/login");
        };
    });


    app.get("/logout", function(req, res){
        req.logout(function(err){
            if (err) {
                console.log(err);
            } else {
                res.redirect("/");
            };
        });
    });

    app.post("/register", function(req, res){

        User.register({username: req.body.username}, req.body.password, function(err, user){
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, function(){
                    res.redirect("/secrets");
                })
            };
        });

    });

    app.post("/login", function(req, res){
        const user = new User({
            username: req.body.username,
            password: req.body.password
        });

        req.login(user, function(err){
            if (err) {
                console.log(err);
            } else {
                passport.authenticate("local")(req, res, function(){
                    res.redirect("/secrets");
                });
            };
        })

    });
    
    app.listen(3000, function(){
        console.log("Server running on port 3000.")
    });

};


