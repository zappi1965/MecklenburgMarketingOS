
const jwt=require("jsonwebtoken");
function auth(req,res,next){const token=(req.headers.authorization||"").replace("Bearer ","");if(!token)return res.status(401).json({message:"Nicht eingeloggt"});try{req.user=jwt.verify(token,process.env.JWT_SECRET||"please-change-this-secret");next()}catch{return res.status(401).json({message:"Token ungültig"})}}
function requireAdmin(req,res,next){if(req.user?.role!=="agency_admin")return res.status(403).json({message:"Keine Berechtigung"});next()}
module.exports={auth,requireAdmin}
