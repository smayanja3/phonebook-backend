const mongoose = require('mongoose')

mongoose.set('strictQuery', false)

const url = process.env.MONGODB_URI

mongoose.connect(url, { family: 4 })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch(error => {
    console.log('error connecting to MongoDB:', error.message)
  })

/////////// Updated 3d person ////////////

const personSchema = new mongoose.Schema({
  name: {
    type: String,
    minLength: 3,
    required: true,
  },
  number: {
    type: String,
    minLength: 12,
    required: true,
    validate: {
      //US style phone #
      validator: (v) => /^\d{3}-\d{3}-\d{4}$/.test(v),
      message: (props) => `${props.value} is not a valid phone number (use 617-555-0123)`,
    }
  },
  // ownership you can only make and edit your own entries
  //It stores the id of the user who created the entry. ref: 'User' records which model that id belongs to. The toJSON block and the rest of the file stay as they are.
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
})

personSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('Person', personSchema)


//////// no validation way /////////////
// const personSchema = new mongoose.Schema({
//   name: String,
//   number: String,
// })

// personSchema.set('toJSON', {
//   transform: (document, returnedObject) => {
//     returnedObject.id = returnedObject._id.toString()
//     delete returnedObject._id
//     delete returnedObject.__v
//   }
// })

module.exports = mongoose.model('Person', personSchema)
