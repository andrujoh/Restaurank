const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
	res.render('login', {title: 'Logg inn'});
};

exports.registerForm = (req, res) => {
	res.render('register', {title: 'Registrer deg'});
};

exports.validateRegister = (req, res, next) => {
	req.sanitizeBody('name');
	req.checkBody('name', 'Vennligst skriv navnet ditt').notEmpty();
	req.checkBody('email', 'Ugyldig mail adresse').isEmail();
	req.sanitizeBody('email').normalizeEmail({
		remove_dots: false,
		remove_extension: false,
		gmail_remove_subaddress: false
	});
	req.checkBody('password', 'Vennligst skriv et passord').notEmpty();
	req.checkBody('password-confirm', 'Passordene må være like!').equals(req.body.password);

	const errors = req.validationErrors();
	if (errors) {
		req.flash('error', errors.map(err => err.msg));
		res.render('register', {title: 'Registrer deg', body: req.body, flashes: req.flash()});
		return;
	}
	next();
};

exports.register = async (req, res, next) => {
	const user = new User({
		email: req.body.email,
		name: req.body.name
	});
	const register = promisify(User.register, User);
	await register(user, req.body.password);
	next();
};

exports.account = (req, res) => {
	res.render('account', {title: 'Rediger din konto'});
};

exports.updateAccount = async (req, res) => {
	const updates = {
		name: req.body.name,
		email: req.body.email
	};

	const user = await User.findOneAndUpdate(
		{_id: req.user._id},
		{$set: updates},
		{new: true, runValidators: true, context: 'query'}
	);
	req.flash('success', 'Oppdaterte profil');
	res.redirect('back');
};