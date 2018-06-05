var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');
//var bcrypt = require('bcrypt-nodejs');

var UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: String,
    avatar: { type: String, default: '/img/profile.png' },
    firstName: String,
    lastName: String,
    email: { type: String, unique: true, required: true },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    desc: String,
    isAdmin: { type: Boolean, default: false },
    isUser: { type: Boolean, default: false, required: true }
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);
