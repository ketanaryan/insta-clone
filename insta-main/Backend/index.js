let express=require("express");
let cors=require("cors");
let {MongoClient,ObjectId}=require("mongodb");

let multer = require("multer");
let path= require("path");
let fs= require("fs");

let app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const url = "mongodb://0.0.0.0:27017";

let storage=multer.diskStorage(
    {
        destination: (req,file,cb)=>cb(null,"uploads/"),
        filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
    }
);
let dalal= multer({storage});

app.post("/upload",dalal.single("file"),(req,res)=>{
    let client = new MongoClient(url);
    client.connect();

    let db = client.db("instagram");
    let collec = db.collection("files");
    let obj= {
        username : req.body.username,
        caption: req.body.caption,
        file_url: `http://localhost:3000/uploads/${req.file.filename}`,
        file_name : req.file.filename,
        upload_time: new Date()

    }
    collec.insertOne(obj)
    .then((result)=>res.send(result))
    .catch((error)=>res.send(error));

});
app.get("/files", (req, res) => {
    const client = new MongoClient(url);
    client.connect()
    let username= req.query.username;
    let command= username? {username}: {};
  
        const db = client.db("instagram");
        const fileCollection = db.collection("files");
        
      
        return fileCollection.find(command).toArray()
      .then((files) => res.json(files))
      .catch((err) => {
        res.send(err);
      })
  });
  app.delete("/delete/:id",(req,res)=>
{
    let client = new MongoClient(url);
    client.connect();

    let db= client.db("instagram");
    let collec = db.collection("files");

    let id = req.params;
    let _id = new ObjectId(id);

    collec.findOne({_id})
    .then((obj)=>{
        fs.promises.unlink(`uploads/${obj.file_name}`);
        return collec.deleteOne({_id})
    })
    .then((result)=>res.send(result))
    .catch((error)=>res.send(error));
});

app.listen(3000,()=>{console.log("Express is Ready")})
