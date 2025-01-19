const mongoose = require('mongoose');

// Define a flexible schema
const flexibleSchema = new mongoose.Schema({}, { strict: false });

// Create a model using the flexible schema
const AllRecord = mongoose.model("AllRecord", flexibleSchema,);


module.exports = AllRecord