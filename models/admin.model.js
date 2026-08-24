const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
    email: {
    type: String,
    require: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
  },
  password: {
    type: String,
    require: true,
    minlength: 6
  }
},
{ timestamps:true });

adminSchema.pre('save' , async function(next){
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password , 10);      
    next();
})

adminSchema.methods.correctPassword = async function(inputPassword){      
    return await bcrypt.compare(inputPassword , this.password);
}

module.exports = mongoose.model('Admin', adminSchema);
