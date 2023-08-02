require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const fs = require("fs-extra");
const path = require("path");
const upload = require("express-fileupload");
const fileUpload = require('express-fileupload');

const app = express();

app.use(fileUpload());
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: "This is a demo project.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
mongoose.set('strictQuery', true);
mongoose.connect("mongodb://127.0.0.1:27017/speckyDB", { useNewUrlParser: true });
// mongoose.set("useCreateIndex", true);

const projectSchema = new mongoose.Schema({
    name: String,
    info: String,
    tech: String,
    address: String,
    userID: [{
        type: String
    }]
})

const userInfoSchema = new mongoose.Schema({
    email: String,
    name: String,
    location: String,
    number: String,
    bio: String,
    pfp: Boolean,
    pfpname: String,
    projectID: [{
        type: String
    }]
});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
});


userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
const UserInformation = new mongoose.model("UserInformation", userInfoSchema);
const Project = new mongoose.model("Project", projectSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});


app.route("/")

    .get(function (req, res) {
        res.render("index", { req });
    })

    .post()
    .delete();



app.route("/login")

    .get(function (req, res) {
        if (req.isAuthenticated()) {
            res.redirect("/secret");
        }
        else {
            res.render("login");
        }
    })

    .post(function (req, res) {
        const user = new User({
            email: req.body.username,
            password: req.body.password
        });

        req.logIn(user, function (err) {
            if (err) {
                console.log(err);
            }
            else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secret");
                });
            }
        })
    })

    .delete();



app.route("/register")

    .get(function (req, res) {
        if (req.isAuthenticated()) {
            res.redirect("/secret");
        }
        else {
            res.render("register");
        }
    })

    .post(function (req, res) {

        User.register({ username: req.body.username }, req.body.password, function (err, user) {
            if (err) {
                console.log(err);
                res.redirect("/register");
            }
            else {
                const info = new UserInformation({
                    email: req.body.username,
                    name: req.body.name,
                    bio: '',
                    location: '',
                    number: '',
                    pfp: false,
                    pfpname: ''

                })
                info.save();
                fs.mkdir('./public/data/users/' + req.body.username, { recursive: true }, (err) => {
                    if (err) throw err;
                });
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secret");
                });

            }
        });
    })

    .delete();



app.route("/secret")

    .get(async function (req, res) {

        if (req.isAuthenticated()) {
            var f1, f2, fpath;
            await UserInformation.findOne({ email: req.user.username }).then((found) => {
                f1 = found;
            });
            await Project.find({ userID: req.user.username }).then((foundAgain) => {
                f2 = foundAgain;
            });
            var f3 = f1.pfpname.toString();
            fpath = "/data/users/" + f1.email + "/" + f3;
            res.render("secret", {
                name: f1.name, bio: f1.bio, location: f1.location,
                number: f1.number, email: f1.email, projects: f2,
                profile: f1.pfp, fname: f1.pfpname, path: fpath
            });
        }
        else {
            res.redirect("/login");
        }
    })

    .post()
    .delete();



app.route("/secret/:projectName")

    .get(async function (req, res) {
        if (req.isAuthenticated()) {
            var id = req.params.projectName;
            var fpath;
            await Project.findById(id).then((found) => {
                fpath = found.address;
            });
            let files = fs.readdirSync(fpath);
            res.render("project", { files: files, id: id });
        }
        else {
            res.redirect("/login");
        }
    })

    .post(async function (req, res) {
        const split_string = req.url.split("/");
        var adr;
        split_string.forEach(element => {
            if (element != "secret") {
                adr = element;
            }
        });
        if (req.files) {
            const file = req.files.file;
            const filename = file.name;
            const fpath = path.join(__dirname, 'public', 'data', 'projects', adr, filename);
            await file.mv(fpath, function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }
        res.redirect(req.url);
    })
    .delete();



app.get("/secret/:projectName/download/:fileName", function (req, res) {
    const split_string = req.url.split("/");
    var adr = split_string[2];
    var fn = split_string[4];
    const fpath = path.join(__dirname, 'public', 'data', 'projects', adr, fn);
    res.download(fpath);
    const nurl = path.dirname(req.url);
    const n2 = path.dirname(nurl);
    res.redirect(n2);
});



app.get("/secret/:projectName/delete/:fileName", function (req, res) {
    const split_string = req.url.split("/");
    var adr = split_string[2];
    var fn = split_string[4];
    const fpath = path.join(__dirname, 'public', 'data', 'projects', adr, fn);
    fs.unlink(fpath, (err => {
        if (err) console.log(err);
    }));
    const nurl = path.dirname(req.url);
    const n2 = path.dirname(nurl);
    res.redirect(n2);
});



app.route("/profile")

    .get(async function (req, res) {
        if (req.isAuthenticated()) {
            var f1, fpath;
            await UserInformation.findOne({ email: req.user.username }).then((found) => {
                f1 = found;
                var f2 = f1.pfpname.toString();
                fpath = "/data/users/" + f1.email + "/" + f2;
            });
            res.render("profile", { profile: f1.pfp, path: fpath });
        }
        else {
            res.redirect("/login");
        }
    })

    .post(async function (req, res) {
        var inp = {
            name: req.body.name,
            bio: req.body.bio,
            number: req.body.number,
            location: req.body.location,
        }
        if (req.isAuthenticated) {
            if (req.files) {
                const file = req.files.file;
                const filename = file.name;
                const uname = req.user.username;
                const fpath = path.join(__dirname, 'public', 'data', 'users', uname, filename);
                await file.mv(fpath, function (err) {
                    if (err) {
                        console.log(err);
                    }
                });
                await UserInformation.findOneAndUpdate({ email: req.user.username }, {
                    $set: {
                        bio: inp.bio,
                        number: inp.number,
                        location: inp.location,
                        name: inp.name,
                        pfp: true,
                        pfpname: filename
                    }
                }, null);
            }

            res.redirect("/secret");
        }

    })

    .delete();



app.route("/contact_us")

    .get(function (req, res) {
        res.render("contact_us", { req });
    })

    .post()
    .delete();



app.route("/project_req")

    .get(function (req, res) {
        if (req.isAuthenticated()) {
            res.render("project_req");
        }
        else {
            res.redirect("/login");
        }
    })

    .post()
    .delete();



app.route("/create_project")

    .get(function (req, res) {
        if (req.isAuthenticated()) {
            res.render("create_project");
        }
        else {
            res.redirect("/login");
        }
    })

    .post(async function (req, res) {
        var inp = {
            name: req.body.name,
            info: req.body.info,
            tech: req.body.tech,
            colab: req.body.colab,
        }
        const split_string = inp.colab.split(",");
        split_string.push(req.user.username);
        if (req.isAuthenticated) {
            var idd, fpath;
            await Project.create({ name: inp.name, info: inp.info, tech: inp.tech, userID: split_string, address: "" });
            await Project.findOne({ name: inp.name, info: inp.info, tech: inp.tech }).then((found) => {
                idd = found._id.toString();
                split_string.forEach(element => {
                    Project.findOneAndUpdate({ email: element }, {
                        $push: {
                            projectID: found._id
                        }
                    }, null);
                });
                fs.mkdir('./public/data/projects/' + found._id, { recursive: true }, (err) => {
                    if (err) throw err;
                });
                fpath = path.join(__dirname, 'public', 'data', 'projects', idd);
            });
            await Project.findByIdAndUpdate(idd, {
                $set: {
                    address: fpath
                }
            });
            res.redirect("/secret");
        }
    })

    .delete();



app.route("/browse_project")

    .get(function (req, res) {
        if (req.isAuthenticated()) {
            res.render("browse_project");
        }
        else {
            res.redirect("/login");
        }
    })

    .post()
    .delete();



app.route("/logout")

    .get(function (req, res) {
        req.logout(function (err) {
            if (err) { return next(err); }
            res.redirect('/');
        });
    })

    .post()
    .delete();




app.listen(3000, function () {
    console.log("Server started on port 3000.");
});