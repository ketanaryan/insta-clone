let express = require("express");//backend object
let cors = require("cors");
let {MongoClient,ObjectId} = require("mongodb");
let multer = require("multer");//storage rrecep bananakeliye
let path = require("path");
let fs = require("fs");

let app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
const url = "mongodb://0.0.0.0:27017";
let storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null,"uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const recep = multer({storage});

app.post("/upload", recep.single("file"), 
(req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    let client = new MongoClient(url);
    client.connect();
    let db = client.db("tinder");
    let collec = db.collection("photos");
    let obj = {
        username: req.body.username,
        caption: req.body.caption,
        file_url: `http://localhost:3000/uploads/${req.file.filename}`,
        file_name: req.file.filename,
        upload_time: new Date()
    }
    collec.insertOne(obj)
    .then((result) => {
      client.close();
      res.json({success: true, data: result})
    })
    .catch((error) => {
      client.close();
      console.error("Database error:", error);
      res.status(500).json({error: error.message})
    })
  } catch(error) {
    console.error("Upload error:", error);
    res.status(500).json({error: error.message});
  }

});
app.get("/files",
    (req,res)=>{
        let client= new MongoClient(url);
        client.connect();
        let db = client.db("tinder");
        let collec = db.collection("photos");
        let username = req.query.username;
        obj= username? {username}:{}
        collec.find(obj).toArray()
        .then((result)=>res.send(result))
        .catch((error)=>{res.send(error)});
    }
);
app.delete("/delete/:id",
    (req,res)=>{
        let client = new MongoClient(url);
        client.connect();
        let db= client.db("tinder");
        let collec = db.collection("photos");
        let id= req.params.id;
        let _id = new ObjectId(id);

        collec.findOne({_id})
        .then((obj)=>{
            fs.promises.unlink(`uploads/${obj.file_name}`)
            return collec.deleteOne({_id});})
            .then((result)=>res.send(result))
            .catch((error)=>{res.send(error)});

        });
    

app.listen(3000, () => {
    console.log("express is readyy");
});