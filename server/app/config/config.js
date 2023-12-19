const nodemailer = require("nodemailer");
exports.ErrorMessage = (res,error,message)=>{
    if(process.env.ENV_TYPE == "prod"){
        return res.json({message:message})
    }else{
        return res.json(error)
    }
}

exports.logoBase64 = ()=>{
    return "data:image/png;base64,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"
}