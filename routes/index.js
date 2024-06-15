import express from "express";
import redis from "redis";
import mongoose from "mongoose";
const router = express.Router();



const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  year: { type: Number, required: true },
  director: { type: String, required: true },
  genre: { type: String },
  createdAt: { type: Date, default: Date.now },
  });
  
  const Movie = mongoose.model("Movie", movieSchema);

let redisClient;
 (async() => {

  redisClient = redis.createClient();

redisClient.on("error", (error) => console.error(`Error: ${error}`));


  await redisClient.connect();
  console.log('Redis client connected successfully.');

let res=await redisClient.get("hi");
let data=JSON.parse(res);


})();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Yay node!" });
});

  
router.get("/movies",async(req,res)=>{
  const cacheKey="movieList";
try{
  const cacheData=JSON.parse(await redisClient.get(cacheKey))
  if(cacheData){
    console.log("cache done")
    return res.status(200).json({movies:cacheData,isCached:true});
  }
    const data=await Movie.find({},{title:1,_id:1,plot:1}).limit(10);
    if (data) {
      await redisClient.set(cacheKey,JSON.stringify(data))
      return res.status(200).json({movies:data, isCached:false}) 
    }
    return res.status(404).json({ message: "Movie not found" });
}
catch(err)
{
return res.status(400).json(err);
}
})

router.get("/movie/:id",async(req,res)=>{
  
  try{
    
    const id=req.params.id;
  const cacheData=JSON.parse(await redisClient.get(`movies:${id}`))
  if(cacheData){
    console.log("cache done")
    return res.status(200).json({movies:cacheData, isCached:true});  }
    const data =await Movie.find({_id:id},{title:1,_id:1,plot:1});
    if (data.length!=0) {
      await redisClient.set(`movies:${id}`,JSON.stringify(data))
      return res.status(200).json({movie:data,isCached:false});
    }
    return res.status(404).json({ message: "Movie not found" });
  }
  catch(err){
    return res.status(400).json(err);
  }
})
router.patch("/movie/:id",async(req,res)=>{
  try{
    const id=req.params.id;
    const title=req.body.newTitle;
    const updateData=await Movie.findByIdAndUpdate(id,{title:title},{new:true, projection: { _id: 1, title: 1 ,plot:1}})
    if (!updateData) {
      return res.status(404).json({ message: "Movie not found" });
    }
    const data=await Movie.find({},{title:1,_id:1,plot:1}).limit(10);
    await redisClient.set("movieList",JSON.stringify(data))
    await redisClient.set(`movies:${id}`,JSON.stringify(updateData));
    return res.status(200).json({updateMovie:updateData})
  }
  catch(err){
  return res.status(400).json(err);
  }
})
router.delete("/movie/:id",async(req,res)=>{
  try{
    const id=req.params.id;
    const data=await Movie.findByIdAndDelete(id);
    const dataU=await Movie.find({},{title:1,_id:1,plot:1}).limit(10);
    await redisClient.set("movieList",JSON.stringify(dataU))
    await redisClient.del(`movies:${id}`);
    if (!data) {
      return res.status(404).json({ message: "Movie not found" });
    }
    return res.status(200).json({message:"successfully deleted"})
  }
  catch(err){
    return res.status(400).json(err);
  }
})

export default router;
