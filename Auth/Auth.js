const jwt = require('jsonwebtoken');
const key = "chintu@12@12@12"

function setToken(user){
    return jwt.sign({
        _id:user._id,
        username:user.username
    },key);
}

function getToken(token){
    if(!token) return null;
    try{
        return jwt.verify(token,key)
    }
    catch(err){
        return null;
    }
}

module.exports = {
    setToken,getToken
}