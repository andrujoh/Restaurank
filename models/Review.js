const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const reviewSchema = new mongoose.Schema({
	created: {
		type: Date,
		default: Date.now
	},
	author: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: 'Legg til en bruker'
	},
	store: {
		type: mongoose.Schema.ObjectId,
		ref: 'Store',
		required: 'Legg til et sted'
	},
	text: {
		type: String,
		required: 'Anmeldelsen må ha en tekst'
	},
	rating: {
		type: Number,
		min: 1,
		max: 5
	}
});

function autoPopulate(next) {
	this.populate('author');
	next();
}

reviewSchema.pre('find', autoPopulate);
reviewSchema.pre('findOne', autoPopulate);

module.exports = mongoose.model('Review', reviewSchema);