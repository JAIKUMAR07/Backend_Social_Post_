const mongoose = require("mongoose")


mongoose.connect("mongodb://127.0.0.1:27017/socialApp")


const userSchema = mongoose.Schema({
    username : String , 
    name : String,
    age:String ,
    email : String ,
    password : String ,
    posts: [  // post apne me hi ek schema rakhega ek model ka members rakhega 
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "post"
        }
    ]
})

module.exports = mongoose.model("user",userSchema);  