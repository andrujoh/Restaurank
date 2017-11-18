const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
	failureRedirect: '/login',
	failureFlash: 'Feilet innlogging',
	successRedirect: '/',
	successFlash: 'Du er logget inn'
});

exports.logout = (req, res) => {
	req.logout();
	req.flash('success', 'Du er logget ut');
	res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
	if (req.isAuthenticated()) {
		next();
		return;
	}
	req.flash('error', 'Du må logge inn');
	res.redirect('/login');
}

exports.forgot = async (req, res) => {
	// Check if email exists
	const user = await User.findOne({email: req.body.email});
	if (!user) {
		req.flash('error', 'Passordet er sendt på mail');
		return res.redirect('/login');
	}
	//Set reset tokens and expiry on their account
	user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
	user.resetPasswordExpires = Date.now() + 3600000;
	await user.save();
	// Send email with token
	const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
	await mail.send({
		user,
		subject: 'Nullstill passord',
		resetURL,
		filename: 'password-reset'
	});
	req.flash('success', `Du har fått en mail med link til å nullstille passordet`);
	res.redirect('/login');
};

exports.reset = async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: {$gt: Date.now()}
	});
	if (!user) {
		req.flash('error', 'Nulstill passord er ugyldig eller utgått');
		return res.redirect('/login');
	}
	res.render('reset', {title: 'Nullstill passordet'});
};

exports.confirmedPasswords = (req, res, next) => {
	if (req.body.password === req.body['password-confirm']) {
		next();
		return;
	}
	req.flash('error', 'Passordene er ikke like')
	res.redirect('back');
};

exports.update = async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: {$gt: Date.now()}
	});
	if (!user) {
		req.flash('error', 'Nulstill passord er ugyldig eller utgått');
		return res.redirect('/login');
	}

	const setPassword = promisify(user.setPassword, user);
	await setPassword(req.body.password);
	user.resetPasswordToken = undefined;
	user.resetPasswordExpires = undefined;
	const updatedUser = await user.save();
	await req.login(updatedUser);
	req.flash('success', 'Passordet ditt er oppdatert. Du er logget inn');
	res.redirect('/');
};