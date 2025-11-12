const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//mongodb connection
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gubl8vg.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
app.get("/", (req, res) => {
  res.send("Krishi server is running...");
});

async function run() {
  try {
    // await client.connect();

    const db = client.db("krishi");
    const usersCollection = db.collection("users");
    const cropsCollection = db.collection("crops");

    // add a crop
    app.post("/crops", async (req, res) => {
      const crop = req.body;
      console.log(crop);
      const result = await cropsCollection.insertOne(crop);
      res.send(result);
    });

    //send a interest form
    app.post("/interests", async (req, res) => {
      // console.log(req.body);
      const { crop, interestData } = req.body;
      console.log({ crop, interestData });
      try {
        const query = { _id: new ObjectId(crop._id) };
        const update = {
          $push: { interests: interestData },
        };

        // checking dupliacate interest send
        const existingCrop = await cropsCollection.findOne(query);
        const alreadyInterested = existingCrop.interests?.find(
          (i) => i.buyerEmail === interestData.buyerEmail
        );

        if (alreadyInterested) {
          return res.status(400).send({
            message: "you already sent an interest for this crop",
          });
        }

        const result = await cropsCollection.updateOne(query, update);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    //get crops
    app.get("/crops", async (req, res) => {
      const crops = await cropsCollection.find().toArray();
      res.send(crops);
    });

    //get a crops details
    app.get("/crops/:id", async (req, res) => {
      const { id } = req.params;
      const result = await cropsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // search a crop
    app.get("/search", async (req, res) => {
      const search_text = req.query.search;
      const result = await cropsCollection
        .find({
          name: { $regex: search_text, $options: "i" },
        })
        .toArray();
      res.send(result);
    });

    //latest 6 crops
    app.get("/latest-crops", async (req, res) => {
      const latestCrops = await cropsCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      res.send(latestCrops);
    });

    //my posts
    app.get("/my-posts", async (req, res) => {
      const email = req.query.email;
      const myPosts = await cropsCollection
        .find({ "owner.ownerEmail": email })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(myPosts);
    });

    //delete crop from my posts
    app.delete("/delete/:id", async (req, res) => {
      const { id } = req.params;
      const result = await cropsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    //edit my posts
    app.patch("/edit/:id", async (req, res) => {
      const { id } = req.params;
      const updatedCrops = req.body;
      console.log(updatedCrops);
      delete updatedCrops._id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await cropsCollection.updateOne(query, {
          $set: updatedCrops,
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
