const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({

  username: {
    type: String,
    required: true,
    unique: true,
    minLength:3,
  },
  // server stores a hash of the password never the password itself
  passwordHash: {
    type:String,
    required: true,
    minLength: 8, // I added this swabiTouch
  },
})

userSchema.set('toJSON', {
  transform: (documnet, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
    delete returnedObject.passwordHash // NEVER send the hash out
  },
})

module.exports = mongoose.model('User', userSchema)