const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
	name: {
		type: String,
		trim: true,
		required: 'Skriv inn et navn på stedet!'
	},
	slug: String,
	description: {
		type: String,
		trim: true
	},
	tags: [String],
	created: {
		type: Date,
		default: Date.now
	},
	location: {
		type: {
			type: String,
			default: 'Point'
		},
		coordinates: [{
			type: Number,
			required: 'Legg til en kartposisjon!'
		}],
		address: {
			type: String,
			required: 'Legg til en adresse!'
		}
	},
	photo: String,
	author: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: 'Legg til en forfatter'
	}
}, {
	toJson: {virtuals: true},
	toObject: {virtuals: true}
});

//Define index
storeSchema.index({
	name: 'text',
	description: 'text'
});

storeSchema.index({location: '2dsphere'});

storeSchema.pre('save', async function(next) {
	if (!this.isModified('name')) {
		next();
		return;
	}
	this.slug = slug(this.name);
	// If stores have same name, add number after slug
	const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
	const storesWithSlug = await this.constructor.find({slug: slugRegEx});
	if (storesWithSlug.length) {
		this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
	}
	next();
	// TODO make slugs unique
});

storeSchema.statics.getTagsList = function() {
	return this.aggregate([
		{$unwind: '$tags'},
		{$group: {_id: '$tags', count: {$sum: 1}}},
		{$sort: {count: -1}}
	]);
};

storeSchema.statics.getTopStores = function() {
	return this.aggregate([
		// Look up stores and populate reviews
		{$lookup: {
			from: 'reviews', localField: '_id', 
			foreignField: 'store', as: 'reviews'
			}
		},
		// Filter for only items that have 2 or more reviews
		{$match: {
			'reviews.1': {$exists: true}
			}
		},
		// Add the average reviews field
		{$project: {
			photo: '$$ROOT.photo',
			name: '$$ROOT.name',
			reviews: '$$ROOT.reviews',
			slug: '$$ROOT.slug',
			averageRating: {$avg: '$reviews.rating'}
			}
		},
		// Sort it by our new field, hightest first
		{$sort: {averageRating: -1}},
		// Limit to at most 10
		{$limit: 10}
	]);
};

// Find reviews where stores _id prop === reviews store prop
storeSchema.virtual('reviews', {
	ref: 'Review',
	localField: '_id',
	foreignField: 'store'
});

function autoPopulate(next) {
	this.populate('reviews');
	next();
}

storeSchema.pre('find', autoPopulate);
storeSchema.pre('findOne', autoPopulate);

module.exports = mongoose.model('Store', storeSchema);