var express     = require('express');
var router      = express.Router();
var passport    = require('passport');
var User        = require('../models/user');
var Campground  = require('../models/campground');
var middleware  = require('../middleware');
var async       = require('async');
var nodemailer  = require('nodemailer');
var crypto      = require('crypto');

// Root route
router.get('/', function(req, res) {
    res.render('landing');
});

// Show register form
router.get('/register' , function(req, res) {
    res.render('register', {page: 'register'});
});

// Handle Sign Up Logic
router.post('/register', function(req, res) {
    // res.send('Signing You Up!');
    var newUser = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        desc: req.body.desc,
        avatar: req.body.avatar
    });
    // eval(require('locus'));
    if(req.body.adminCode === 'secretcode123') {
        newUser.isAdmin = true;
    }
    if(req.body.userCode === 'plopperdeplop68') {
        newUser.isUser = true;
    } else {
      req.flash('error','U dient uw User Code in te vullen');
      return res.redirect('back');
    }
    User.register(newUser, req.body.password, function(err, user) {
        if(err) {
            //console.log(err);
            req.flash('error', err.message);
            return res.redirect('register');
        }
        passport.authenticate('local')(req, res, function() {
            req.flash('success', 'Welkom bij Gino\'s dagboek ' + user.username);
            res.redirect('/campgrounds');
        });
    });
});

// Show login form
router.get('/login', function(req, res) {
    res.render('login', {page: 'login'});
});

// Handling login logic
router.post('/login', passport.authenticate('local', 
    {
        successRedirect: '/campgrounds',
        failureRedirect: '/login',
        failureFlash: true,
        successFlash: 'U bent succesvol ingelogd!'
    }), function(req, res) {
});

// Logout route
router.get('/logout', function(req, res) {
    req.logout();
    req.flash('success', 'U bent uitgelogd!');
    res.redirect('/campgrounds');
});

// FORGOT PASSWORD
router.get('/forgot', function(req, res) {
    res.render('forgot');
});
  
router.post('/forgot', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            req.flash('error', 'Er bestaat geen account met dat e-mailadres.');
            return res.redirect('/forgot');
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail',
          secure: false,
          auth: {
            user: 'giacoppo.node@gmail.com',
            //pass: yelpcamp68
            pass: process.env.GMAILPW
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'giacoppo.node@gmail.com',
          subject: 'Node.js Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n\n' +
            'This reset will be available for one hour.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          console.log('mail sent');
          req.flash('success', 'Een e-mail is gestuurd naar ' + user.email + ' met verdere instructies.');
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgot');
    });
});
  
router.get('/reset/:token', function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        req.flash('error', 'Wachtwoord herstel token is ongeldig of is verlopen.');
        return res.redirect('/forgot');
      }
      res.render('reset', {token: req.params.token});
    });
});
  
router.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            req.flash('error', 'Wachtwoord herstel token is ongeldig of is verlopen.');
            return res.redirect('back');
          }
          if(req.body.password === req.body.confirm) {
            user.setPassword(req.body.password, function(err) {
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;
  
              user.save(function(err) {
                req.logIn(user, function(err) {
                  done(err, user);
                });
              });
            })
          } else {
              req.flash("error", "Wachtwoorden zijn niet gelijk.");
              return res.redirect('back');
          }
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail',
          secure: false,
          auth: {
            user: 'giacoppo.node@gmail.com',
            //pass: yelpcamp68
            pass: process.env.GMAILPW
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'giacoppo.node@gmail.com',
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('success', 'Succes! Uw wactwoord is gewijzigd.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/campgrounds');
    });
});

// USER PROFILES
router.get('/users/:id', middleware.isLoggedIn, function(req, res) {
    User.findById(req.params.id, function(err, foundUser) {
        if(err) {
            req.flash('error', 'Gebruiker niet gevonden! ' + err);
            res.redirect('back');
        }
        Campground.find().where('author.id').equals(foundUser._id).exec(function(req, campgrounds) {
            if(err) {
                req.flash('error', 'Gegevens van de gebuiker konden niet worden gevonden! ' + err);
                res.redirect('back');
            }
            res.render('users/show', {user: foundUser, campgrounds: campgrounds});
        })
    });
});

module.exports = router;